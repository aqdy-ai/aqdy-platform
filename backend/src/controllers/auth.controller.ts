import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ApiResponse } from "../types/index.js";
import { AppError } from "../middlewares/errorHandler.js";
import { User, UserZodSchema } from "../models/user.model.js";
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshTokens,
} from "../services/auth.service.js";
import { AuthenticatedRequest } from "../types/auth.js";
import { emailService } from "../services/email.service.js";

const registerSchema = UserZodSchema;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const parseRequestBody = <T>(schema: z.ZodSchema<T>, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new AppError(400, `Validation failed: ${message}`);
  }
  return result.data;
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = parseRequestBody(registerSchema, req.body);

    const { user, token, refreshToken } = await registerUser(body);

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
          plan: user.plan,
          isEmailVerified: user.isEmailVerified,
        },
        token,
      },
      message: "Registration successful.",
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = parseRequestBody(loginSchema, req.body);

    const { user, token, refreshToken } = await loginUser(body);

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
          plan: user.plan,
          isEmailVerified: user.isEmailVerified,
        },
        token,
      },
      message: "Login successful.",
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await logoutUser(refreshToken);
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new AppError(401, "Refresh token is required.");
    }

    const tokens = await refreshTokens(refreshToken);

    res.cookie("accessToken", tokens.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Token refreshed.",
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      throw new AppError(401, "Authentication required.");
    }

    const response: ApiResponse<{
      user: {
        id: string;
        email: string;
        name: string;
        role: string;
        plan: string;
        isEmailVerified: boolean;
      };
    }> = {
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
          plan: user.plan,
          isEmailVerified: user.isEmailVerified,
        },
      },
      message: "Authenticated user information.",
    };

    res.status(200).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Failed to load user information: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          ),
    );
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      throw new AppError(400, "Verification token is required.");
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError(400, "Verification token is invalid or has expired.");
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verification successful.",
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError(401, "Authentication required.");
    }

    if (user.isEmailVerified) {
      throw new AppError(400, "Email is already verified.");
    }

    const cooldownMs = 60000;
    if (
      user.emailVerificationSentAt &&
      Date.now() - user.emailVerificationSentAt.getTime() < cooldownMs
    ) {
      const remainingSecs = Math.ceil(
        (cooldownMs - (Date.now() - user.emailVerificationSentAt.getTime())) /
          1000,
      );
      throw new AppError(
        429,
        `Please wait ${remainingSecs} seconds before requesting a new verification link.`,
      );
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ); // 24 hours
    user.emailVerificationSentAt = new Date();
    await user.save();

    await emailService.sendVerificationEmail(
      user.email,
      user.name,
      verificationToken,
    );

    res.status(200).json({
      success: true,
      message: "Verification email resent successfully.",
    });
  } catch (error) {
    next(error);
  }
};
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const schema = z.object({
      email: z.string().email(),
    });
    const { email } = schema.parse(req.body);

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.passwordResetToken = token;
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();
      // Email sending is out of scope per requirements.
    }
    // Always respond with generic message to prevent enumeration.
    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const schema = z.object({
      token: z.string(),
      newPassword: z
        .string()
        .min(8)
        .regex(
          /(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]/,
          "Password must include uppercase, lowercase, number, and special character",
        ),
    });
    const { token, newPassword } = schema.parse(req.body);

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiresAt: { $gt: new Date() },
    });
    if (!user) {
      throw new AppError(400, "Invalid or expired password reset token.");
    }
    // Set new password via virtual field
    user.password = newPassword;
    // Invalidate password reset token and refresh tokens
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    user.refreshToken = undefined;
    user.refreshTokenExpiresAt = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("RESET_PASSWORD_ERROR:", error);
    next(error);
  }
};
