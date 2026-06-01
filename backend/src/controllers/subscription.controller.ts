import { Request, Response, NextFunction } from "express";
import { subscriptionService } from "../services/subscription.service.js";
import { AppError } from "../middlewares/errorHandler.js";
import { ApiResponse } from "../types/index.js";
import { logger } from "../utils/logger.js";

// GET /api/account/subscription
export const getSubscriptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user._id.toString();

    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription) {
      throw new AppError(404, "No active subscription found.");
    }

    const usageCount = await subscriptionService.getUsageStats(
      userId,
      subscription.startDate,
    );

    const response: ApiResponse<object> = {
      success: true,
      data: {
        subscription,
        usage: {
          analysesUsed: usageCount,
          analysesLimit: (subscription.planId as any).analysisLimit,
          periodStart: subscription.startDate,
          periodEnd: subscription.endDate,
          renewalDate: subscription.renewalDate,
        },
      },
      message: "Subscription retrieved successfully",
    };

    res.status(200).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Failed to get subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
    );
  }
};

// POST /api/account/subscription/upgrade
export const upgradeSubscriptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user._id.toString();
    const { planId } = req.body;

    if (!planId) {
      throw new AppError(400, "planId is required.");
    }

    const subscription = await subscriptionService.upgradeSubscription(
      userId,
      planId,
    );

    logger.info("Subscription upgraded", { userId, planId });

    const response: ApiResponse<object> = {
      success: true,
      data: { subscription },
      message: "Subscription upgraded successfully",
    };

    res.status(200).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Failed to upgrade subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
    );
  }
};

// POST /api/account/subscription/cancel
export const cancelSubscriptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user._id.toString();

    const subscription = await subscriptionService.cancelSubscription(userId);

    logger.info("Subscription cancelled", { userId });

    const response: ApiResponse<object> = {
      success: true,
      data: {
        subscription,
        message:
          "Your subscription will remain active until the end of the current billing period.",
      },
      message: "Subscription cancelled successfully",
    };

    res.status(200).json(response);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Failed to cancel subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
    );
  }
};
