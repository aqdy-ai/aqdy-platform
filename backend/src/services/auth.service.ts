import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AppError } from "../middlewares/errorHandler.js";
import { env } from "../config/env.js";
import { User, IUser } from "../models/user.model.js";
import { subscriptionService } from "./subscription.service.js";
import { logger } from "../utils/logger.js";
import {
  RegisterInput,
  LoginInput,
  TokenBundle,
  JwtPayload,
} from "../types/auth.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const generateAccessToken = (user: IUser): string => {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      role: user.role,
      plan: user.plan,
    },
    env.JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    },
  );
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError(401, "Invalid or expired authentication token");
  }
};

const createRefreshToken = (): string => crypto.randomBytes(48).toString("hex");

const storeRefreshToken = async (
  user: IUser,
  refreshToken: string,
): Promise<void> => {
  user.refreshToken = refreshToken;
  user.refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);
  await user.save();
};

export const issueTokens = async (user: IUser): Promise<TokenBundle> => {
  const token = generateAccessToken(user);
  const refreshToken = createRefreshToken();
  await storeRefreshToken(user, refreshToken);
  return { token, refreshToken };
};

export const registerUser = async (
  userData: RegisterInput,
): Promise<{ user: IUser; token: string; refreshToken: string }> => {
  const normalizedEmail = userData.email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError(409, "Email already in use.");
  }

  const user = new User({
    name: userData.name.trim(),
    email: normalizedEmail,
    role: "user",
    plan: "free",
    status: "active",
  });

  user.password = userData.password;
  await user.save();

  // ← ضيف الـ subscription هنا
  try {
    await subscriptionService.createFreeSubscription(String(user._id));
  } catch (error) {
    logger.warn(
      `Failed to create free subscription for user ${user._id}:`,
      error,
    );
  }

  const { token, refreshToken } = await issueTokens(user);
  return { user, token, refreshToken };
};

export const loginUser = async (
  credentials: LoginInput,
): Promise<{ user: IUser; token: string; refreshToken: string }> => {
  const normalizedEmail = credentials.email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+passwordHash +refreshToken +refreshTokenExpiresAt",
  );

  if (!user || user.status !== "active") {
    throw new AppError(401, "Invalid email or password.");
  }

  const isPasswordValid = await user.verifyPassword(credentials.password);

  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password.");
  }

  user.lastLogin = new Date();
  await user.save();

  const { token, refreshToken } = await issueTokens(user);
  return { user, token, refreshToken };
};

export const logoutUser = async (refreshToken: string): Promise<void> => {
  const user = await User.findOne({ refreshToken }).select(
    "+refreshToken +refreshTokenExpiresAt",
  );

  if (!user) {
    throw new AppError(401, "Invalid refresh token.");
  }

  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;
  await user.save();
};

export const refreshTokens = async (
  refreshToken: string,
): Promise<{ token: string; refreshToken: string }> => {
  const user = await User.findOne({ refreshToken }).select(
    "+refreshToken +refreshTokenExpiresAt",
  );

  if (
    !user ||
    user.status !== "active" ||
    !user.refreshTokenExpiresAt ||
    user.refreshTokenExpiresAt.getTime() < Date.now()
  ) {
    throw new AppError(401, "Refresh token is invalid or expired.");
  }

  const { token, refreshToken: newRefreshToken } = await issueTokens(user);
  return { token, refreshToken: newRefreshToken };
};
