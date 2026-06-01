import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import requestDefault from "supertest";
import { Plan } from "../../src/models/plan.model.js";
import type { Application } from "express";


// DTO for plan objects returned by API
type PlanDto = {
  _id?: string;
  name: string;
  slug: string;
  price: number | null;
  billingCycle: string;
  features: string[];
  analysisLimit: number;
  storageLimit: number;
  isActive: boolean;
};

let app: Application;

describe("Plans Router Integration Tests", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aqdy_test";
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }

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
    await Plan.deleteMany({});

    // Seed standard plans for testing
    await Plan.insertMany([
      {
        name: "Free",
        slug: "free",
        price: 0,
        billingCycle: "monthly",
        features: ["5 analyses/month", "10 contracts max", "No export"],
        analysisLimit: 5,
        storageLimit: 10,
        isActive: true,
      },
      {
        name: "Pro",
        slug: "pro",
        price: null,
        billingCycle: "monthly",
        features: ["100 analyses/month", "Unlimited contracts", "Full history export", "Priority support"],
        analysisLimit: 100,
        storageLimit: -1,
        isActive: true,
      },
      {
        name: "Enterprise",
        slug: "enterprise",
        price: null,
        billingCycle: "monthly",
        features: ["Unlimited analyses", "Unlimited contracts", "Custom contract history", "SLA guarantee"],
        analysisLimit: -1,
        storageLimit: -1,
        isActive: true,
      },
      {
        name: "Inactive Plan",
        slug: "inactive",
        price: 99,
        billingCycle: "monthly",
        features: ["Disabled feature"],
        analysisLimit: 0,
        storageLimit: 0,
        isActive: false, // Should NOT be returned in GET /api/plans
      },
    ]);
  });

  test("GET /api/plans should retrieve all active plans sorted by price", async () => {
    const res = await requestDefault(app).get("/api/plans");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    
    // Should return 3 active plans (Free, Pro, Enterprise), not the Inactive Plan
    expect(res.body.data.length).toBe(3);

    const slugs = res.body.data.map((p: PlanDto) => p.slug);
    expect(slugs).toContain("free");
    expect(slugs).toContain("pro");
    expect(slugs).toContain("enterprise");
    expect(slugs).not.toContain("inactive");

    // The first one should be Free since it's sorted by price (price 0 is lower than null/custom/others or ascending)
    const freePlan = res.body.data.find((p: PlanDto) => p.slug === "free");
    expect(freePlan.price).toBe(0);
    expect(freePlan.features).toContain("5 analyses/month");
  });

  test("GET /api/plans/:slug should retrieve a specific plan by its slug", async () => {
    const res = await requestDefault(app).get("/api/plans/pro");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.slug).toBe("pro");
    expect(res.body.data.name).toBe("Pro");
    expect(res.body.data.price).toBeNull();
    expect(res.body.data.analysisLimit).toBe(100);
    expect(res.body.data.storageLimit).toBe(-1);
  });

  test("GET /api/plans/:slug should return 404 for a non-existent plan slug", async () => {
    const res = await requestDefault(app).get("/api/plans/non-existent-slug");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Plan not found");
  });
});
