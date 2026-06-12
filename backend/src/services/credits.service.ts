import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AppError } from "../middlewares/errorHandler.js";
import { subscriptionService } from "./subscription.service.js";
import {
  CreditLedger,
  ICreditLedger,
  CreditLedgerReason,
} from "../models/creditLedger.model.js";
import { User } from "../models/user.model.js";

export class InsufficientCreditsError extends AppError {
  constructor(message = "Insufficient credits available.") {
    super(402, message);
    Object.setPrototypeOf(this, InsufficientCreditsError.prototype);
  }
}

const DEDUCTION_REASONS: CreditLedgerReason[] = [
  "analysis_deduction",
  "chat_deduction",
  "manual_adjustment",
];

const TOPUP_REASONS: CreditLedgerReason[] = [
  "plan_topup",
  "manual_adjustment",
  "refund",
];

export interface CreditMetadata {
  tokensUsed?: number;
  hostingCost?: number;
  contractId?: string;
  reason?: CreditLedgerReason;
}

export class CreditsService {
  // ── Weighted-token formula (new) ─────────────────────────────────────
  /**
   * Full analysis cost:
   *   BASE_FEE + ceil((inputTokens×1 + outputTokens×OUTPUT_WEIGHT) / TOKEN_UNIT)
   *
   * Designed so a typical 15-clause contract (~83k input, ~23.5k output) costs
   * ~55 credits with the default env values (BASE_FEE=10, OUTPUT_WEIGHT=4,
   * TOKEN_UNIT=4000).
   */
  calculateAnalysisCost(inputTokens: number, outputTokens: number): number {
    const weighted =
      inputTokens * 1 + outputTokens * env.CREDIT_OUTPUT_WEIGHT;
    const variable = Math.ceil(weighted / env.CREDIT_TOKEN_UNIT);
    return env.CREDIT_BASE_FEE + variable;
  }

  /**
   * Clause-chat message cost (single LLM call, focused context):
   *   CHAT_BASE + ceil((inputTokens + outputTokens×OUTPUT_WEIGHT) / TOKEN_UNIT)
   *
   * A typical chat exchange (~3k input, ~1k output) costs ~4–5 credits.
   */
  calculateChatCost(inputTokens: number, outputTokens: number): number {
    const weighted =
      inputTokens * 1 + outputTokens * env.CREDIT_OUTPUT_WEIGHT;
    const variable = Math.ceil(weighted / env.CREDIT_TOKEN_UNIT);
    return env.CREDIT_CHAT_BASE + variable;
  }

  /**
   * Legacy shim — accepts a combined token count and applies a 70/30
   * input/output split before delegating to calculateAnalysisCost().
   * Used by pre-flight middleware that only has a rough token estimate.
   */
  estimateCost(combinedTokens: number): number {
    if (combinedTokens < 0) {
      throw new AppError(400, "tokensUsed must be non-negative.");
    }
    const inputTokens = Math.round(combinedTokens * 0.7);
    const outputTokens = Math.round(combinedTokens * 0.3);
    return this.calculateAnalysisCost(inputTokens, outputTokens);
  }

  async getBalance(userId: string): Promise<number> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(userObjectId).select("creditBalance");

    if (user && typeof user.creditBalance === "number") {
      return user.creditBalance;
    }

    return await this.getCurrentPlanAllowance(userId);
  }

  async getLedgerEntries(userId: string, limit = 20): Promise<ICreditLedger[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return CreditLedger.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async topup(
    userId: string,
    amount: number,
    reason: CreditLedgerReason,
  ): Promise<ICreditLedger> {
    if (amount <= 0) {
      throw new AppError(400, "Topup amount must be greater than zero.");
    }

    if (!TOPUP_REASONS.includes(reason)) {
      throw new AppError(400, `Invalid topup reason: ${reason}`);
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const updatedUser = await User.findByIdAndUpdate(
      userObjectId,
      { $inc: { creditBalance: amount } },
      { returnDocument: "after", upsert: false },
    );

    if (!updatedUser) {
      throw new AppError(404, "User not found.");
    }

    const ledgerEntry = new CreditLedger({
      userId: userObjectId,
      delta: amount,
      balanceAfter: updatedUser.creditBalance,
      reason,
      metadata: {},
    });

    await ledgerEntry.save();
    return ledgerEntry;
  }

  async topupForPlanAllowance(userId: string): Promise<ICreditLedger | null> {
    const subscription = await subscriptionService.getUserSubscription(userId);

    if (
      !subscription ||
      !subscription.planId ||
      typeof subscription.planId === "string"
    ) {
      return null;
    }

    const plan = subscription.planId as unknown as { creditAllowance?: number };
    const amount = plan.creditAllowance ?? 0;

    if (amount <= 0) {
      return null;
    }

    return await this.topup(userId, amount, "plan_topup");
  }

  async deduct(
    userId: string,
    cost: number,
    metadata: CreditMetadata = {},
  ): Promise<ICreditLedger> {
    if (cost <= 0) {
      throw new AppError(400, "Deduction cost must be greater than zero.");
    }

    const reason = metadata.reason ?? "analysis_deduction";
    if (!DEDUCTION_REASONS.includes(reason)) {
      throw new AppError(400, `Invalid deduction reason: ${reason}`);
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Atomic: only succeeds if creditBalance >= cost (enforces zero-credit gate)
    const updatedUser = await User.findOneAndUpdate(
      { _id: userObjectId, creditBalance: { $gte: cost } },
      { $inc: { creditBalance: -cost } },
      { returnDocument: "after" },
    );

    if (!updatedUser) {
      throw new InsufficientCreditsError();
    }

    const ledgerEntry = new CreditLedger({
      userId: userObjectId,
      delta: -cost,
      balanceAfter: updatedUser.creditBalance,
      reason,
      metadata: {
        tokensUsed: metadata.tokensUsed,
        hostingCost: metadata.hostingCost,
        contractId: metadata.contractId,
      },
    });

    try {
      await ledgerEntry.save();
    } catch (error) {
      await User.findByIdAndUpdate(userObjectId, {
        $inc: { creditBalance: cost },
      });
      throw error;
    }

    return ledgerEntry;
  }

  private async getCurrentPlanAllowance(userId: string): Promise<number> {
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (
      !subscription ||
      !subscription.planId ||
      typeof subscription.planId === "string"
    ) {
      return 0;
    }

    const plan = subscription.planId as unknown as { creditAllowance?: number };
    return plan.creditAllowance ?? 0;
  }
}

export const creditsService = new CreditsService();
