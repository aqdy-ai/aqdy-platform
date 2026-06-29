import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import { config } from "dotenv";

config();

// Mock email service to prevent real email sending
jest.unstable_mockModule("../../src/services/email.service.js", () => ({
  emailService: {
    sendVerificationEmail: jest
      .fn<(...args: unknown[]) => Promise<undefined>>()
      .mockResolvedValue(undefined),
    sendPasswordResetEmail: jest
      .fn<(...args: unknown[]) => Promise<undefined>>()
      .mockResolvedValue(undefined),
  },
}));

const { User } = await import("../../src/models/user.model.js");
const { generateAccessToken } = await import(
  "../../src/services/auth.service.js"
);

let app: unknown;

jest.setTimeout(30000);

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates an unverified user directly in the DB (bypasses the register route
 * which auto-verifies in test env) and returns the user + a signed access token.
 */
const createUnverifiedUser = async (
  email: string,
  name = "Test User",
  password = "StrongPass123!",
) => {
  const crypto = await import("crypto");
  const verificationToken = crypto.randomBytes(32).toString("hex");

  const user = new User({
    name,
    email,
    role: "user",
    plan: "free",
    status: "active",
    isEmailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    emailVerificationSentAt: new Date(),
  });
  user.password = password;
  await user.save();

  const token = generateAccessToken(user);
  return { user, token, verificationToken };
};

const getCookieValue = (res: request.Response, name: string) => {
  const setCookies = res.headers["set-cookie"] || [];
  for (const c of setCookies) {
    const match = c.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  return undefined;
};

// ── Suite ──────────────────────────────────────────────────────────────────

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

  // ── Test 1 ────────────────────────────────────────────────────────────────

  test("Unverified user created directly has isEmailVerified: false and emailVerificationToken", async () => {
    const { user, verificationToken } = await createUnverifiedUser(
      "verify-test@example.com",
      "Verify Tester",
    );

    expect(user.isEmailVerified).toBe(false);
    expect(user.emailVerificationToken).toBe(verificationToken);
    expect(user.emailVerificationExpiresAt).toBeDefined();
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────

  test("Unverified user is blocked from protected routes with 403 Forbidden", async () => {
    // Create an unverified user directly (bypasses test-env auto-verify)
    const { token: access } = await createUnverifiedUser(
      "unverified@example.com",
      "Unverified User",
    );

    const res = await request(app)
      .get("/api/contracts")
      .set("Cookie", `accessToken=${access}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Email verification required.");
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────

  test("POST /api/auth/verify-email verifies email with valid token", async () => {
    // Create unverified user with a known token
    const { verificationToken } = await createUnverifiedUser(
      "to-verify@example.com",
      "User To Verify",
    );

    expect(verificationToken).toBeDefined();

    // Verify email via API
    const verifyRes = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: verificationToken });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    const userAfter = await User.findOne({ email: "to-verify@example.com" });
    expect(userAfter?.isEmailVerified).toBe(true);
    expect(userAfter?.emailVerificationToken).toBeUndefined();
    expect(userAfter?.emailVerificationExpiresAt).toBeUndefined();
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────

  test("POST /api/auth/verify-email fails with invalid or expired token", async () => {
    const verifyRes = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: "invalid-token-12345" });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.success).toBe(false);
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────

  test("POST /api/auth/resend-verification enforces rate limits", async () => {
    // Create unverified user directly so emailVerificationSentAt is set
    const { token: access } = await createUnverifiedUser(
      "resend-user@example.com",
      "Resend User",
    );

    // Immediately requesting a resend should be rate-limited (sent < 60s ago)
    const resendRes1 = await request(app)
      .post("/api/auth/resend-verification")
      .set("Cookie", `accessToken=${access}`);

    expect(resendRes1.status).toBe(429);
    expect(resendRes1.body.success).toBe(false);
    expect(resendRes1.body.error).toContain(
      "seconds before requesting a new verification link",
    );

    // Bypass cooldown: shift timestamp back 65s
    const dbUser = await User.findOne({ email: "resend-user@example.com" });
    if (dbUser) {
      dbUser.emailVerificationSentAt = new Date(Date.now() - 65000);
      await dbUser.save();
    }

    // Now resend should succeed
    const resendRes2 = await request(app)
      .post("/api/auth/resend-verification")
      .set("Cookie", `accessToken=${access}`);

    expect(resendRes2.status).toBe(200);
    expect(resendRes2.body.success).toBe(true);
  });

  // ── Test 6 ────────────────────────────────────────────────────────────────

  test("Admin can manually verify a user's email via PATCH /api/admin/accounts/:id", async () => {
    // 1. Create unverified target user
    const { user: targetUser } = await createUnverifiedUser(
      "admin-target@example.com",
      "Admin Target User",
    );
    expect(targetUser.isEmailVerified).toBe(false);

    // 2. Create admin user (verified)
    const admin = new User({
      name: "Admin User",
      email: "admin@example.com",
      role: "super_admin",
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

    // 3. Admin patches isEmailVerified
    const updateRes = await request(app)
      .patch(`/api/admin/accounts/${targetUser._id}`)
      .set("Cookie", `accessToken=${adminAccess}`)
      .send({ isEmailVerified: true });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.isEmailVerified).toBe(true);

    const verifiedUser = await User.findById(targetUser._id);
    expect(verifiedUser?.isEmailVerified).toBe(true);
  });
});
