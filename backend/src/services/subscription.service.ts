import mongoose from "mongoose";
import { Subscription, ISubscription } from "../models/subscription.model.js";
import { Plan, IPlan } from "../models/plan.model.js";
import { RiskAnalysis } from "../models/riskAnalysis.model.js";

import { logger } from "../utils/logger.js";

export class SubscriptionService {
  // جيب الـ Free plan
  async getFreePlan(): Promise<IPlan | null> {
    return await Plan.findOne({ slug: "free", isActive: true });
  }

  // عمل Free subscription للـ user الجديد
  async createFreeSubscription(userId: string): Promise<ISubscription> {
    const freePlan = await this.getFreePlan();

    if (!freePlan) {
      throw new Error("Free plan not found. Please seed the database.");
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = new Subscription({
      userId: new mongoose.Types.ObjectId(userId),
      planId: freePlan._id,
      status: "active",
      startDate: now,
      endDate,
      renewalDate: endDate,
    });

    await subscription.save();
    logger.info(`✅ Free subscription created for user: ${userId}`);
    return subscription;
  }

  // جيب الـ subscription بتاعت الـ user
  async getUserSubscription(userId: string): Promise<ISubscription | null> {
    return await Subscription.findOne({ userId, status: "active" })
      .populate("planId")
      .sort({ createdAt: -1 });
  }

  // جيب عدد الـ analyses اللي الـ user عملها في الـ period الحالية
  async getUsageStats(userId: string, startDate: Date): Promise<number> {
    return await RiskAnalysis.countDocuments({
      userId,
      createdAt: { $gte: startDate },
    });
  }

  // Upgrade الـ subscription
  async upgradeSubscription(
    userId: string,
    newPlanId: string,
  ): Promise<ISubscription> {
    const subscription = await Subscription.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: "active",
    }).populate("planId");

    if (!subscription) {
      throw new Error("No active subscription found.");
    }

    const newPlan = await Plan.findById(newPlanId);

    if (!newPlan) {
      throw new Error("Plan not found.");
    }
    const now = new Date();
    const newEndDate = new Date(now);
    newEndDate.setMonth(newEndDate.getMonth() + 1);

    subscription.planId = new mongoose.Types.ObjectId(newPlanId);
    subscription.status = "active";
    subscription.startDate = now;
    subscription.endDate = newEndDate;
    subscription.renewalDate = newEndDate;
    subscription.cancelledAt = undefined;

    await subscription.save();
    logger.info(
      `✅ Subscription upgraded for user: ${userId} to plan: ${newPlan.name}`,
    );
    return subscription;
  }

  // Cancel الـ subscription
  async cancelSubscription(userId: string): Promise<ISubscription> {
    const subscription = await Subscription.findOne({
      userId,
      status: "active",
    });

    if (!subscription) {
      throw new Error("No active subscription found.");
    }

    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();

    await subscription.save();
    logger.info(`✅ Subscription cancelled for user: ${userId}`);
    return subscription;
  }
}

export const subscriptionService = new SubscriptionService();
