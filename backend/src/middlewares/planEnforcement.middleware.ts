import { Request, Response, NextFunction } from "express";
import { Subscription } from "../models/subscription.model.js";
import { Plan } from "../models/plan.model.js";
import { RiskAnalysis } from "../models/riskAnalysis.model.js";
import { logger } from "../utils/logger.js";

const UPGRADE_URL = "https://aqdy.ai/pricing";

const FREE_PLAN_DEFAULTS = {
  analysisLimit: 5,
  storageLimit: 10,
  planName: "Free",
};

// جيب الـ subscription أو استخدم الـ Free defaults
async function getActivePlanLimits(userId: string): Promise<{
  analysisLimit: number;
  storageLimit: number;
  planName: string;
  startDate: Date;
}> {
  try {
    const subscription = await Subscription.findOne({
      userId,
      status: "active",
    }).populate("planId");

    // لو مفيش subscription أو expired → Free tier
    if (!subscription) {
      return {
        ...FREE_PLAN_DEFAULTS,
        startDate: new Date(new Date().setDate(1)), // أول الشهر
      };
    }

    // لو الـ subscription expired → Free tier
    if (new Date() > subscription.endDate) {
      return {
        ...FREE_PLAN_DEFAULTS,
        startDate: subscription.startDate,
      };
    }

    const plan = subscription.planId as any;

    return {
      analysisLimit: plan.analysisLimit ?? FREE_PLAN_DEFAULTS.analysisLimit,
      storageLimit: plan.storageLimit ?? FREE_PLAN_DEFAULTS.storageLimit,
      planName: plan.name ?? FREE_PLAN_DEFAULTS.planName,
      startDate: subscription.startDate,
    };
  } catch (error) {
    logger.error("planEnforcement: failed to get plan limits", error);
    return {
      ...FREE_PLAN_DEFAULTS,
      startDate: new Date(new Date().setDate(1)),
    };
  }
}

// Middleware: enforce analysis limit
export async function enforceAnalysisLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).user?._id?.toString();

    if (!userId) {
      next();
      return;
    }

    const { analysisLimit, planName, startDate } =
      await getActivePlanLimits(userId);

    // -1 means unlimited
    if (analysisLimit === -1) {
      next();
      return;
    }

    // limit = 0 → blocked immediately
    if (analysisLimit === 0) {
      res.status(403).json({
        success: false,
        error: "Analysis limit reached",
        details: {
          analysesUsed: 0,
          analysisLimit: 0,
          planName,
          upgradeUrl: UPGRADE_URL,
          message: `Your ${planName} plan does not include any analyses. Please upgrade to continue.`,
        },
      });
      return;
    }

    // عد الـ analyses في الـ billing period الحالية
    const analysesUsed = await RiskAnalysis.countDocuments({
      userId,
      createdAt: { $gte: startDate },
    });

    if (analysesUsed >= analysisLimit) {
      logger.warn(`planEnforcement: user ${userId} reached analysis limit`, {
        analysesUsed,
        analysisLimit,
        planName,
      });

      res.status(403).json({
        success: false,
        error: "Analysis limit reached",
        details: {
          analysesUsed,
          analysisLimit,
          planName,
          upgradeUrl: UPGRADE_URL,
          message: `You have used ${analysesUsed}/${analysisLimit} analyses this billing period. Upgrade your plan to continue.`,
        },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error("planEnforcement: unexpected error", error);
    next();
  }
}

// Middleware: enforce storage limit
export async function enforceStorageLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).user?._id?.toString();

    if (!userId) {
      next();
      return;
    }

    const { storageLimit, planName } = await getActivePlanLimits(userId);

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
