import IORedis from "ioredis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

let redis: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (redis) {
    return redis;
  }

  const url = new URL(env.REDIS_URL);
  redis = new IORedis({
    host: url.hostname,
    port: parseInt(url.port || "6379", 10),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  redis.on("connect", () => {
    logger.info("Redis connected", { host: url.hostname, port: url.port || "6379" });
  });

  redis.on("error", (err) => {
    logger.error("Redis connection error", { error: err.message });
  });

  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
      logger.info("Redis connection closed");
    } catch (error) {
      logger.error("Error closing Redis", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    redis = null;
  }
}
