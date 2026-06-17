import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { User } from "../src/models/user.model.js";
import { Contract } from "../src/models/contract.model.js";
import { AuditLog } from "../src/models/auditLog.model.js";
import { Plan } from "../src/models/plan.model.js";
import { Subscription } from "../src/models/subscription.model.js";
import Payment from "../src/models/payment.model.js";
import { RiskAnalysis } from "../src/models/riskAnalysis.model.js";
import { CreditLedger } from "../src/models/creditLedger.model.js";
import accountsRouter from "../src/routes/accounts.route.js";
import adminStatsRouter from "../src/routes/admin.stats.route.js";
import requestIdMiddleware from "../src/middlewares/requestId.middleware.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { env } from "../src/config/env.js";

const testApp = express();
testApp.use(express.json());
testApp.use(cookieParser());
testApp.use(requestIdMiddleware);
testApp.use("/api/admin/accounts", accountsRouter);
testApp.use("/api/admin/stats", adminStatsRouter);
testApp.use(errorHandler);

// Helper to sign JWT manually
function generateToken(payload: any): string {
  return jwt.sign(payload, env.JWT_SECRET);
}

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aqdy-accounts-test";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoURI);
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Contract.deleteMany({});
  await AuditLog.deleteMany({});
  await Plan.deleteMany({});
  await Subscription.deleteMany({});
  await Payment.deleteMany({});
  await RiskAnalysis.deleteMany({});
  await CreditLedger.deleteMany({});
});


