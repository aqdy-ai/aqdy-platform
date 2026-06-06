import { Request, Response, NextFunction } from 'express';
import { contractHistoryService, ContractListFilters, ContractListSort } from '../services/contractHistory.service.js';
import { AppError } from '../middlewares/errorHandler.js';
import { ApiResponse } from '../types/index.js';
import { AuthenticatedRequest } from '../types/auth.js';

// GET /api/account/contracts
export const getContractListHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = String(authReq.user!._id);

        // Pagination
        const page = parseInt(String(req.query.page ?? '1'));
        const limit = Math.min(parseInt(String(req.query.limit ?? '10')), 50);

        // Filters
        const filters: ContractListFilters = {};
        if (req.query.uploadedAfter) filters.uploadedAfter = new Date(String(req.query.uploadedAfter));
        if (req.query.uploadedBefore) filters.uploadedBefore = new Date(String(req.query.uploadedBefore));
        if (req.query.status) filters.status = req.query.status as 'analyzed' | 'pending' | 'failed';
        if (req.query.filename) filters.filename = String(req.query.filename);

        // Sort
        const sortField = (req.query.sortBy as string) ?? 'uploadedAt';
        const sortOrder = (req.query.sortOrder as string) ?? 'desc';
        const sort: ContractListSort = {
            field: ['uploadedAt', 'analyzedAt', 'riskLevel'].includes(sortField)
                ? sortField as ContractListSort['field']
                : 'uploadedAt',
            order: sortOrder === 'asc' ? 'asc' : 'desc',
        };

        const result = await contractHistoryService.getContractList(userId, {
            filters,
            sort,
            page,
            limit,
        });

        const response: ApiResponse<typeof result> = {
            success: true,
            data: result,
            message: 'Contract list retrieved successfully',
        };

        res.status(200).json(response);
    } catch (error) {
        next(
            error instanceof AppError
                ? error
                : new AppError(500, `Failed to get contract list: ${error instanceof Error ? error.message : 'Unknown error'}`),
        );
    }
};

// GET /api/account/contracts/:contractId
export const getContractDetailHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = String(authReq.user!._id);
        const contractId = String(req.params.contractId);

        const result = await contractHistoryService.getContractDetail(contractId, userId);

        if (!result) {
            throw new AppError(404, 'Contract not found.');
        }

        const response: ApiResponse<typeof result> = {
            success: true,
            data: result,
            message: 'Contract detail retrieved successfully',
        };

        res.status(200).json(response);
    } catch (error) {
        next(
            error instanceof AppError
                ? error
                : new AppError(500, `Failed to get contract detail: ${error instanceof Error ? error.message : 'Unknown error'}`),
        );
    }
};

// DELETE /api/account/contracts/:contractId
export const deleteContractHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = String(authReq.user!._id);
        const contractId = String(req.params.contractId);

        const deleted = await contractHistoryService.softDeleteContract(contractId, userId);

        if (!deleted) {
            throw new AppError(404, 'Contract not found or already deleted.');
        }

        const response: ApiResponse<null> = {
            success: true,
            data: null,
            message: 'Contract deleted successfully',
        };

        res.status(200).json(response);
    } catch (error) {
        next(
            error instanceof AppError
                ? error
                : new AppError(500, `Failed to delete contract: ${error instanceof Error ? error.message : 'Unknown error'}`),
        );
    }
};