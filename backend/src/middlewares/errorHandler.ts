import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types/index.js";
import { logger } from "../utils/logger.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const errWithStatus = err as { statusCode?: number };
  const isAppError = err instanceof AppError || (err && typeof errWithStatus.statusCode === "number");
  if (isAppError && errWithStatus.statusCode !== undefined) {
    const response: ApiResponse<null> = {
      success: false,
      error: err.message,
    };
    res.status(errWithStatus.statusCode).json(response);
    return;
  }

  console.error("DEBUG: Unhandled error in errorHandler:", err);
  logger.error("Unhandled error", { error: err.message, stack: err.stack });

  const response: ApiResponse<null> = {
    success: false,
    error: "Internal server error",
  };
  res.status(500).json(response);
};
