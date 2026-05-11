import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types";
import { logger } from "../utils/logger";

export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public isOperational = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (err instanceof AppError) {
        const response: ApiResponse<null> = {
            success: false,
            error: err.message,
        };
        res.status(err.statusCode).json(response);
        return;
    }

    logger.error("Unhandled error", { error: err.message, stack: err.stack });

    const response: ApiResponse<null> = {
        success: false,
        error: "Internal server error",
    };
    res.status(500).json(response);
};