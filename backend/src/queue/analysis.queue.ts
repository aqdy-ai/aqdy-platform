import { Queue } from "bullmq";
import { getRedisConnection } from "../config/redis.config.js";
import { logger } from "../utils/logger.js";

export interface AnalysisPayload {
  contractId: string;
  userId: string;
  text: string;
  language: "ar" | "en";
  userEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

const redisConnection = getRedisConnection();

export const analysisQueue = new Queue<AnalysisPayload>("analysis", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export async function closeAnalysisQueue(): Promise<void> {
  try {
    await analysisQueue.close();
    logger.info("Analysis queue closed");
  } catch (error) {
    logger.error("Error closing analysis queue", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
