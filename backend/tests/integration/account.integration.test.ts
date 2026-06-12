import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import { config } from "dotenv";
import { User } from "../../src/models/user.model.js";
import bcrypt from "bcryptjs";

config();

let app: any;

jest.setTimeout(30000);

describe("Account Profile & Settings API", () => {
  let authToken: string;
  let testUserId: string;

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

    // Create a test user and login to get token
    const res = await request(app).post("/api/auth/register").send({
      name: "Account Test User",
      email: "account-test@example.com",
      password: "StrongPass123!",
    });

    authToken = res.body.data.token;
    
    const user = await User.findOne({ email: "account-test@example.com" });
    testUserId = String(user?._id);
  });

  test("GET /api/account/profile returns user profile", async () => {
    const res = await request(app)
      .get("/api/account/profile")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Account Test User");
    expect(res.body.data.email).toBe("account-test@example.com");
    expect(res.body.data.plan).toBe("free");
    expect(res.body.data.memberSince).toBeDefined();
  });

  test("PATCH /api/account/profile updates name and email", async () => {
    const res = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Updated Name",
        email: "updated-email@example.com",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Updated Name");
    expect(res.body.data.email).toBe("updated-email@example.com");

    const userInDb = await User.findById(testUserId);
    expect(userInDb?.name).toBe("Updated Name");
    expect(userInDb?.email).toBe("updated-email@example.com");
  });

  test("PATCH /api/account/profile rejects duplicate email", async () => {
    // Create another user
    await request(app).post("/api/auth/register").send({
      name: "Another User",
      email: "another@example.com",
      password: "StrongPass123!",
    });

    const res = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        email: "another@example.com",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test("PATCH /api/account/profile rejects invalid email", async () => {
    const res = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        email: "not-an-email",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("PATCH /api/account/profile allows password change with correct current password", async () => {
    const res = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        password: "NewStrongPass123!",
        currentPassword: "StrongPass123!",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const userInDb = await User.findById(testUserId).select("+passwordHash");
    const isMatch = await bcrypt.compare("NewStrongPass123!", userInDb?.passwordHash || "");
    expect(isMatch).toBe(true);
  });

  test("PATCH /api/account/profile rejects password change without current password", async () => {
    const res = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        password: "NewStrongPass123!",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("PATCH /api/account/profile rejects password change with incorrect current password", async () => {
    const res = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        password: "NewStrongPass123!",
        currentPassword: "WrongPass123!",
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test("PATCH /api/account/profile rejects password that doesn't meet criteria", async () => {
    const res = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        password: "short",
        currentPassword: "StrongPass123!",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("DELETE /api/account soft deletes the account", async () => {
    const res = await request(app)
      .delete("/api/account")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const userInDb = await User.findById(testUserId);
    expect(userInDb?.status).toBe("deleted");
    expect(userInDb?.email).toBe("account-test@example.com"); // Preserves data
  });

  test("GET /api/account/profile returns 401 for deleted account", async () => {
    await request(app)
      .delete("/api/account")
      .set("Authorization", `Bearer ${authToken}`);

    const res = await request(app)
      .get("/api/account/profile")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("Requires authentication for all routes", async () => {
    let res = await request(app).get("/api/account/profile");
    expect(res.status).toBe(401);

    res = await request(app).patch("/api/account/profile").send({ name: "Test" });
    expect(res.status).toBe(401);

    res = await request(app).delete("/api/account");
    expect(res.status).toBe(401);
  });
});
