import { Request, Response, NextFunction } from "express";
import { Subscription } from "../models/subscription.model.js";
import { IPlan } from "../models/plan.model.js";
import { logger } from "../utils/logger.js";
import { AuthenticatedRequest } from "../types/auth.js";

const UPGRADE_URL = "https://aqdy.ai/pricing";

const FREE_PLAN_DEFAULTS = {
  storageLimit: 10,
  planName: "Free",
};

/**
 * Returns the storage limit and plan name for the given user.
 * Falls back to free-tier defaults when no active subscription is found.
 *
 * NOTE: Analysis-count enforcement has been replaced by credits-based
 * enforcement — see middlewares/creditsEnforcement.middleware.ts.
 */
async function getStoragePlanLimits(userId: string): Promise<{
  storageLimit: number;
  planName: string;
}> {
  try {
    const subscription = await Subscription.findOne({
      userId,
      status: "active",
    }).populate("planId");

    if (!subscription || new Date() > subscription.endDate) {
      return FREE_PLAN_DEFAULTS;
    }

    const plan = subscription.planId as unknown as IPlan;

    return {
      storageLimit: plan.storageLimit ?? FREE_PLAN_DEFAULTS.storageLimit,
      planName: plan.name ?? FREE_PLAN_DEFAULTS.planName,
    };
  } catch (error) {
    logger.error("planEnforcement: failed to get storage plan limits", error);
    return FREE_PLAN_DEFAULTS;
  }
}

/**
 * Middleware: enforce contract storage limit.
 *
 * Blocks uploads when the user has reached the maximum number of stored
 * contracts allowed by their active plan. Returns HTTP 403 with upgrade info.
 */
export async function enforceStorageLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (
      req as unknown as AuthenticatedRequest
    ).user?._id?.toString();

    if (!userId) {
      next();
      return;
    }

    const { storageLimit, planName } = await getStoragePlanLimits(userId);

    // -1 means unlimited
    if (storageLimit === -1) {
      next();
      return;
    }

    // عد الـ contracts الموجودة
    const { Contract } = await import("../models/contract.model.js");
    const contractsCount = await Contract.countDocuments({ userId });

    if (contractsCount >= storageLimit) {
      logger.warn(`planEnforcement: user ${userId} reached storage limit`, {
        contractsCount,
        storageLimit,
        planName,
      });

      res.status(403).json({
        success: false,
        error: "Storage limit reached",
        details: {
          contractsUsed: contractsCount,
          storageLimit,
          planName,
          upgradeUrl: UPGRADE_URL,
          message: `You have reached your storage limit of ${storageLimit} contracts on the ${planName} plan. Please upgrade to store more contracts.`,
        },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error("planEnforcement: unexpected error in storage check", error);
    next();
  }
}
