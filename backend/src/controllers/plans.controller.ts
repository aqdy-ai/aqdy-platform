import { Request, Response, NextFunction } from "express";
import { Plan } from "../models/plan.model.js";
import { ApiResponse } from "../types/index.js";
import { AppError } from "../middlewares/errorHandler.js";

/**
 * GET /api/plans
 *
 * Public endpoint returning all active plans.
 */
export const getActivePlans = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 });

    const response: ApiResponse<typeof plans> = {
      success: true,
      data: plans,
      message: "Active plans retrieved successfully",
    };

    res.status(200).json(response);
  } catch (error) {
    next(
      new AppError(
        500,
        `Failed to retrieve plans: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
  }
};


/**
 * GET /api/plans/:slug
 *
 * Public endpoint returning details for a specific plan by its slug.
 */
export const getPlanBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { slug } = req.params;
    const plan = await Plan.findOne({ slug });

    if (!plan) {
      throw new AppError(404, `Plan not found with slug: ${slug}`);
    }

    const response: ApiResponse<typeof plan> = {
      success: true,
      data: plan,
      message: "Plan details retrieved successfully",
    };

    res.status(200).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Failed to retrieve plan: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
    );
  }
};
