import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import express from "express";
import crypto from "crypto";
import { User } from "../src/models/user.model.js";
import { Contract } from "../src/models/contract.model.js";
import { AuditLog } from "../src/models/auditLog.model.js";
import accountsRouter from "../src/routes/accounts.route.js";
import requestIdMiddleware from "../src/middleware/requestId.middleware.js";

const testApp = express();
testApp.use(express.json());
testApp.use(requestIdMiddleware);
testApp.use("/api/admin/accounts", accountsRouter);

const TEST_JWT_SECRET = "test_jwt_secret_key_123456";
process.env.JWT_SECRET = TEST_JWT_SECRET;

// Helper to sign JWT manually
function generateToken(payload: any): string {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const hmac = crypto.createHmac("sha256", TEST_JWT_SECRET);
  hmac.update(`${headerB64}.${payloadB64}`);
  const signatureB64 = hmac.digest("base64url");

  return `${headerB64}.${payloadB64}.${signatureB64}`;
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
});

describe("Admin Account Management API & Role Guard", () => {
  const adminToken = generateToken({ email: "admin@test.com", role: "admin" });
  const userToken = generateToken({ email: "user@test.com", role: "user" });

  test("returns 401 when no token is provided", async () => {
    const res = await request(testApp).get("/api/admin/accounts");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("returns 403 when regular user attempts to access endpoints", async () => {
    const res = await request(testApp)
      .get("/api/admin/accounts")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Forbidden");
  });

  test("GET /api/admin/accounts lists paginated, filtered, and searched accounts", async () => {
    // Seed test users
    await User.create([
      { name: "Alice Blue", email: "alice@test.com", role: "user", status: "active", planSlug: "free", passwordHash: "dummyHash" },
      { name: "Bob Green", email: "bob@test.com", role: "user", status: "suspended", planSlug: "premium", passwordHash: "dummyHash" },
      { name: "Charlie Red", email: "charlie@test.com", role: "admin", status: "active", planSlug: "enterprise", passwordHash: "dummyHash" },
    ]);

    // List all
    let res = await request(testApp)
      .get("/api/admin/accounts")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.pagination.total).toBe(3);

    // Search by name
    res = await request(testApp)
      .get("/api/admin/accounts?search=Alice")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Alice Blue");

    // Filter by status
    res = await request(testApp)
      .get("/api/admin/accounts?status=suspended")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Bob Green");

    // Filter by planSlug
    res = await request(testApp)
      .get("/api/admin/accounts?planSlug=enterprise")
      .set("Authorization", `Bearer ${adminToken}`);
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
      planSlug: "premium",
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
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe("Test Account");
    expect(res.body.data.subscription.planSlug).toBe("premium");
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
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        plan: "premium",
        status: "suspended",
        role: "admin",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.planSlug).toBe("premium");
    expect(res.body.data.status).toBe("suspended");
    expect(res.body.data.role).toBe("admin");

    // Verify database directly
    const updated = await User.findById(user._id);
    expect(updated?.planSlug).toBe("premium");
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
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("confirm");

    // Try with confirmation flag
    res = await request(testApp)
      .delete(`/api/admin/accounts/${userIdStr}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ confirm: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await User.findById(user._id);
    expect(deleted).toBeNull();
  });
});
