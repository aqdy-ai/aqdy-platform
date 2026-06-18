import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import { config } from "dotenv";
import { User } from "../../src/models/user.model.js";

config();

let app: unknown;

jest.setTimeout(30000);

describe("Email Verification Integration Tests", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    process.env.MONGODB_URI =
      process.env.MONGODB_URI?.replace("aqdy_db", "aqdy_test") ||
      "mongodb://127.0.0.1:27017/aqdy_test";

    const imported = await import("../../src/index.js");
    app = imported.default;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  const getCookieValue = (res: request.Response, name: string) => {
    const setCookies = res.headers["set-cookie"] || [];
    for (const c of setCookies) {
      const match = c.match(new RegExp(`${name}=([^;]+)`));
      if (match) return match[1];
    }
    return undefined;
  };

  test("Registration creates user with isEmailVerified: false and emailVerificationToken", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Verify Tester",
      email: "verify-test@example.com",
      password: "StrongPass123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.isEmailVerified).toBe(false);

    const user = await User.findOne({ email: "verify-test@example.com" }).select("+emailVerificationToken");
    expect(user).toBeTruthy();
    expect(user?.isEmailVerified).toBe(false);
    expect(user?.emailVerificationToken).toBeDefined();
    expect(user?.emailVerificationExpiresAt).toBeDefined();
  });

  test("Unverified user is blocked from protected routes with 403 Forbidden", async () => {
    // 1. Register
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Unverified User",
      email: "unverified@example.com",
      password: "StrongPass123!",
    });

    const access = getCookieValue(registerRes, "accessToken");

    // 2. Request a protected route
    const res = await request(app)
      .get("/api/contracts")
      .set("Cookie", `accessToken=${access}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Email verification required.");
  });

  test("POST /api/auth/verify-email verifies email with valid token", async () => {
    // 1. Register user
    await request(app).post("/api/auth/register").send({
      name: "User To Verify",
      email: "to-verify@example.com",
      password: "StrongPass123!",
    });

    const userBefore = await User.findOne({ email: "to-verify@example.com" }).select("+emailVerificationToken");
    const token = userBefore?.emailVerificationToken;
    expect(token).toBeDefined();

    // 2. Verify email
    const verifyRes = await request(app)
      .post("/api/auth/verify-email")
      .send({ token });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    const userAfter = await User.findOne({ email: "to-verify@example.com" });
    expect(userAfter?.isEmailVerified).toBe(true);
    expect(userAfter?.emailVerificationToken).toBeUndefined();
    expect(userAfter?.emailVerificationExpiresAt).toBeUndefined();
  });

  test("POST /api/auth/verify-email fails with invalid or expired token", async () => {
    // Try to verify with fake token
    const verifyRes = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: "invalid-token-12345" });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.success).toBe(false);
  });

  test("POST /api/auth/resend-verification enforces rate limits", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Resend User",
      email: "resend-user@example.com",
      password: "StrongPass123!",
    });

    const access = getCookieValue(registerRes, "accessToken");

    // Try to resend immediately (fails because it's sent on registration, i.e. within 60s)
    const resendRes1 = await request(app)
      .post("/api/auth/resend-verification")
      .set("Cookie", `accessToken=${access}`);

    expect(resendRes1.status).toBe(429);
    expect(resendRes1.body.success).toBe(false);
    expect(resendRes1.body.error).toContain("seconds before requesting a new verification link");

    // Bypass cooldown by shifting timestamp in DB back by 61 seconds
    const dbUser = await User.findOne({ email: "resend-user@example.com" });
    if (dbUser) {
      dbUser.emailVerificationSentAt = new Date(Date.now() - 65000);
      await dbUser.save();
    }

    // Resend now succeeds
    const resendRes2 = await request(app)
      .post("/api/auth/resend-verification")
      .set("Cookie", `accessToken=${access}`);

    expect(resendRes2.status).toBe(200);
    expect(resendRes2.body.success).toBe(true);
  });

  test("Admin can manually verify a user's email via PATCH /api/admin/accounts/:id", async () => {
    // 1. Create user
    await request(app).post("/api/auth/register").send({
      name: "Admin Target User",
      email: "admin-target@example.com",
      password: "StrongPass123!",
    });

    const targetUser = await User.findOne({ email: "admin-target@example.com" });
    expect(targetUser?.isEmailVerified).toBe(false);

    // 2. Create admin
    const admin = new User({
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      plan: "free",
      status: "active",
      isEmailVerified: true,
    });
    admin.password = "StrongPass123!";
    await admin.save();

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "StrongPass123!",
    });

    const adminAccess = getCookieValue(loginRes, "accessToken");

    // 3. Admin updates email verification
    const updateRes = await request(app)
      .patch(`/api/admin/accounts/${targetUser?._id}`)
      .set("Cookie", `accessToken=${adminAccess}`)
      .send({ isEmailVerified: true });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.isEmailVerified).toBe(true);

    const verifiedUser = await User.findById(targetUser?._id);
    expect(verifiedUser?.isEmailVerified).toBe(true);
  });
});
