import mongoose from "mongoose";
import request from "supertest";
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import app from "../../src/index.js";
import { Contract } from "../../src/models/contract.model.js";
import { resetRateLimitStores } from "../../src/middlewares/rateLimit.js";
import { creditsService } from "../../src/services/credits.service.js";

let authToken: string;
let userId: string;

async function registerUser(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Rate Limit Test User", email, password: "Test@1234" });
  return {
    token: res.body.data.token,
    userId: res.body.data.user.id,
  };
}

async function createContract(userId: string) {
  return await Contract.create({
    filename: "rate-limit-test.pdf",
    language: "en",
    text: "Sample text for rate limit testing",
    userId,
    fileSize: 1024,
  });
}

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI!.replace("aqdy_db", "aqdy_test");
  await mongoose.connect(mongoURI);

  const user = await registerUser(`ratelimit_${Date.now()}@test.com`);
  authToken = user.token;
  userId = user.userId;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(() => {
  resetRateLimitStores();
});

// ── Route 1: Analysis (per-user, free tier, daily) ────────────────────────

describe("Rate Limiting — POST /api/analysis/analyze (Free tier daily limit)", () => {
  test("should allow requests under the daily limit", async () => {
    const contract = await createContract(userId);
    await creditsService.topup(userId, 100, "manual_adjustment");

    const res = await request(app)
      .post("/api/analysis/analyze")
      .set("Authorization", `Bearer ${authToken}`)
      .set("x-user-tier", "free")
      .send({ contractId: String(contract._id), userId });

    expect(res.status).not.toBe(429);
  });

  test("should return 429 after exceeding the daily limit", async () => {
    await creditsService.topup(userId, 100, "manual_adjustment");

    let lastRes;
    for (let i = 0; i < 11; i++) {
      const contract = await createContract(userId);
      lastRes = await request(app)
        .post("/api/analysis/analyze")
        .set("Authorization", `Bearer ${authToken}`)
        .set("x-user-tier", "free")
        .send({ contractId: String(contract._id), userId });
    }

    expect(lastRes!.status).toBe(429);
    expect(lastRes!.body.success).toBe(false);
    expect(lastRes!.body.retryAfter).toBeGreaterThan(0);
  });

  test("should include Retry-After header on 429 for analysis limit", async () => {
    await creditsService.topup(userId, 100, "manual_adjustment");

    let lastRes;
    for (let i = 0; i < 11; i++) {
      const contract = await createContract(userId);
      lastRes = await request(app)
        .post("/api/analysis/analyze")
        .set("Authorization", `Bearer ${authToken}`)
        .set("x-user-tier", "free")
        .send({ contractId: String(contract._id), userId });
    }

    expect(lastRes!.status).toBe(429);
    expect(lastRes!.headers["retry-after"]).toBeDefined();
    expect(Number(lastRes!.headers["retry-after"])).toBeGreaterThan(0);
  });

  test("should recover after resetRateLimitStores (simulating window reset)", async () => {
    await creditsService.topup(userId, 100, "manual_adjustment");

    for (let i = 0; i < 11; i++) {
      const contract = await createContract(userId);
      await request(app)
        .post("/api/analysis/analyze")
        .set("Authorization", `Bearer ${authToken}`)
        .set("x-user-tier", "free")
        .send({ contractId: String(contract._id), userId });
    }

    resetRateLimitStores();

    const newContract = await createContract(userId);
    const res = await request(app)
      .post("/api/analysis/analyze")
      .set("Authorization", `Bearer ${authToken}`)
      .set("x-user-tier", "free")
      .send({ contractId: String(newContract._id), userId });

    expect(res.status).not.toBe(429);
  });

  test("should not rate limit non-free tier users", async () => {
    await creditsService.topup(userId, 100, "manual_adjustment");

    let lastRes;
    for (let i = 0; i < 12; i++) {
      const contract = await createContract(userId);
      lastRes = await request(app)
        .post("/api/analysis/analyze")
        .set("Authorization", `Bearer ${authToken}`)
        .set("x-user-tier", "pro")
        .send({ contractId: String(contract._id), userId });
    }

    expect(lastRes!.status).not.toBe(429);
  });
});

// ── Route 2: Forgot Password (per-IP, hourly) ─────────────────────────────

describe("Rate Limiting — POST /api/auth/forgot-password (per-IP hourly limit)", () => {
  test("should allow requests under the limit", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "someone@test.com" });

    expect(res.status).not.toBe(429);
  });

  test("should return 429 after exceeding 5 requests per hour from same IP", async () => {
    let lastRes;
    for (let i = 0; i < 6; i++) {
      lastRes = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: `someone${i}@test.com` });
    }

    expect(lastRes!.status).toBe(429);
    expect(lastRes!.body.error).toContain("password");
  });

  test("should include Retry-After header on 429", async () => {
    let lastRes;
    for (let i = 0; i < 6; i++) {
      lastRes = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: `someone${i}@test.com` });
    }

    expect(lastRes!.headers["retry-after"]).toBeDefined();
  });

  test("should recover after store reset", async () => {
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: `someone${i}@test.com` });
    }

    resetRateLimitStores();

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "fresh@test.com" });

    expect(res.status).not.toBe(429);
  });
});

// ── Route 3: Anonymous Upload (per-IP, 15 min window) ─────────────────────

describe("Rate Limiting — POST /api/upload/ (anonymous IP limit)", () => {
  test("should allow anonymous requests under the limit", async () => {
    const res = await request(app)
      .post("/api/upload/")
      .set("Authorization", `Bearer ${authToken}`)
      .set("x-user-id", "anonymous");

    expect(res.status).not.toBe(429);
  });

  test("should return 429 after exceeding 20 requests per 15 min from same IP", async () => {
    let lastRes;
    for (let i = 0; i < 21; i++) {
      lastRes = await request(app)
        .post("/api/upload/")
        .set("Authorization", `Bearer ${authToken}`)
        .set("x-user-id", "anonymous");
    }

    expect(lastRes!.status).toBe(429);
    expect(lastRes!.body.error).toContain("Too many requests");
  });

  test("should include Retry-After header on 429 for upload limit", async () => {
    let lastRes;
    for (let i = 0; i < 21; i++) {
      lastRes = await request(app)
        .post("/api/upload/")
        .set("Authorization", `Bearer ${authToken}`)
        .set("x-user-id", "anonymous");
    }

    expect(lastRes!.status).toBe(429);
    if (lastRes!.headers["retry-after"]) {
      expect(Number(lastRes!.headers["retry-after"])).toBeGreaterThan(0);
    } else {
      expect(lastRes!.body.retryAfter).toBeGreaterThan(0);
    }
  });

  test("should recover after store reset", async () => {
    for (let i = 0; i < 21; i++) {
      await request(app)
        .post("/api/upload/")
        .set("Authorization", `Bearer ${authToken}`)
        .set("x-user-id", "anonymous");
    }

    resetRateLimitStores();

    const res = await request(app)
      .post("/api/upload/")
      .set("Authorization", `Bearer ${authToken}`)
      .set("x-user-id", "anonymous");

    expect(res.status).not.toBe(429);
  });

  test("should NOT rate limit authenticated (non-anonymous) requests", async () => {
    let lastRes;
    for (let i = 0; i < 21; i++) {
      lastRes = await request(app)
        .post("/api/upload/")
        .set("Authorization", `Bearer ${authToken}`)
        .set("x-user-id", userId);
    }

    expect(lastRes!.status).not.toBe(429);
  });
});
