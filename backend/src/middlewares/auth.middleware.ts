import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env.js";

export function verifyJWT(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const jwtSecret = process.env.JWT_SECRET || env.JWT_SECRET;
    const hmac = crypto.createHmac("sha256", jwtSecret);
    hmac.update(`${headerB64}.${payloadB64}`);
    const expectedSignature = hmac.digest("base64url");

    if (signatureB64 !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    );
    return payload;
  } catch (err) {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = verifyJWT(token);
      if (decoded) {
        (req as any).user = decoded;
      }
    }
  }

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
