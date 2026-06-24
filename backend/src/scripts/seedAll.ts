import mongoose from "mongoose";
import connectDB from "../config/database.js";
import {
  seedKnowledgeBase,
  seedAgentPrompts,
} from "../services/seed.service.js";
import { logger } from "../utils/logger.js";

const run = async () => {
  try {
    logger.info("🌱 Running all seeds...");
    await connectDB();

    await seedKnowledgeBase();
    await seedAgentPrompts();

    logger.info(
      "📋 KB and prompts seeded. To seed plans, run: npm run seed:plans",
    );
    logger.info("📋 To seed payments, run: npm run seed:payments");

    await mongoose.disconnect();
    logger.info("✅ All seeding complete.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Seeding failed:", error as object);
    process.exit(1);
  }
};

run();
