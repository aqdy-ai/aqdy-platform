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

const registerSchema = UserZodSchema;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
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

    const response: ApiResponse<{
      token: string;
      refreshToken: string;
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
        token,
        refreshToken,
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
          plan: user.plan,
        },
      },
      message: "Registration successful.",
    };

    res.status(201).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Registration failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          ),
    );
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

    const response: ApiResponse<{
      token: string;
      refreshToken: string;
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
        token,
        refreshToken,
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
          plan: user.plan,
        },
      },
      message: "Login successful.",
    };

    res.status(200).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Login failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          ),
    );
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = parseRequestBody(logoutSchema, req.body);
    await logoutUser(body.refreshToken);

    const response: ApiResponse<null> = {
      success: true,
      message: "Logout successful.",
    };

    res.status(200).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Logout failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          ),
    );
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = parseRequestBody(refreshSchema, req.body);
    const { token, refreshToken } = await refreshTokens(body.refreshToken);

    const response: ApiResponse<{ token: string; refreshToken: string }> = {
      success: true,
      data: { token, refreshToken },
      message: "Token refreshed successfully.",
    };

    res.status(200).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Token refresh failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          ),
    );
  }
};

export const me = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = (req as any).user;

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
