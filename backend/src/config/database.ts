import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = env.MONGODB_URI;

    const conn = await mongoose.connect(mongoURI);
    logger.info(
      `✅ MongoDB connected successfully to: ${conn.connection.host}/${conn.connection.name}`,
    );
  } catch (error) {
    logger.error("❌ MongoDB connection failed:", error as object);
    throw error;
  }
};

export default connectDB;
