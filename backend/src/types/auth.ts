import { Request } from "express";
import { IUser } from "../models/user.model.js";
import type { UserRole } from "../config/roles.js";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenBundle {
  token: string;
  refreshToken: string;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  requestId?: string;
  langfuseTraceId?: string;
  /** Estimated credit cost attached by creditsEnforcement.middleware before analysis */
  estimatedCreditCost?: number;
  /** Estimated token count attached by creditsEnforcement.middleware before analysis */
  estimatedTokens?: number;
}
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  plan: string;
  iat?: number;
  exp?: number;
}