describe("Admin Account Management API & Role Guard", () => {
  // Tokens are generated dynamically per test after seeding real users,
  // because authenticateJwt now validates the token subject against the DB.
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    // Seed a real admin user so authenticateJwt DB lookup succeeds
    const adminUser = await User.create({
      name: "Guard Admin",
      email: "admin-guard@test.com",
      role: "admin",
      status: "active",
      planSlug: "free",
      passwordHash: "dummyHash",
    });
    adminToken = generateToken({
      sub: adminUser._id.toString(),
      email: adminUser.email,
      role: "admin",
    });

    // Seed a real regular user for the 403 role-enforcement test
    const regularUser = await User.create({
      name: "Guard Regular",
      email: "user-guard@test.com",
      role: "user",
      status: "active",
      planSlug: "free",
      passwordHash: "dummyHash",
    });
    userToken = generateToken({
      sub: regularUser._id.toString(),
      email: regularUser.email,
      role: "user",
    });
  });

  test("returns 401 when no token is provided", async () => {
    const res = await request(testApp).get("/api/admin/accounts");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("returns 403 when regular user attempts to access endpoints", async () => {
    const res = await request(testApp)
      .get("/api/admin/accounts")
      .set("Cookie", `accessToken=${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Forbidden");
  });

  test("GET /api/admin/accounts lists paginated, filtered, and searched accounts", async () => {
    // Seed 3 additional test users (admin-guard@test.com is already seeded in beforeEach)
    await User.create([
      { name: "Alice Blue",   email: "alice@test.com",   role: "user",  status: "active",    planSlug: "free",       passwordHash: "dummyHash" },
      { name: "Bob Green",    email: "bob@test.com",     role: "user",  status: "suspended", planSlug: "pro",        passwordHash: "dummyHash" },
      { name: "Charlie Red",  email: "charlie@test.com", role: "admin", status: "active",    planSlug: "enterprise", passwordHash: "dummyHash" },
    ]);

    // List all — 5 total: Guard Admin + Guard Regular (seeded in beforeEach) + Alice + Bob + Charlie
    let res = await request(testApp)
      .get("/api/admin/accounts")
      .set("Cookie", `accessToken=${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.pagination.total).toBe(5);

    // Search by name
    res = await request(testApp)
      .get("/api/admin/accounts?search=Alice")
      .set("Cookie", `accessToken=${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Alice Blue");

    // Filter by status=suspended
    res = await request(testApp)
      .get("/api/admin/accounts?status=suspended")
      .set("Cookie", `accessToken=${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Bob Green");

    // Filter by planSlug=enterprise (only Charlie — Guard Admin is free)
    res = await request(testApp)
      .get("/api/admin/accounts?planSlug=enterprise")
      .set("Cookie", `accessToken=${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Charlie Red");
  });

  test("GET /api/admin/accounts/:id returns full user details, usage stats, and recent activity", async () => {
    const user = await User.create({
      name: "Test Account",
      email: "test@account.com",
      role: "user",
      status: "active",
      planSlug: "pro",
      passwordHash: "dummyHash",
    });

    const userIdStr = user._id.toString();

    // Create a contract and an audit log for stats
    await Contract.create({
      filename: "contract1.pdf",
      language: "en",
      text: "Draft content...",
      userId: userIdStr,
      fileSize: 1500,
    });

    await AuditLog.create({
      action: "AUTH_LOGIN_SUCCESS",
      outcome: "success",
      userId: user._id,
      userEmail: user.email,
    });

    const res = await request(testApp)
      .get(`/api/admin/accounts/${userIdStr}`)
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe("Test Account");
    expect(res.body.data.subscription.planSlug).toBe("pro");
    expect(res.body.data.usageStats.contractsCount).toBe(1);
    expect(res.body.data.usageStats.totalFileSizeBytes).toBe(1500);
    expect(res.body.data.recentActivity).toHaveLength(1);
    expect(res.body.data.recentActivity[0].action).toBe("AUTH_LOGIN_SUCCESS");
  });

  test("PATCH /api/admin/accounts/:id updates user plan, status, or role", async () => {
    const user = await User.create({
      name: "Update Target",
      email: "update@target.com",
      role: "user",
      status: "active",
      planSlug: "free",
      passwordHash: "dummyHash",
    });

    const userIdStr = user._id.toString();

    const res = await request(testApp)
      .patch(`/api/admin/accounts/${userIdStr}`)
      .set("Cookie", `accessToken=${adminToken}`)
      .send({
        plan: "pro",
        status: "suspended",
        role: "admin",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.planSlug).toBe("pro");
    expect(res.body.data.status).toBe("suspended");
    expect(res.body.data.role).toBe("admin");

    // Verify database directly
    const updated = await User.findById(user._id);
    expect(updated?.planSlug).toBe("pro");
    expect(updated?.status).toBe("suspended");
    expect(updated?.role).toBe("admin");
  });

  test("DELETE /api/admin/accounts/:id requires confirmation flag and hard deletes the user", async () => {
    const user = await User.create({
      name: "Delete Target",
      email: "delete@target.com",
      role: "user",
      status: "active",
      planSlug: "free",
      passwordHash: "dummyHash",
    });

    const userIdStr = user._id.toString();

    // Try without confirmation flag
    let res = await request(testApp)
      .delete(`/api/admin/accounts/${userIdStr}`)
      .set("Cookie", `accessToken=${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("confirm");

    // Try with confirmation flag
    res = await request(testApp)
      .delete(`/api/admin/accounts/${userIdStr}`)
      .set("Cookie", `accessToken=${adminToken}`)
      .send({ confirm: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await User.findById(user._id);
    expect(deleted).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin Stats Tests
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/admin/stats", () => {
  const adminToken = generateToken({ email: "admin@test.com", role: "admin", sub: new mongoose.Types.ObjectId().toString() });
  const userToken  = generateToken({ email: "user@test.com",  role: "user",  sub: new mongoose.Types.ObjectId().toString() });

  test("returns 401 when no token is provided", async () => {
    const res = await request(testApp).get("/api/admin/stats");
    expect(res.status).toBe(401);
  });

  test("returns 403 when regular user calls the stats endpoint", async () => {
    // Seed a real regular user so authenticateJwt DB lookup succeeds
    const regularUser = await User.create({
      name: "Regular User",
      email: "user@test.com",
      role: "user",
      status: "active",
      planSlug: "free",
      passwordHash: "dummyHash",
    });
    const localUserToken = generateToken({
      sub: regularUser._id.toString(),
      email: regularUser.email,
      role: "user",
    });
    const res = await request(testApp)
      .get("/api/admin/stats")
      .set("Cookie", `accessToken=${localUserToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test("returns correct aggregated stats for current month", async () => {
    // Seed admin user for JWT DB lookup
    const adminUser = await User.create({
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
      status: "active",
      planSlug: "enterprise",
      passwordHash: "dummyHash",
    });
    const adminToken2 = generateToken({ email: "admin@test.com", role: "admin", sub: adminUser._id.toString() });

    // Seed 3 users
    const u1 = await User.create({ name: "U1", email: "u1@test.com", role: "user", status: "active", planSlug: "free", passwordHash: "h" });
    const u2 = await User.create({ name: "U2", email: "u2@test.com", role: "user", status: "active", planSlug: "pro", passwordHash: "h" });

    // Seed active subscription
    const freePlan = await Plan.create({ name: "Free", slug: "free", billingCycle: "monthly", features: [], analysisLimit: 5, storageLimit: 100, creditAllowance: 0, isActive: true });
    await Subscription.create({ userId: u1._id, planId: freePlan._id, status: "active", startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000), renewalDate: new Date(Date.now() + 30 * 86400000) });

    // Seed a succeeded payment this month
    await Payment.create({ userId: u1._id, subscriptionId: new mongoose.Types.ObjectId(), amount: 49.99, currency: "USD", status: "succeeded", provider: "stripe", providerTxId: `pi_test_${Date.now()}` });

    // Seed a risk analysis this month
    await RiskAnalysis.create({
      contractId: new mongoose.Types.ObjectId(),
      userId: u1._id.toString(),
      version: 1,
      executiveSummary: { overallRisk: "low", totalClauses: 2, riskyClausesCount: 0, summary: { ar: "ملخص", en: "Summary" } },
      clauseAnalysis: [],
      analysisDuration: 1000,
    });

    // Seed credit deduction (should be counted)
    await CreditLedger.create({ userId: u1._id, delta: -10, balanceAfter: 90, reason: "analysis_deduction", metadata: {} });
    await CreditLedger.create({ userId: u2._id, delta: -5,  balanceAfter: 45, reason: "chat_deduction",     metadata: {} });
    // Seed credit topup (should NOT be counted in consumption)
    await CreditLedger.create({ userId: u1._id, delta: 100, balanceAfter: 100, reason: "plan_topup", metadata: {} });

    const res = await request(testApp)
      .get("/api/admin/stats")
      .set("Cookie", `accessToken=${adminToken2}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    // 3 users (2 regular + 1 admin seeded above)
    expect(data.totalAccounts).toBe(3);
    // 1 active subscription
    expect(data.activeSubscriptions).toBe(1);
    // USD revenue = 49.99
    expect(data.revenueThisMonth.USD).toBeCloseTo(49.99, 1);
    // 1 analysis
    expect(data.analysesThisMonth).toBe(1);
    // 15 credits consumed (10 + 5), topup of 100 excluded
    expect(data.creditsConsumedThisMonth).toBe(15);
  });

  test("creditsConsumedThisMonth excludes topup and refund events", async () => {
    const adminUser = await User.create({
      name: "Admin2", email: "admin2@test.com", role: "admin",
      status: "active", planSlug: "enterprise", passwordHash: "h",
    });
    const tok = generateToken({ email: "admin2@test.com", role: "admin", sub: adminUser._id.toString() });
    const uid = adminUser._id;

    // Only topup and refund — no deductions
    await CreditLedger.create({ userId: uid, delta: 200, balanceAfter: 200, reason: "plan_topup",  metadata: {} });
    await CreditLedger.create({ userId: uid, delta: 50,  balanceAfter: 250, reason: "refund",      metadata: {} });

    const res = await request(testApp)
      .get("/api/admin/stats")
      .set("Cookie", `accessToken=${tok}`);

    expect(res.status).toBe(200);
    expect(res.body.data.creditsConsumedThisMonth).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Credit balance in account list + PATCH topup behavior
// ─────────────────────────────────────────────────────────────────────────────
describe("Admin accounts — creditBalance and plan-change topup", () => {
  test("GET /api/admin/accounts includes creditBalance per user", async () => {
    const adminUser = await User.create({
      name: "Admin", email: "admin3@test.com", role: "admin",
      status: "active", planSlug: "enterprise", passwordHash: "h",
    });
    const tok = generateToken({ email: "admin3@test.com", role: "admin", sub: adminUser._id.toString() });

    await User.create({ name: "Rich User", email: "rich@test.com", role: "user", status: "active", planSlug: "pro", passwordHash: "h", creditBalance: 250 });

    const res = await request(testApp)
      .get("/api/admin/accounts")
      .set("Cookie", `accessToken=${tok}`);

    expect(res.status).toBe(200);
    // Every account object must expose creditBalance
    for (const account of res.body.data) {
      expect(account).toHaveProperty("creditBalance");
      expect(typeof account.creditBalance).toBe("number");
    }
    const richAccount = res.body.data.find((u: { email: string }) => u.email === "rich@test.com");
    expect(richAccount.creditBalance).toBe(250);
  });

  test("PATCH /api/admin/accounts/:id — no topup when plan is unchanged", async () => {
    const adminUser = await User.create({
      name: "Admin", email: "admin4@test.com", role: "admin",
      status: "active", planSlug: "enterprise", passwordHash: "h",
    });
    const tok = generateToken({ email: "admin4@test.com", role: "admin", sub: adminUser._id.toString() });

    // Seed the plan and the target user already on pro
    await Plan.create({ name: "Premium", slug: "pro", billingCycle: "monthly", features: [], analysisLimit: 50, storageLimit: -1, creditAllowance: 100, isActive: true });
    const target = await User.create({ name: "Same Plan User", email: "same@plan.com", role: "user", status: "active", planSlug: "pro", passwordHash: "h", creditBalance: 100 });

    // PATCH with the same plan the user already has
    const res = await request(testApp)
      .patch(`/api/admin/accounts/${target._id}`)
      .set("Cookie", `accessToken=${tok}`)
      .send({ plan: "pro" });

    expect(res.status).toBe(200);
    // creditTopup must NOT appear in the response
    expect(res.body.creditTopup).toBeUndefined();

    // creditBalance must be unchanged
    const afterUser = await User.findById(target._id);
    expect(afterUser?.creditBalance).toBe(100);

    // No ledger entry must have been created
    const ledgerCount = await CreditLedger.countDocuments({ userId: target._id });
    expect(ledgerCount).toBe(0);
  });

  test("PATCH /api/admin/accounts/:id — topup fires when plan genuinely changes", async () => {
    const adminUser = await User.create({
      name: "Admin", email: "admin5@test.com", role: "admin",
      status: "active", planSlug: "enterprise", passwordHash: "h",
    });
    const tok = generateToken({ email: "admin5@test.com", role: "admin", sub: adminUser._id.toString() });

    // Seed pro plan with 100 credit allowance
    await Plan.create({ name: "Premium", slug: "pro", billingCycle: "monthly", features: [], analysisLimit: 50, storageLimit: -1, creditAllowance: 100, isActive: true });
    const target = await User.create({ name: "Upgrading User", email: "upgrade@test.com", role: "user", status: "active", planSlug: "free", passwordHash: "h", creditBalance: 0 });

    const res = await request(testApp)
      .patch(`/api/admin/accounts/${target._id}`)
      .set("Cookie", `accessToken=${tok}`)
      .send({ plan: "pro" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // creditTopup must be present with correct amount
    expect(res.body.creditTopup).toBeDefined();
    expect(res.body.creditTopup.amount).toBe(100);
    expect(res.body.creditTopup.newBalance).toBe(100);

    // User creditBalance in DB must have increased
    const afterUser = await User.findById(target._id);
    expect(afterUser?.creditBalance).toBe(100);
    expect(afterUser?.planSlug).toBe("pro");

    // A ledger entry must exist
    const ledger = await CreditLedger.findOne({ userId: target._id, reason: "plan_topup" });
    expect(ledger).not.toBeNull();
    expect(ledger?.delta).toBe(100);
  });

  test("PATCH /api/admin/accounts/:id — topup skipped when plan creditAllowance is 0", async () => {
    const adminUser = await User.create({
      name: "Admin", email: "admin6@test.com", role: "admin",
      status: "active", planSlug: "enterprise", passwordHash: "h",
    });
    const tok = generateToken({ email: "admin6@test.com", role: "admin", sub: adminUser._id.toString() });

    // Free plan has 0 credit allowance
    await Plan.create({ name: "Free", slug: "free", billingCycle: "monthly", features: [], analysisLimit: 5, storageLimit: 100, creditAllowance: 0, isActive: true });
    const target = await User.create({ name: "Downgrade User", email: "downgrade@test.com", role: "user", status: "active", planSlug: "pro", passwordHash: "h", creditBalance: 50 });

    const res = await request(testApp)
      .patch(`/api/admin/accounts/${target._id}`)
      .set("Cookie", `accessToken=${tok}`)
      .send({ plan: "free" });

    if (res.status !== 200) throw new Error(JSON.stringify(res.body));
    expect(res.status).toBe(200);
    // No topup info in response
    expect(res.body.creditTopup).toBeUndefined();

    // creditBalance must be unchanged (no topup for free plan)
    const afterUser = await User.findById(target._id);
    expect(afterUser?.creditBalance).toBe(50);

    // No ledger entry must have been created
    const ledgerCount = await CreditLedger.countDocuments({ userId: target._id });
    expect(ledgerCount).toBe(0);
  });
});
