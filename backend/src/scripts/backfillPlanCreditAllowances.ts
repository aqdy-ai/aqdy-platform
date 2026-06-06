import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/database.js";
import { Plan } from "../models/plan.model.js";
import { logger } from "../utils/logger.js";

dotenv.config();

const planAllowances: Record<string, number> = {
  free: 500,
  pro: 5000,
  enterprise: 50000,
};

const backfillPlanCreditAllowances = async () => {
  try {
    logger.info("🌱 Starting plan credit allowance backfill...");

    await connectDB();

    const plans = await Plan.find({});
    if (!plans.length) {
      logger.warn("No plans found in the database.");
      await mongoose.disconnect();
      process.exit(0);
    }

    for (const plan of plans) {
      if (plan.creditAllowance === undefined || plan.creditAllowance === null) {
        const allowance = planAllowances[plan.slug] ?? 0;
        plan.creditAllowance = allowance;
        await plan.save();
        logger.info(
          `Updated ${plan.slug} plan creditAllowance to ${allowance}.`,
        );
      }
    }

    await mongoose.disconnect();
    logger.info("✅ Plan credit allowance backfill complete.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Plan credit allowance backfill failed:", error as object);
    process.exit(1);
  }
};

backfillPlanCreditAllowances();
