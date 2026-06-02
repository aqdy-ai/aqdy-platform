import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";
import { verifyAccessToken } from "../services/auth.service.js";
import { User } from "../models/user.model.js";
import { AuthenticatedRequest } from "../types/auth.js";

export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      throw new AppError(401, "Authentication token is required.");
    }

    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub);

    if (!user || user.status !== "active") {
      throw new AppError(401, "Invalid or expired authentication token.");
    }

    (req as AuthenticatedRequest).user = user;

    next();
  } catch {
    next(new AppError(401, "Invalid or expired authentication token."));
  }
};

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    next(new AppError(401, "Authentication required."));
    return;
  }

  next();
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    next(new AppError(401, "Authentication required."));
    return;
  }

  if (req.user.role !== "admin") {
    next(new AppError(403, "Forbidden."));
    return;
  }

  next();
};
