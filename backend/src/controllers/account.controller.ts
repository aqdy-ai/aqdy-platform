import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ApiResponse } from "../types/index.js";
import { AppError } from "../middlewares/errorHandler.js";
import {
  getProfile,
  updateProfile,
  deleteAccount,
} from "../services/account.service.js";
import { creditsService } from "../services/credits.service.js";
import { subscriptionService } from "../services/subscription.service.js";

const updateProfileSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  email: z.string().email().optional(),
  password: z
    .string()
    .min(8)
    .regex(
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#_-])[A-Za-z\d@$!%*?&#_-]/,
      "Password must include uppercase, lowercase, number, and special character",
    )
    .optional(),
  currentPassword: z.string().optional(),
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

interface AuthRequest extends Request {
  user: {
    _id: { toString(): string };
  };
}

export const getProfileHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError(401, "Authentication required.");
    }

    const profile = await getProfile(String(user._id));

    const response: ApiResponse<typeof profile> = {
      success: true,
      data: profile,
      message: "Profile retrieved successfully.",
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateProfileHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError(401, "Authentication required.");
    }
    console.log(req.body);

    const body = parseRequestBody(updateProfileSchema, req.body);
    const updatedUser = await updateProfile(String(user._id), body);

    const response: ApiResponse<{
      id: string;
      email: string;
      name: string;
      role: string;
      plan: string;
    }> = {
      success: true,
      data: {
        id: String(updatedUser._id),
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        plan: updatedUser.plan,
      },
      message: "Profile updated successfully.",
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteAccountHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError(401, "Authentication required.");
    }

    await deleteAccount(String(user._id));

    const response: ApiResponse<null> = {
      success: true,
      message: "Account deleted successfully.",
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getCreditsHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError(401, "Authentication required.");
    }

    const userId = String(user._id);
    const balance = await creditsService.ensureInitialPlanCredits(userId);
    const ledgerEntries = await creditsService.getLedgerEntries(userId, 20);

    // Resolve plan allowance so the frontend can render a meaningful progress bar
    let planAllowance = 0;
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (
      subscription &&
      subscription.planId &&
      typeof subscription.planId !== "string"
    ) {
      const plan = subscription.planId as unknown as {
        creditAllowance?: number;
      };
      planAllowance = plan.creditAllowance ?? 0;
    }

    const response: ApiResponse<{
      balance: number;
      planAllowance: number;
      ledger: typeof ledgerEntries;
    }> = {
      success: true,
      data: {
        balance,
        planAllowance,
        ledger: ledgerEntries,
      },
      message: "Credits retrieved successfully.",
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
