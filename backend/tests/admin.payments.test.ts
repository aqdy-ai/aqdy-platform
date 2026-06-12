import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { User } from "../src/models/user.model.js";
import Payment from "../src/models/payment.model.js";
import adminPaymentsRouter from "../src/routes/admin.payments.route.js";
import requestIdMiddleware from "../src/middlewares/requestId.middleware.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { env } from "../src/config/env.js";

// ── Test app ─────────────────────────────────────────────────────────────────
const testApp = express();
testApp.use(express.json());
testApp.use(cookieParser());
testApp.use(requestIdMiddleware);
testApp.use("/api/admin/payments", adminPaymentsRouter);
testApp.use(errorHandler);

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, env.JWT_SECRET);
}

/** Create a minimal payment document */
async function createPayment(
  userId: mongoose.Types.ObjectId,
  overrides: Partial<{
    status: string;
    amount: number;
    currency: string;
    createdAt: Date;
  }> = {},
) {
  return Payment.create({
    userId,
    subscriptionId: new mongoose.Types.ObjectId(),
    amount: overrides.amount ?? 49.99,
    currency: overrides.currency ?? "USD",
    status: overrides.status ?? "succeeded",
    provider: "stripe",
    providerTxId: `pi_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
  });
}

// ── DB lifecycle ──────────────────────────────────────────────────────────────
beforeAll(async () => {
  const mongoURI =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aqdy-admin-payments-test";
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
  await Payment.deleteMany({});
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("GET /api/admin/payments — role enforcement", () => {
  test("returns 401 when no token is provided", async () => {
    const res = await request(testApp).get("/api/admin/payments");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("returns 403 when a regular user calls the endpoint", async () => {
    const user = await User.create({
      name: "Regular",
      email: "regular@test.com",
      role: "user",
      status: "active",
      planSlug: "free",
      passwordHash: "h",
    });
    const token = generateToken({
      sub: user._id.toString(),
      email: user.email,
      role: "user",
    });

    const res = await request(testApp)
      .get("/api/admin/payments")
      .set("Cookie", `accessToken=${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/admin/payments — paginated listing", () => {
  let adminToken: string;
  let adminUserId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    const admin = await User.create({
      name: "Admin",
      email: "admin@payments.test",
      role: "admin",
      status: "active",
      planSlug: "enterprise",
      passwordHash: "h",
    });
    adminUserId = admin._id as mongoose.Types.ObjectId;
    adminToken = generateToken({
      sub: admin._id.toString(),
      email: admin.email,
      role: "admin",
    });
  });

  test("returns paginated list of all payments with correct metadata", async () => {
    // Seed 25 payments for the admin user
    for (let i = 0; i < 25; i++) {
      await createPayment(adminUserId);
    }

    const res = await request(testApp)
      .get("/api/admin/payments?page=1&pageSize=10")
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.pagination.total).toBe(25);
    expect(res.body.pagination.totalPages).toBe(3);
    expect(res.body.pagination.hasNext).toBe(true);
    expect(res.body.pagination.hasPrev).toBe(false);
  });

  test("page 2 returns the next batch and hasPrev=true", async () => {
    for (let i = 0; i < 25; i++) {
      await createPayment(adminUserId);
    }

    const res = await request(testApp)
      .get("/api/admin/payments?page=2&pageSize=10")
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.pagination.hasPrev).toBe(true);
    expect(res.body.pagination.hasNext).toBe(true);
  });

  test("pageSize is capped at 100", async () => {
    for (let i = 0; i < 5; i++) {
      await createPayment(adminUserId);
    }

    const res = await request(testApp)
      .get("/api/admin/payments?pageSize=999")
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(200);
    // pageSize should be capped internally
    expect(res.body.pagination.pageSize).toBeLessThanOrEqual(100);
  });
});

describe("GET /api/admin/payments — filter by status", () => {
  let adminToken: string;
  let adminUserId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    const admin = await User.create({
      name: "Admin",
      email: "admin@filter.test",
      role: "admin",
      status: "active",
      planSlug: "enterprise",
      passwordHash: "h",
    });
    adminUserId = admin._id as mongoose.Types.ObjectId;
    adminToken = generateToken({
      sub: admin._id.toString(),
      email: admin.email,
      role: "admin",
    });
  });

  test("filters payments by status=succeeded", async () => {
    await createPayment(adminUserId, { status: "succeeded" });
    await createPayment(adminUserId, { status: "failed" });
    await createPayment(adminUserId, { status: "refunded" });

    const res = await request(testApp)
      .get("/api/admin/payments?status=succeeded")
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("succeeded");
    expect(res.body.filters.status).toBe("succeeded");
  });

  test("filters payments by status=failed", async () => {
    await createPayment(adminUserId, { status: "succeeded" });
    await createPayment(adminUserId, { status: "failed" });

    const res = await request(testApp)
      .get("/api/admin/payments?status=failed")
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("failed");
  });

  test("returns 400 for an invalid status value", async () => {
    const res = await request(testApp)
      .get("/api/admin/payments?status=invalid_status")
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/status/i);
  });
});

