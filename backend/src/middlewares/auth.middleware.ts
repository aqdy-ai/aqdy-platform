import { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  if (user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  next();
}
import { AppError } from "./errorHandler.js";
import { verifyAccessToken } from "../services/auth.service.js";
import { User, IUser } from "../models/user.model.js";

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new AppError(401, "Authentication token is required."));
    return;
  }

  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);

    if (!user || user.status !== "active") {
      throw new AppError(401, "Invalid or expired authentication token.");
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(401, "Invalid or expired authentication token."),
    );
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
