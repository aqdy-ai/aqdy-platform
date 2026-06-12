import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";
import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import accountRouter from "../src/routes/account.route.js";
import { User } from "../src/models/user.model.js";
import { Plan } from "../src/models/plan.model.js";
import { Subscription } from "../src/models/subscription.model.js";
import { CreditLedger } from "../src/models/creditLedger.model.js";
import { creditsService, InsufficientCreditsError } from "../src/services/credits.service.js";
import { env } from "../src/config/env.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";

jest.setTimeout(120000);
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/account", accountRouter);
app.use(errorHandler);

function signToken(payload: any): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "1h" });
}

describe("Credits domain and account credits endpoint", () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/aqdy-credits-test";
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Plan.deleteMany({}),
      Subscription.deleteMany({}),
      CreditLedger.deleteMany({}),
    ]);
  });

  test("estimateCost applies weighted analysis cost formula", () => {
    const combinedTokens = 100;
    const inputTokens = Math.round(combinedTokens * 0.7);
    const outputTokens = Math.round(combinedTokens * 0.3);
    const expected = creditsService.calculateAnalysisCost(
      inputTokens,
      outputTokens,
    );

    expect(creditsService.estimateCost(combinedTokens)).toBe(expected);
  });

  test("deduct throws InsufficientCreditsError for low balance", async () => {
    const user = await User.create({
      name: "Credit User",
      email: "credit@test.com",
      role: "user",
      status: "active",
      planSlug: "free",
      passwordHash: "dummyHash",
      creditBalance: 10,
    });

    await expect(creditsService.deduct(String(user._id), 20)).rejects.toBeInstanceOf(
      InsufficientCreditsError,
    );
  });

  test("concurrent deductions do not allow overspend", async () => {
    const user = await User.create({
      name: "Concurrent User",
      email: "concurrent@test.com",
      role: "user",
      status: "active",
      planSlug: "free",
      passwordHash: "dummyHash",
      creditBalance: 20,
    });

    const deductionCalls = [
      creditsService.deduct(String(user._id), 15, { reason: "analysis_deduction" }),
      creditsService.deduct(String(user._id), 15, { reason: "analysis_deduction" }),
    ];

    const results = await Promise.allSettled(deductionCalls);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      InsufficientCreditsError,
    );

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.creditBalance).toBe(5);
  });

  test("topupForPlanAllowance initializes free plan allowance and ledger entry", async () => {
    const freePlan = await Plan.create({
      name: "Free",
      slug: "free",
      price: 0,
      billingCycle: "monthly",
      features: ["Basic access"],
      analysisLimit: 5,
      storageLimit: 10,
      creditAllowance: 500,
      isActive: true,
    });

    const user = await User.create({
      name: "Allowance User",
      email: "allowance@test.com",
      role: "user",
      status: "active",
      planSlug: "free",
      passwordHash: "dummyHash",
    });

    await Subscription.create({
      userId: user._id,
      planId: freePlan._id,
      status: "active",
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      renewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });

    const ledger = await creditsService.topupForPlanAllowance(String(user._id));
    expect(ledger).not.toBeNull();
    expect(ledger?.delta).toBe(500);
    expect(ledger?.reason).toBe("plan_topup");

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.creditBalance).toBe(500);
  });

  test("ledger balanceAfter stays consistent with user creditBalance", async () => {
    const user = await User.create({
      name: "Balance User",
      email: "balance@test.com",
      role: "user",
      status: "active",
      planSlug: "free",
      passwordHash: "dummyHash",
      creditBalance: 200,
    });

    const deduction = await creditsService.deduct(String(user._id), 50, {
      reason: "chat_deduction",
      tokensUsed: 20,
      hostingCost: 5,
    });

    expect(deduction.balanceAfter).toBe(150);

    const refreshedUser = await User.findById(user._id);
    expect(refreshedUser?.creditBalance).toBe(150);
  });

  test("GET /api/account/credits returns current balance and ledger entries", async () => {
    const user = await User.create({
      name: "API User",
      email: "api@test.com",
      role: "user",
      status: "active",
      planSlug: "free",
      passwordHash: "dummyHash",
      creditBalance: 75,
    });

    await CreditLedger.create({
      userId: user._id,
      delta: 75,
      balanceAfter: 75,
      reason: "plan_topup",
      metadata: {},
    });

    const token = signToken({ sub: String(user._id), email: user.email, role: user.role, plan: user.plan });

    const res = await request(app)
      .get("/api/account/credits")
      .set("Cookie", `accessToken=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.balance).toBe(75);
    expect(res.body.data.ledger).toHaveLength(1);
    expect(res.body.data.ledger[0].reason).toBe("plan_topup");
  });
});
