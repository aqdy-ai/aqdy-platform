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
    features: ["300 credits included", "10 contracts max", "No export"],
    analysisLimit: 5,
    storageLimit: 10,
    creditAllowance: 300,
    isActive: true,
  },
  {
    name: "Pro",
    slug: "pro",
    price: null, // Price is TBD
    billingCycle: "monthly" as const,
    features: [
      "4,000 credits/month",
      "Unlimited contracts",
      "Full history export",
      "Priority support",
    ],
    analysisLimit: 100,
    storageLimit: -1, // -1 means unlimited
    creditAllowance: 4000,
    isActive: true,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    price: null, // Custom pricing
    billingCycle: "monthly" as const,
    features: [
      "40,000 credits/month",
      "Unlimited contracts",
      "Custom contract history",
      "SLA guarantee",
    ],
    analysisLimit: -1, // -1 means unlimited
    storageLimit: -1, // -1 means unlimited
    creditAllowance: 40000,
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
