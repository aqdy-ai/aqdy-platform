import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { metrics } from "../utils/metrics.js";

export const responseTimeMiddleware = (
  headerName = "X-Response-Time",
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = process.hrtime.bigint();

    const onFinish = () => {
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const durationMs = Math.round(elapsedMs * 100) / 100;

      // Headers may already be sent at this point; guard before setting
      if (!res.headersSent) {
        res.setHeader(headerName, `${durationMs}ms`);
      }

      logger.info("API response time", {
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
        userAgent: req.headers["user-agent"],
        query: req.query,
      });
      // record metrics
      metrics.increment("http_requests_total");
      metrics.increment(`http_requests_${req.method.toLowerCase()}_total`);
      metrics.observe("http_response_time_ms", durationMs);
      metrics.observe(
        `http_response_time_ms_${req.method.toLowerCase()}`,
        durationMs,
      );
    };

    // Use `once` to prevent double-firing when both "finish" and "close" fire
    res.once("finish", onFinish);

    next();
  };
};
