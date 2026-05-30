import { Router, Request, Response } from "express";
import { upload, handleUploadError } from "../middlewares/upload.middleware.js";
import { anonymousIpRateLimit } from "../middlewares/rateLimit.js";
import { pdfService } from "../services/pdf.service.js";
import { docxService } from "../services/docx.service.js";
import { contractService } from "../services/contract.service.js";
import { auditLogService } from "../services/auditLog.service.js";
import { analysisService } from "../services/analysis.service.js";
import { logger } from "../utils/logger.js";
import {
  detectPromptInjection,
  sanitizeText,
} from "../middlewares/security.middleware.js";

const uploadRouter = Router();
uploadRouter.use(anonymousIpRateLimit());

/**
 * POST /api/upload/
 *
 * Full contract ingestion pipeline (single HTTP request):
 *   1. Accept PDF or DOCX file via multipart/form-data
 *   2. Parse the file → extract raw text + metadata
 *   3. Persist the contract text to the Contract collection
 *   4. Fire-and-forget: trigger the LLM extraction pipeline in the background
 *   5. Respond 202 immediately so the client can poll GET /api/analysis/:id
 *
 * Headers:
 *   x-user-id  — the authenticated user's ID (defaults to "anonymous")
 *
 * Form fields:
 *   contract   — the PDF or DOCX file
 */
uploadRouter.post(
  "/",
  upload.single("contract"),
  handleUploadError,
  async (req: Request, res: Response) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      const userId = String(req.headers["x-user-id"] ?? "anonymous");

      // ── Step 1: Parse the file ───────────────────────────────────────────
      let parsed;
      if (file.mimetype === "application/pdf") {
        parsed = await pdfService.parsePdf(file);
      } else {
        parsed = await docxService.parseDocx(file);
      }

      // ── Security Check & Sanitization ────────────────────────────────────
      if (detectPromptInjection(parsed.text)) {
        logger.warn(
          `🛑 Security: Prompt Injection detected inside uploaded file: ${file.originalname}`,
        );
        return res.status(400).json({
          error: "Security validation failed",
          message:
            "Suspicious instruction patterns detected in document text. Upload rejected.",
        });
      }

      // Sanitize standard XSS / HTML tags
      parsed.text = sanitizeText(parsed.text);

      // ── Step 2: Persist contract to DB ───────────────────────────────────
      const contract = await contractService.saveContract({
        filename: parsed.filename,
        language: parsed.language,
        text: parsed.text,
        userId,
        fileSize: parsed.fileSize,
      });

      const contractId = String(contract._id);

      // ── Step 3: Audit — CONTRACT_UPLOADED ────────────────────────────────
      await auditLogService.logEvent({
        contractId,
        userId,
        action: "CONTRACT_UPLOADED",
        metadata: {
          filename: parsed.filename,
          pages: parsed.pages,
          language: parsed.language,
        },
      });

      // ── Step 4: Audit — ANALYSIS_STARTED ─────────────────────────────────
      await auditLogService.logEvent({
        contractId,
        userId,
        action: "ANALYSIS_STARTED",
        metadata: {
          filename: parsed.filename,
          language: parsed.language,
        },
      });

      // ── Step 5: Fire-and-forget extraction pipeline ───────────────────────
      // analysisService.triggerAnalysis() handles:
      //   - ExtractorAgent.extract() via LLM
      //   - Persisting results to RiskAnalysis collection
      //   - Writing ANALYSIS_COMPLETED / ANALYSIS_FAILED audit entries
      analysisService
        .triggerAnalysis(contractId, userId, parsed.text, parsed.language)
        .catch((err) => {
          logger.error(
            `❌ Background analysis failed for contract ${contractId}:`,
            err,
          );
        });

      logger.info(`✅ Contract uploaded and analysis triggered: ${contractId}`);

      // ── Step 6: Respond immediately (202 Accepted) ────────────────────────
      return res.status(202).json({
        message:
          "Contract uploaded successfully. Analysis is running in the background.",
        contractId,
        filename: parsed.filename,
        language: parsed.language,
        pages: parsed.pages,
        fileSize: parsed.fileSize,
        status: "processing",
      });
    } catch (error: unknown) {
      logger.error("❌ Upload failed:", {
        message: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * GET /api/upload/:id
 * Retrieve a saved contract by its MongoDB ObjectId.
 */
uploadRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const contract = await contractService.getContractById(
      String(req.params.id),
    );

    if (!contract) {
      return res.status(404).json({ error: "Contract not found." });
    }

    return res.status(200).json(contract);
  } catch (error: unknown) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default uploadRouter;
