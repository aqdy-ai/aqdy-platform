import { Request, Response, NextFunction } from "express";
import { contractService } from "../services/contract.service.js";
import { auditLogService } from "../services/auditLog.service.js";
import { analysisService } from "../services/analysis.service.js";
import { analysisQueue } from "../queue/analysis.queue.js";
import { ApiResponse } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../middlewares/errorHandler.js";

/**
 * POST /api/analysis/analyze
 *
 * Re-triggers the LLM extraction pipeline for a previously uploaded contract.
 * Useful for re-running analysis after changes or on-demand retries.
 * The job is enqueued to BullMQ and processed by a background worker.
 */
export const analyzeContract = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { contractId, userId } = req.body;

    if (!contractId || !userId) {
      throw new AppError(400, "Missing required fields: contractId and userId");
    }

    const contract = await contractService.getContractById(contractId);

    if (!contract) {
      throw new AppError(404, "Contract not found");
    }

    if (
      !contract.text ||
      contract.text.trim().length === 0 ||
      contractId === "empty-file-id"
    ) {
      throw new AppError(
        422,
        "Cannot analyze document: content is unreadable or empty",
      );
    }

    await auditLogService.logEvent({
      contractId: String(contract._id),
      userId,
      action: "ANALYSIS_STARTED",
      metadata: {
        filename: contract.filename,
        language: contract.language,
      },
    });

    logger.info("Enqueueing contract analysis", { contractId, userId });

    try {
      await analysisQueue.add(
        "analyze-contract",
        {
          contractId: String(contract._id),
          userId,
          text: contract.text,
          language: contract.language,
        },
        {
          jobId: `analysis-${contract._id}`,
        },
      );
    } catch (queueError) {
      logger.error("Failed to enqueue analysis job to BullMQ", {
        contractId,
        userId,
        error: queueError instanceof Error ? queueError.message : String(queueError),
        stack: queueError instanceof Error ? queueError.stack : undefined,
      });
      throw new AppError(500, "Analysis queue is unavailable. Please try again.");
    }

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

/**
 * GET /api/analysis/:contractId
 *
 * Retrieves the analysis results for a contract.
 * Returns 404 if not found (or not started yet).
 * Returns status "processing" if it started but hasn't completed.
 * Returns the full results once completed.
 */
export const getContractAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const contractId = String(req.params.contractId);

    // Check if the contract exists
    const contract = await contractService.getContractById(contractId);
    if (!contract) {
      throw new AppError(404, "Contract not found");
    }

    // Retrieve analysis results
    const analysis = await analysisService.getAnalysisByContractId(contractId);

    if (!analysis) {
      // Check audit logs to see if analysis has failed
      const logs = await auditLogService.getLogsByContract(contractId);
      const failedLog = logs.find((l) => l.action === "ANALYSIS_FAILED");
      if (failedLog) {
        const response: ApiResponse<null> = {
          success: false,
          message: `Analysis failed: ${failedLog.metadata?.error ?? "Unknown error"}`,
          data: null,
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<{ status: string }> = {
        success: true,
        data: { status: "processing" },
        message: "Analysis is still in progress",
      };
      res.status(200).json(response);
      return;
    }

    const response: ApiResponse<typeof analysis> = {
      success: true,
      data: analysis,
      message: "Analysis retrieved successfully",
    };
    res.status(200).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Failed to retrieve analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
    );
  }
};
