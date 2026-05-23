import { Request, Response, NextFunction } from "express";
import { contractService } from "../services/contract.service.js";
import { auditLogService } from "../services/auditLog.service.js";
import { analysisService } from "../services/analysis.service.js";
import { ApiResponse } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../middlewares/errorHandler.js";

/**
 * POST /api/analysis/analyze
 *
 * Re-triggers the LLM extraction pipeline for a previously uploaded contract.
 * Useful for re-running analysis after changes or on-demand retries.
 * The heavy lifting is done by analysisService.triggerAnalysis().
 */
export const analyzeContract = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { contractId, userId } = req.body;

    // Verify the contract exists
    const contract = await contractService.getContractById(contractId);

    if (!contract) {
      throw new AppError(404, "Contract not found");
    }

    // Audit trail — mark analysis as started
    await auditLogService.logEvent({
      contractId: String(contract._id),
      userId,
      action: "ANALYSIS_STARTED",
      metadata: {
        filename: contract.filename,
        language: contract.language,
      },
    });

    logger.info("Contract analysis started", { contractId, userId });

    // Fire-and-forget — delegate all orchestration to the service layer
    analysisService
      .triggerAnalysis(
        String(contract._id),
        userId,
        contract.text,
        contract.language,
      )
      .catch((err) => {
        logger.error(
          `Error in background analysis for contract ${contract._id}:`,
          err,
        );
      });

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
    const { contractId } = req.params;

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
