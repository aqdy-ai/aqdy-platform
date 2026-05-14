import { Request, Response, NextFunction } from "express";
import { Contract } from "../models/contract.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { ApiResponse } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../middlewares/errorHandler.js";

/**
 * POST /api/analysis/analyze
 *
 * Kicks off contract analysis.  Currently records the audit log and returns
 * 202 Accepted — the actual LLM pipeline will be wired in Week 2 when the
 * agents (extraction → risk classification → redlining) are built.
 */
export const analyzeContract = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { contractId, userId } = req.body;

    // Verify the contract exists
    const contract = await Contract.findById(contractId);

    if (!contract) {
      throw new AppError(404, "Contract not found");
    }

    // Audit trail — mark analysis as started
    await AuditLog.create({
      contractId: contract._id,
      userId,
      action: "ANALYSIS_STARTED",
      metadata: {
        filename: contract.filename,
        language: contract.language,
      },
    });

    logger.info("Contract analysis started", {
      contractId,
      userId,
    });

    // TODO: Wire LLM analysis pipeline (Week 2)
    // 1. Extraction agent → extract clauses
    // 2. Risk classification agent → classify each clause
    // 3. Redlining agent → suggest safer alternatives

    const response: ApiResponse<{ contractId: string; status: string }> = {
      success: true,
      data: {
        contractId,
        status: "processing",
      },
      message: "Analysis started — results will be available shortly",
    };

    res.status(202).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Failed to start analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
    );
  }
};
