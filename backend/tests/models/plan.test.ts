import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";
import { Plan } from "../../src/models/plan.model.js";

import { MongoMemoryServer } from "mongodb-memory-server";

jest.setTimeout(60000);

describe("Plan Model Validation Tests", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    mongoose.set("bufferCommands", false);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (typeof mongoServer !== "undefined") {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Plan.deleteMany({});
    await Plan.init();
  });

  test("should successfully save a valid plan", async () => {
    const validPlan = new Plan({
      name: "Standard Premium",
      slug: "standard-premium",
      price: 19.99,
      billingCycle: "monthly",
      features: ["feature 1", "feature 2"],
      analysisLimit: 50,
      storageLimit: 100,
      isActive: true,
    });

    const savedPlan = await validPlan.save();
    expect(savedPlan._id).toBeDefined();
    expect(savedPlan.name).toBe("Standard Premium");
    expect(savedPlan.slug).toBe("standard-premium");
    expect(savedPlan.price).toBe(19.99);
    expect(savedPlan.billingCycle).toBe("monthly");
    expect(savedPlan.features).toContain("feature 1");
    expect(savedPlan.analysisLimit).toBe(50);
    expect(savedPlan.storageLimit).toBe(100);
    expect(savedPlan.isActive).toBe(true);
  });

  test("should allow null/optional price (e.g. for custom pricing)", async () => {
    const customPlan = new Plan({
      name: "Custom Enterprise",
      slug: "custom-enterprise",
      price: null,
      billingCycle: "monthly",
      features: ["custom support"],
      analysisLimit: -1,
      storageLimit: -1,
    });

    const savedPlan = await customPlan.save();
    expect(savedPlan._id).toBeDefined();
    expect(savedPlan.price).toBeNull();
  });

  test("should reject missing required fields", async () => {
    const invalidPlan = new Plan({
      name: "No Slug Plan",
      // missing slug, billingCycle, analysisLimit, storageLimit
    });

    await expect(invalidPlan.save()).rejects.toThrow();
  });

  test("should enforce unique slug", async () => {
    const plan1 = new Plan({
      name: "First Plan",
      slug: "duplicate-slug",
      billingCycle: "monthly",
      analysisLimit: 5,
      storageLimit: 5,
    });

    await plan1.save();

    const plan2 = new Plan({
      name: "Second Plan",
      slug: "duplicate-slug",
      billingCycle: "monthly",
      analysisLimit: 10,
      storageLimit: 10,
    });

    await expect(plan2.save()).rejects.toThrow();
  });

  test("should enforce lowercase slug", async () => {
    const plan = new Plan({
      name: "UPPERCASE SLUG",
      slug: "UPPER-CASE",
      billingCycle: "monthly",
      analysisLimit: 5,
      storageLimit: 5,
    });

    const saved = await plan.save();
    expect(saved.slug).toBe("upper-case");
  });
});
