import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env.js";
import { AppError } from "./errorHandler.js";
import { verifyAccessToken } from "../services/auth.service.js";
import { User } from "../models/user.model.js";
import { AuthenticatedRequest, JwtPayload } from "../types/auth.js";

export function verifyJWT(token: string): JwtPayload | null {
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
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let token = req.cookies?.accessToken;

    // Fallback to Authorization Bearer header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

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
    const token = req.cookies?.accessToken;
    if (token) {
      const decoded = verifyJWT(token);
      if (decoded) {
        req.user = {
          _id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          plan: decoded.plan,
        } as AuthenticatedRequest["user"];
      }
    }
  }

  if (!req.user) {
    next(new AppError(401, "Authentication required."));
    return;
  }

  if (req.user.role !== "admin") {
    next(new AppError(403, "Forbidden"));
    return;
  }

  next();
};

export const requireEmailVerified = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    next(new AppError(401, "Authentication required."));
    return;
  }

  if (!req.user.isEmailVerified && req.user.role !== "admin") {
    next(new AppError(403, "Email verification required."));
    return;
  }

  next();
};
