import { Request, Response, NextFunction } from 'express';
import { Contract } from '../models/contract.model.js';
import { AppError } from './errorHandler.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';

export async function verifyContractOwnership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?._id?.toString();
    const contractId = authReq.body?.contractId || authReq.params?.contractId;

    if (!userId || !contractId) {
      return next(new AppError(400, 'contractId and userId are required.'));
    }

    const contract = await Contract.findById(contractId);

    if (!contract) {
      return next(new AppError(404, 'Contract not found.'));
    }

    if (contract.userId !== userId) {
      logger.warn(`Ownership violation: user ${userId} tried to access contract ${contractId} owned by ${contract.userId}`);
      return next(new AppError(403, 'Access denied. You do not own this contract.'));
    }

    next();
  } catch (error) {
    next(new AppError(500, `Ownership check failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}