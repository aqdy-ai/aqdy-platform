import request from "supertest";
import { jest, beforeAll, afterAll, afterEach, describe, it, expect } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// Mock email service to capture token
const mockSendPasswordResetEmail = jest
  .fn<(...args: unknown[]) => Promise<undefined>>()
  .mockResolvedValue(undefined);
const mockSendVerificationEmail = jest
  .fn<(...args: unknown[]) => Promise<undefined>>()
  .mockResolvedValue(undefined);

jest.unstable_mockModule("../src/services/email.service.js", () => ({
  emailService: {
    sendPasswordResetEmail: mockSendPasswordResetEmail,
    sendVerificationEmail: mockSendVerificationEmail,
  },
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

const { default: app } = await import("../src/index.js");
const { User } = await import("../src/models/user.model.js");

let mongo: any;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  process.env.MONGODB_URI = uri;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

afterEach(async () => {
  jest.clearAllMocks();
  await User.deleteMany({});
});

describe("Password reset flow", () => {
  const userData = {
    email: "test@example.com",
    password: "Password1!",
    name: "Test User",
  };

  it("Happy path: request reset, reset password, old sessions cleared", async () => {
    // Register user
    await request(app).post("/api/auth/register").send(userData).expect(201);

    // Request password reset
    const forgotRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: userData.email })
      .expect(200);
    expect(forgotRes.body.success).toBe(true);

    // Capture token from DB (email mock not needed for token)
    const user = await User.findOne({ email: userData.email });
    expect(user?.passwordResetToken).toBeDefined();
    const token = user?.passwordResetToken as string;

    // Reset password
    const newPassword = "NewPass2@";
    const resetRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword })
      .expect(200);
    expect(resetRes.body.success).toBe(true);

    // Ensure token fields cleared and refresh tokens cleared
    const updatedUser = await User.findOne({ email: userData.email });
    expect(updatedUser?.passwordResetToken).toBeFalsy();
    expect(updatedUser?.refreshToken).toBeFalsy();

    // Login with new password should succeed
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: userData.email, password: newPassword })
      .expect(200);
    expect(loginRes.body.success).toBe(true);
  });

  it("Expired token should be rejected", async () => {
    await request(app).post("/api/auth/register").send(userData).expect(201);
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: userData.email })
      .expect(200);
    const user = await User.findOne({ email: userData.email });
    const token = user?.passwordResetToken as string;
    // Expire token manually
    user!.passwordResetExpiresAt = new Date(Date.now() - 60 * 1000);
    await user!.save();
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "Another1!" })
      .expect(400);
  });

  it("Reuse of token should be rejected", async () => {
    await request(app).post("/api/auth/register").send(userData).expect(201);
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: userData.email })
      .expect(200);
    const user = await User.findOne({ email: userData.email });
    const token = user?.passwordResetToken as string;
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "NewPass2@" })
      .expect(200);
    // Second attempt with same token
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "Another1!" })
      .expect(400);
  });
});
