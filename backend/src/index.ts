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
import analysisRouter from "./routes/analysis.route.js";
import connectDB from "./config/database.js";
import uploadRouter from "./routes/upload.route.js";
import metricsRouter from "./routes/metrics.route.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.config.js";

// Initialize Langfuse observability
initializeLangfuse();

// Initialize Database
connectDB();

const app: Application = express();

// ── Middlewares ──────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(responseTimeMiddleware());
app.use(httpLogger);

// ── Routes ───────────────────────────────────────
app.use("/api", healthRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/contracts", contractRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/metrics", metricsRouter);

// Use Swagger UI
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Error Handler ────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────
const PORT = parseInt(env.PORT, 10);

const server = app.listen(PORT, () => {
  logger.info(`🚀 Aqdy backend running on port ${PORT} [${env.NODE_ENV}]`);
});

// ── Graceful Shutdown ────────────────────────────
const gracefulShutdown = async () => {
  logger.info("Shutting down gracefully...");

  // Flush Langfuse traces
  await flushLangfuseTraces();

  // Close server
  server.close(() => {
    logger.info("✓ Server closed");
    process.exit(0);
  });

  // Timeout if shutdown takes too long
  setTimeout(() => {
    logger.error("Force exiting after 10 seconds");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

export default app;