describe("GET /api/admin/payments — filter by userId", () => {
  let adminToken: string;

  beforeEach(async () => {
    const admin = await User.create({
      name: "Admin",
      email: "admin@userid.test",
      role: "admin",
      status: "active",
      planSlug: "enterprise",
      passwordHash: "h",
    });
    adminToken = generateToken({
      sub: admin._id.toString(),
      email: admin.email,
      role: "admin",
    });
  });

  test("returns only payments belonging to the specified userId", async () => {
    const u1 = await User.create({ name: "U1", email: "u1@test.com", role: "user", status: "active", planSlug: "free", passwordHash: "h" });
    const u2 = await User.create({ name: "U2", email: "u2@test.com", role: "user", status: "active", planSlug: "free", passwordHash: "h" });

    await createPayment(u1._id as mongoose.Types.ObjectId);
    await createPayment(u1._id as mongoose.Types.ObjectId);
    await createPayment(u2._id as mongoose.Types.ObjectId);

    const res = await request(testApp)
      .get(`/api/admin/payments?userId=${u1._id}`)
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(2);
    for (const payment of res.body.data) {
      // userId is populated — check by _id
      expect(payment.userId._id.toString()).toBe(u1._id.toString());
    }
  });

  test("returns 400 for a malformed userId (not a valid ObjectId)", async () => {
    const res = await request(testApp)
      .get("/api/admin/payments?userId=not-an-object-id")
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/userId/i);
  });
});

describe("GET /api/admin/payments — filter by date range", () => {
  let adminToken: string;
  let adminUserId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    const admin = await User.create({
      name: "Admin",
      email: "admin@daterange.test",
      role: "admin",
      status: "active",
      planSlug: "enterprise",
      passwordHash: "h",
    });
    adminUserId = admin._id as mongoose.Types.ObjectId;
    adminToken = generateToken({
      sub: admin._id.toString(),
      email: admin.email,
      role: "admin",
    });
  });

  test("filters payments by dateFrom only", async () => {
    const past   = new Date("2024-01-15T00:00:00Z");
    const recent = new Date("2026-05-01T00:00:00Z");

    // Use insertMany with timestamps disabled to set explicit createdAt values
    await Payment.insertMany([
      {
        userId: adminUserId,
        subscriptionId: new mongoose.Types.ObjectId(),
        amount: 10, currency: "USD", status: "succeeded",
        provider: "stripe",
        providerTxId: `pi_past_${Date.now()}_1`,
        createdAt: past, updatedAt: past,
      },
      {
        userId: adminUserId,
        subscriptionId: new mongoose.Types.ObjectId(),
        amount: 20, currency: "USD", status: "succeeded",
        provider: "stripe",
        providerTxId: `pi_recent_${Date.now()}_2`,
        createdAt: recent, updatedAt: recent,
      },
    ], { timestamps: false });

    const res = await request(testApp)
      .get("/api/admin/payments?dateFrom=2026-01-01T00:00:00Z")
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(200);
    // Only the recent payment is within the range
    expect(res.body.pagination.total).toBe(1);
  });

  test("filters payments by dateTo only", async () => {
    const past   = new Date("2024-01-15T00:00:00Z");
    const recent = new Date("2026-05-01T00:00:00Z");

    await Payment.insertMany([
      {
        userId: adminUserId,
        subscriptionId: new mongoose.Types.ObjectId(),
        amount: 10, currency: "USD", status: "succeeded",
        provider: "stripe",
        providerTxId: `pi_past_${Date.now()}_a`,
        createdAt: past, updatedAt: past,
      },
      {
        userId: adminUserId,
        subscriptionId: new mongoose.Types.ObjectId(),
        amount: 20, currency: "USD", status: "succeeded",
        provider: "stripe",
        providerTxId: `pi_recent_${Date.now()}_b`,
        createdAt: recent, updatedAt: recent,
      },
    ], { timestamps: false });

    const res = await request(testApp)
      .get("/api/admin/payments?dateTo=2025-01-01T00:00:00Z")
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(200);
    // Only the past payment is within the range
    expect(res.body.pagination.total).toBe(1);
  });

  test("returns 400 for an invalid dateFrom format", async () => {
    const res = await request(testApp)
      .get("/api/admin/payments?dateFrom=not-a-date")
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/dateFrom/i);
  });
});

describe("GET /api/admin/payments — populated user in response", () => {
  let adminToken: string;

  beforeEach(async () => {
    const admin = await User.create({
      name: "Admin",
      email: "admin@populate.test",
      role: "admin",
      status: "active",
      planSlug: "enterprise",
      passwordHash: "h",
    });
    adminToken = generateToken({
      sub: admin._id.toString(),
      email: admin.email,
      role: "admin",
    });
  });

  test("each payment includes populated user name and email", async () => {
    const user = await User.create({
      name: "Ahmed Ali",
      email: "ahmed@test.com",
      role: "user",
      status: "active",
      planSlug: "premium",
      passwordHash: "h",
    });
    await createPayment(user._id as mongoose.Types.ObjectId);

    const res = await request(testApp)
      .get("/api/admin/payments")
      .set("Cookie", `accessToken=${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);

    const payment = res.body.data[0];
    // userId must be a populated object, not a bare string
    expect(typeof payment.userId).toBe("object");
    expect(payment.userId.name).toBe("Ahmed Ali");
    expect(payment.userId.email).toBe("ahmed@test.com");
    expect(payment.userId.planSlug).toBe("premium");
  });
});
