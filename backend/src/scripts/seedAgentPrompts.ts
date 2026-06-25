import mongoose from "mongoose";
import connectDB from "../config/database.js";
import { seedAgentPrompts } from "../services/seed.service.js";
import { logger } from "../utils/logger.js";

const run = async () => {
  try {
    logger.info("🌱 Starting AgentPrompt seeding...");
    await connectDB();
    await seedAgentPrompts();
    await mongoose.disconnect();
    logger.info("✅ AgentPrompt seeding complete.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ AgentPrompt seeding failed:", error as object);
    process.exit(1);
  }
};

run();
