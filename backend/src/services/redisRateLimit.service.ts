import IORedis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

let redis: IORedis | null = null;

function getRedis(): IORedis {
  if (!redis) {
    redis = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      logger.error("Redis rate limiter error", {
        error: err.message,
      });
    });
  }
  return redis;
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  try {
    const client = getRedis();
    if (!client.status || client.status === "end" || client.status === "close") {
      await client.connect();
    }

    const now = Date.now();
    const windowKey = Math.floor(now / windowMs);
    const redisKey = `ratelimit:${key}:${windowKey}`;

    const current = await client.incr(redisKey);

    if (current === 1) {
      await client.pexpire(redisKey, windowMs);
    }

    const ttl = await client.pttl(redisKey);
    const resetAt = now + (ttl > 0 ? ttl : windowMs);

    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
      resetAt,
    };
  } catch (error) {
    logger.warn("Redis rate limit check failed, allowing request", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return { allowed: true, remaining: 1, resetAt: Date.now() + windowMs };
  }
}

export async function closeRateLimitRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
      logger.info("Rate limit Redis connection closed");
    } catch (error) {
      logger.error("Error closing rate limit Redis", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    redis = null;
  }
}
