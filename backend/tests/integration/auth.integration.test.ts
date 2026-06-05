import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { User } from "../../src/models/user.model.js";

config();

let app: unknown;

jest.setTimeout(30000);

describe("Authentication routes", () => {
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
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  test("POST /api/auth/register creates a new user with hashed password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "auth-test@example.com",
      password: "StrongPass123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("auth-test@example.com");
    const setCookies = res.headers["set-cookie"] || [];
    expect(setCookies.some((c: string) => c.startsWith("accessToken="))).toBe(true);
    expect(setCookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);

    const user = await User.findOne({ email: "auth-test@example.com" }).select(
      "+passwordHash",
    );
    expect(user).toBeTruthy();
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe("StrongPass123!");
  });

  test("POST /api/auth/login returns a JWT for valid credentials", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Login User",
      email: "login-test@example.com",
      password: "StrongPass123!",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "login-test@example.com",
      password: "StrongPass123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const loginCookies = res.headers["set-cookie"] || [];
    expect(loginCookies.some((c: string) => c.startsWith("accessToken="))).toBe(true);
    expect(loginCookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
    expect(res.body.data.user.email).toBe("login-test@example.com");
  });

  test("POST /api/auth/register rejects duplicate email with 409", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Duplicate User",
      email: "duplicate@example.com",
      password: "StrongPass123!",
    });

    const res = await request(app).post("/api/auth/register").send({
      name: "Duplicate User 2",
      email: "duplicate@example.com",
      password: "StrongPass123!",
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test("POST /api/auth/register rejects names shorter than 3 characters with 400", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Jo",
      email: "shortname@example.com",
      password: "StrongPass123!",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /api/auth/register rejects missing fields with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "no-name@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /api/auth/login rejects missing fields with 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "no-password@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /api/auth/login rejects wrong password with 401", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Wrong Password",
      email: "wrong.password@example.com",
      password: "StrongPass123!",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "wrong.password@example.com",
      password: "BadPass987!",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("GET /api/auth/me rejects missing token with 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("GET /api/auth/me rejects invalid token with 401", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.token.value");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("GET /api/auth/me rejects expired token with 401", async () => {
    const expired = jwt.sign(
      { sub: "000000000000000000000000", email: "expired@example.com", role: "user", plan: "free" },
      process.env.JWT_SECRET!,
      { expiresIn: -10 },
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("POST /api/auth/refresh exchanges a valid refresh token for a new JWT", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Refresh User",
      email: "refresh.user@example.com",
      password: "StrongPass123!",
    });

    const getCookieValue = (res: request.Response, name: string) => {
      const setCookies = res.headers["set-cookie"] || [];
      for (const c of setCookies) {
        const match = c.match(new RegExp(`${name}=([^;]+)`));
        if (match) return match[1];
      }
      return undefined;
    };

    const oldRefresh = getCookieValue(registerRes as any, "refreshToken");

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refreshToken=${oldRefresh}`);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    const newRefresh = getCookieValue(refreshRes as any, "refreshToken");
    const newAccess = getCookieValue(refreshRes as any, "accessToken");
    expect(newAccess).toBeDefined();
    expect(newRefresh).toBeDefined();
    expect(newRefresh).not.toBe(oldRefresh);
  });

  test("POST /api/auth/logout invalidates the refresh token", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Logout User",
      email: "logout.user@example.com",
      password: "StrongPass123!",
    });

    const oldRefresh = (() => {
      const setCookies = registerRes.headers["set-cookie"] || [];
      for (const c of setCookies) {
        const m = c.match(/refreshToken=([^;]+)/);
        if (m) return m[1];
      }
      return undefined;
    })();

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `refreshToken=${oldRefresh}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refreshToken=${oldRefresh}`);

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.success).toBe(false);
  });

  test("GET /api/auth/me returns user info for valid token", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Profile User",
      email: "profile.user@example.com",
      password: "StrongPass123!",
    });

    const getCookieValue = (res: request.Response, name: string) => {
      const setCookies = res.headers["set-cookie"] || [];
      for (const c of setCookies) {
        const match = c.match(new RegExp(`${name}=([^;]+)`));
        if (match) return match[1];
      }
      return undefined;
    };

    const access = getCookieValue(registerRes as any, "accessToken");

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `accessToken=${access}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("profile.user@example.com");
  });
});
