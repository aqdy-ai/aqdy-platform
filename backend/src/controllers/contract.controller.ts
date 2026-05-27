import { Request, Response, NextFunction } from "express";
import { contractService } from "../services/contract.service.js";
import { auditLogService } from "../services/auditLog.service.js";
import { ApiResponse } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../middlewares/errorHandler.js";

/**
 * POST /api/contracts/upload
 *
 * Saves the extracted contract text to MongoDB and creates an audit log entry.
 * Request body is pre-validated by the validate middleware using ContractZodSchema.
 */
export const getContract = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const contract = await contractService.getContractById(String(req.params.id));

    if (!contract) {
      throw new AppError(404, "Contract not found");
    }

    res.status(200).json(contract);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(500, `Failed to get contract: ${error instanceof Error ? error.message : "Unknown error"}`)
    );
  }
};
export const uploadContract = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { filename, language, text, userId, fileSize } = req.body;

    // Persist contract
    const contract = await contractService.saveContract({
      filename,
      language,
      text,
      userId,
      fileSize,
    });

    // Audit trail
    await auditLogService.logEvent({
      contractId: String(contract._id),
      userId,
      action: "CONTRACT_UPLOADED",
      metadata: {
        filename,
        language,
        fileSize,
      },
    });

    logger.info("Contract uploaded successfully", {
      contractId: contract._id,
      userId,
      filename,
    });

    const response: ApiResponse<{ contractId: string }> = {
      success: true,
      data: { contractId: String(contract._id) },
      message: "Contract uploaded successfully",
    };

    res.status(201).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Failed to upload contract: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
    );
  }
  
};
