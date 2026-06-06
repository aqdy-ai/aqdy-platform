import mongoose from "mongoose";
import dotenv from "dotenv";
import { Plan } from "../models/plan.model.js";
import connectDB from "../config/database.js";
import { logger } from "../utils/logger.js";

dotenv.config();

const plansData = [
  {
    name: "Free",
    slug: "free",
    price: 0,
    billingCycle: "monthly" as const,
    features: ["5 analyses/month", "10 contracts max", "No export"],
    analysisLimit: 5,
    storageLimit: 10,
    creditAllowance: 500,
    isActive: true,
  },
  {
    name: "Pro",
    slug: "pro",
    price: null, // Price is TBD
    billingCycle: "monthly" as const,
    features: [
      "100 analyses/month",
      "Unlimited contracts",
      "Full history export",
      "Priority support",
    ],
    analysisLimit: 100,
    storageLimit: -1, // -1 means unlimited
    creditAllowance: 5000,
    isActive: true,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    price: null, // Custom pricing
    billingCycle: "monthly" as const,
    features: [
      "Unlimited analyses",
      "Unlimited contracts",
      "Custom contract history",
      "SLA guarantee",
    ],
    analysisLimit: -1, // -1 means unlimited
    storageLimit: -1, // -1 means unlimited
    creditAllowance: 50000,
    isActive: true,
  },
];

const seedPlans = async () => {
  try {
    logger.info("🌱 Starting Pricing Plans seeding...");

    // Connect to database
    await connectDB();

    // Clear existing plans
    logger.info("Cleaning up existing plans...");
    await Plan.deleteMany({});

    // Seed new plans
    logger.info(`Seeding ${plansData.length} plans...`);
    const inserted = await Plan.insertMany(plansData);

    logger.info(`✅ Successfully seeded ${inserted.length} plans!`);

    // Disconnect
    await mongoose.disconnect();
    logger.info("🔌 Disconnected from database.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Seeding failed:", error as object);
    process.exit(1);
  }
};

seedPlans();
