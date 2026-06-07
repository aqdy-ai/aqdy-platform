import { Request, Response, NextFunction } from "express";
import { analysisService } from "../services/analysis.service.js";
import { contractService } from "../services/contract.service.js";
import { ApiResponse } from "../types/index.js";
import { AuthenticatedRequest } from "../types/auth.js";
import { AppError } from "../middlewares/errorHandler.js";

/**
 * GET /api/account/contracts/:contractId/analyses
 *
 * Returns all analysis versions for a specific contract,
 * sorted in descending version order (newest first).
 * Each item includes: version number, date, overall risk level, and diff summary.
 */
export const getAnalysisVersionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = String(authReq.user!._id);
    const contractId = String(req.params.contractId);

    // Verify contract exists and belongs to user
    const contract = await contractService.getContractById(contractId);
    if (!contract) {
      throw new AppError(404, "Contract not found.");
    }
    if (contract.userId !== userId) {
      throw new AppError(403, "Access denied. You do not own this contract.");
    }

    const versions =
      await analysisService.getAnalysisVersionsByContractId(contractId);

    const response: ApiResponse<typeof versions> = {
      success: true,
      data: versions,
      message: "Analysis versions retrieved successfully",
    };

    res.status(200).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Failed to get analysis versions: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
    );
  }
};

/**
 * GET /api/account/contracts/:contractId/analyses/:analysisId
 *
 * Returns the full detail of a specific analysis version, including
 * the diff summary against its previous version (if applicable).
 */
export const getAnalysisVersionDetailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = String(authReq.user!._id);
    const contractId = String(req.params.contractId);
    const analysisId = String(req.params.analysisId);

    // Verify contract exists and belongs to user
    const contract = await contractService.getContractById(contractId);
    if (!contract) {
      throw new AppError(404, "Contract not found.");
    }
    if (contract.userId !== userId) {
      throw new AppError(403, "Access denied. You do not own this contract.");
    }

    const analysis = await analysisService.getAnalysisById(analysisId);

    if (!analysis) {
      throw new AppError(404, "Analysis not found.");
    }

    // Ensure the analysis belongs to the requested contract
    if (String(analysis.contractId) !== contractId) {
      throw new AppError(
        404,
        "Analysis does not belong to the specified contract.",
      );
    }

    const response: ApiResponse<typeof analysis> = {
      success: true,
      data: analysis,
      message: "Analysis detail retrieved successfully",
    };

    res.status(200).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Failed to get analysis detail: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
    );
  }
};
