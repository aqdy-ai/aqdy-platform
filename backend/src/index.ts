import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";
import { env } from "./config/env.js";
import { httpLogger, logger } from "./utils/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { responseTimeMiddleware } from "./middlewares/responseTime.middleware.js";
import {
  initializeLangfuse,
  flushLangfuseTraces,
} from "./config/langfuse.config.js";
import healthRouter from "./routes/health.route.js";
import contractRouter from "./routes/contract.route.js";
import authRouter from "./routes/auth.route.js";
import accountRouter from "./routes/account.route.js";
import analysisRouter from "./routes/analysis.route.js";
import connectDB from "./config/database.js";
import uploadRouter from "./routes/upload.route.js";
import metricsRouter from "./routes/metrics.route.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.config.js";
import requestIdMiddleware from "./middleware/requestId.middleware.js";
import auditLogsRouter from "./routes/auditLogs.route.js";
import plansRouter from "./routes/plans.route.js";

// Initialize Langfuse observability
initializeLangfuse();

// Initialize Database
connectDB();

const app: Application = express();

// ── Middlewares ──────────────────────────────────
app.use(requestIdMiddleware);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(responseTimeMiddleware());
app.use(httpLogger);

// ── Routes ───────────────────────────────────────
app.use("/api", healthRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/auth", authRouter);
app.use("/api/account", accountRouter);
app.use("/api/contracts", contractRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/admin/audit-logs", auditLogsRouter);
app.use("/api/plans", plansRouter);

// Use Swagger UI
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/metrics", metricsRouter);

// ── Error Handler ────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────
const PORT = parseInt(env.PORT, 10);

let server: import('http').Server | undefined;
if (env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    logger.info(`🚀 Aqdy backend running on port ${PORT} [${env.NODE_ENV}]`);
  });
}

// ── Graceful Shutdown ────────────────────────────
const gracefulShutdown = async () => {
  logger.info("Shutting down gracefully...");

  // Flush Langfuse traces
  await flushLangfuseTraces();

  // Close server if it was started
  if (server && typeof server.close === "function") {
    server.close(() => {
      logger.info("✓ Server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Timeout if shutdown takes too long
  setTimeout(() => {
    logger.error("Force exiting after 10 seconds");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

export default app;
