import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) throw new Error("MONGODB_URI not defined");

    const conn = await mongoose.connect(mongoURI);
    logger.info(
      `✅ MongoDB connected successfully to: ${conn.connection.host}/${conn.connection.name}`,
    );
  } catch (error) {
    logger.error("❌ MongoDB connection failed:", error as object);
    process.exit(1);
  }
};

export default connectDB;
