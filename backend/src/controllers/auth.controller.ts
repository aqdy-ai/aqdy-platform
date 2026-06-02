import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ApiResponse } from "../types/index.js";
import { AppError } from "../middlewares/errorHandler.js";
import { UserZodSchema } from "../models/user.model.js";
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshTokens,
} from "../services/auth.service.js";
import { AuthenticatedRequest } from "../types/auth.js";

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
        },
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
        },
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
