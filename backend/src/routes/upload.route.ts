import { Router, Request, Response } from "express";
import { upload, handleUploadError } from "../middlewares/upload.middleware.js";
import { pdfService } from "../services/pdf.service.js";
import { docxService } from "../services/docx.service.js";
import { contractService } from "../services/contract.service.js";
import { auditLogService } from "../services/auditLog.service.js";
import { logger } from "../utils/logger.js";

const uploadRouter = Router();

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

      // Parse based on file type
      let parsed;
      if (file.mimetype === "application/pdf") {
        parsed = await pdfService.parsePdf(file);
      } else {
        parsed = await docxService.parseDocx(file);
      }

      // Save to database
      const contract = await contractService.saveContract({
        filename: parsed.filename,
        language: parsed.language,
        text: parsed.text,
        userId: String(req.headers["x-user-id"] ?? "anonymous"),
        fileSize: parsed.fileSize,
      });

      // Log the event
      await auditLogService.logEvent({
        contractId: String(contract._id),
        userId: String(contract.userId),
        action: "CONTRACT_UPLOADED",
        metadata: {
          filename: parsed.filename,
          pages: parsed.pages,
          language: parsed.language,
        },
      });

      logger.info(`✅ Contract uploaded and saved: ${contract._id}`);

      return res.status(201).json({
        message: "Contract uploaded successfully",
        contractId: contract._id,
        filename: parsed.filename,
        language: parsed.language,
        pages: parsed.pages,
        fileSize: parsed.fileSize,
      });
    } catch (error: any) {
      logger.error("❌ Upload failed:", error);
      return res.status(500).json({ error: error.message });
    }
  },
);

// Get contract by ID
uploadRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const contract = await contractService.getContractById(
      String(req.params.id),
    );

    if (!contract) {
      return res.status(404).json({ error: "Contract not found." });
    }

    return res.status(200).json(contract);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default uploadRouter;
