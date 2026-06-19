import { Request, Response, NextFunction } from "express";

// Forgot password specific rate limiting constants
const FORGOT_PASSWORD_LIMIT = 5; // max requests per hour per IP
const FORGOT_PASSWORD_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const FREE_TIER_DAILY_LIMIT = 10;
const ANONYMOUS_IP_REQUEST_LIMIT = 20;
const ANONYMOUS_IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const userDailyLimits = new Map<string, RateLimitEntry>();
const anonymousIpLimits = new Map<string, RateLimitEntry>();
// Separate store for forgot‑password limiter
const forgotPasswordLimits = new Map<string, RateLimitEntry>();

const getUtcDateKey = (now = Date.now()): string => {
  const date = new Date(now);
  return date.toISOString().slice(0, 10);
};

const getClientIp = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "unknown";
};

const getUserTier = (req: Request): string => {
  return String(req.headers["x-user-tier"] ?? "free").toLowerCase();
};

const shouldRateLimitAnonymousIp = (req: Request): boolean => {
  const userId = String(req.headers["x-user-id"] ?? "anonymous").trim();
  return userId === "anonymous" || userId === "";
};

const buildLimitResponse = (
  res: Response,
  statusCode: number,
  errorMessage: string,
  resetAt: number,
): void => {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((resetAt - Date.now()) / 1000),
  );
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    retryAfter: retryAfterSeconds,
  });
};

const ensureEntry = (
  store: Map<string, RateLimitEntry>,
  key: string,
  windowMs: number,
  resetAt: number,
): RateLimitEntry => {
  const existing = store.get(key);
  if (!existing || existing.resetAt <= Date.now()) {
    const entry: RateLimitEntry = { count: 0, resetAt };
    store.set(key, entry);
    return entry;
  }

  return existing;
};

export const userAnalysisRateLimit = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = String(req.body?.userId ?? "").trim();
    if (!userId) {
      return next();
    }

    if (getUserTier(req) !== "free") {
      return next();
    }

    const dateKey = getUtcDateKey();
    const limitKey = `${userId}:${dateKey}`;
    const resetAt = new Date(Date.now());
    resetAt.setUTCHours(24, 0, 0, 0);
    const entry = ensureEntry(
      userDailyLimits,
      limitKey,
      24 * 60 * 60 * 1000,
      resetAt.getTime(),
    );

    if (entry.count >= FREE_TIER_DAILY_LIMIT) {
      return buildLimitResponse(
        res,
        429,
        "Free tier daily analysis limit exceeded. You may retry after the window resets.",
        entry.resetAt,
      );
    }

    entry.count += 1;
    next();
  };
};

export const anonymousIpRateLimit = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!shouldRateLimitAnonymousIp(req)) {
      return next();
    }

    const ip = getClientIp(req);
    const resetAt = Date.now() + ANONYMOUS_IP_WINDOW_MS;
    const entry = ensureEntry(
      anonymousIpLimits,
      ip,
      ANONYMOUS_IP_WINDOW_MS,
      resetAt,
    );

    if (entry.count >= ANONYMOUS_IP_REQUEST_LIMIT) {
      return buildLimitResponse(
        res,
        429,
        "Too many requests from this IP address. Please try again later.",
        entry.resetAt,
      );
    }

    entry.count += 1;
    next();
  };
};

/**
 * Rate limiter for the POST /api/auth/forgot‑password endpoint.
 * Allows a maximum of 5 requests per hour per IP address to mitigate email flooding.
 */
export const forgotPasswordRateLimit = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!shouldRateLimitAnonymousIp(req)) {
      return next();
    }

    const ip = getClientIp(req);
    const resetAt = Date.now() + FORGOT_PASSWORD_WINDOW_MS;
    const entry = ensureEntry(
      forgotPasswordLimits,
      ip,
      FORGOT_PASSWORD_WINDOW_MS,
      resetAt,
    );

    if (entry.count >= FORGOT_PASSWORD_LIMIT) {
      return buildLimitResponse(
        res,
        429,
        "Too many password‑reset requests from this IP. Please try again later.",
        entry.resetAt,
      );
    }

    entry.count += 1;
    next();
  };
};


export const resetRateLimitStores = (): void => {
  userDailyLimits.clear();
  anonymousIpLimits.clear();
  forgotPasswordLimits.clear();
};
