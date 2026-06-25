import mongoose from "mongoose";
import connectDB from "../config/database.js";
import { seedKnowledgeBase } from "../services/seed.service.js";
import { logger } from "../utils/logger.js";

const run = async () => {
  try {
    logger.info("🌱 Starting KnowledgeBase seeding...");
    await connectDB();
    await seedKnowledgeBase();
    await mongoose.disconnect();
    logger.info("✅ KnowledgeBase seeding complete.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ KnowledgeBase seeding failed:", error as object);
    process.exit(1);
  }
};

run();
