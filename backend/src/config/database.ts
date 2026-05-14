import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) throw new Error("MONGODB_URI not defined");

    await mongoose.connect(mongoURI);
    logger.info("✅ MongoDB connected successfully");
  } catch (error) {
    logger.error("❌ MongoDB connection failed:", error as object);
    process.exit(1);
  }
};

export default connectDB;
