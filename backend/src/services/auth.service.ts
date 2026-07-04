import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { AppError } from "../middlewares/errorHandler.js";
import { env } from "../config/env.js";
import { User, IUser } from "../models/user.model.js";
import { subscriptionService } from "./subscription.service.js";
import { creditsService } from "./credits.service.js";
import { logger } from "../utils/logger.js";
import { emailService } from "./email.service.js";
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

  const isTestEnv = process.env.NODE_ENV === "test";
  const verificationToken = crypto.randomBytes(32).toString("hex");

  const user = new User({
    name: userData.name.trim(),
    email: normalizedEmail,
    role: "user",
    plan: "free",
    status: "active",
    // In test env, auto-verify so existing test suites are not blocked
    isEmailVerified: isTestEnv ? true : false,
    emailVerificationToken: isTestEnv ? undefined : verificationToken,
    emailVerificationExpiresAt: isTestEnv
      ? undefined
      : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    emailVerificationSentAt: isTestEnv ? undefined : new Date(),
  });

  user.password = userData.password;
  await user.save();

  try {
    await emailService.sendVerificationEmail(
      user.email,
      user.name,
      verificationToken,
    );
  } catch (error) {
    logger.error(
      `Failed to send verification email during registration for ${user.email}:`,
      error,
    );
  }

  try {
    await subscriptionService.createFreeSubscription(String(user._id));
  } catch (error) {
    logger.warn(
      `Failed to create free subscription for user ${user._id}:`,
      error,
    );
  }

  try {
    await creditsService.topup(
      String(user._id),
      env.FREE_PLAN_CREDITS,
      "plan_topup",
    );
  } catch (error) {
    logger.warn(
      `Failed to initialize credit balance for user ${user._id}:`,
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

export const loginWithGoogle = async (
  idToken: string,
): Promise<{ user: IUser; token: string; refreshToken: string }> => {
  let googleId: string;
  let email: string;
  let name: string;

  if (env.NODE_ENV === "test") {
    // Mock token verification for integration tests
    if (idToken.startsWith("mock-google-token-")) {
      const suffix = idToken.replace("mock-google-token-", "");
      googleId = `mock-google-id-${suffix}`;
      email = `${suffix}@example.com`;
      name = `Mock Google User ${suffix}`;
    } else {
      throw new AppError(400, "Invalid mock Google token.");
    }
  } else {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError(
        500,
        "Google client ID is not configured on the server.",
      );
    }
    try {
      const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new AppError(
          401,
          "Google ID token validation failed or missing email/subject.",
        );
      }
      googleId = payload.sub;
      email = payload.email.toLowerCase().trim();
      name = payload.name || email.split("@")[0];
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Invalid token";
      throw new AppError(401, `Google authentication failed: ${errMsg}`);
    }
  }

  // 1. Check if user already exists by googleId
  let user = await User.findOne({ googleId });

  if (!user) {
    // 2. Check if user exists by email (to link accounts)
    user = await User.findOne({ email });

    if (user) {
      // Link the accounts
      user.googleId = googleId;
      user.isEmailVerified = true; // Google verifies emails automatically
      await user.save();
    } else {
      // 3. Register a new user via Google
      user = new User({
        name,
        email,
        googleId,
        isEmailVerified: true,
        role: "user",
        plan: "free",
        status: "active",
      });
      await user.save();

      // Free plan subscriptions & credits top-up (same as standard registration)
      try {
        await subscriptionService.createFreeSubscription(String(user._id));
      } catch (error) {
        logger.warn(
          `Failed to create free subscription for Google-registered user ${user._id}:`,
          error,
        );
      }

      try {
        await creditsService.topup(
          String(user._id),
          env.FREE_PLAN_CREDITS,
          "plan_topup",
        );
      } catch (error) {
        logger.warn(
          `Failed to initialize credit balance for Google-registered user ${user._id}:`,
          error,
        );
      }
    }
  }

  user.lastLogin = new Date();
  await user.save();

  const { token, refreshToken } = await issueTokens(user);
  return { user, token, refreshToken };
};
