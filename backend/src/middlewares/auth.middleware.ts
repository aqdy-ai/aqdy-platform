import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env.js";

export function verifyJWT(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const hmac = crypto.createHmac("sha256", env.JWT_SECRET);
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
