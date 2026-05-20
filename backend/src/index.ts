import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";
import { env } from "./config/env.js";
import { httpLogger } from "./utils/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import healthRouter from "./routes/health.route.js";
import contractRouter from "./routes/contract.route.js";
import analysisRouter from "./routes/analysis.route.js";
import connectDB from "./config/database.js";
import uploadRouter from "./routes/upload.route.js";

// Initialize Database
connectDB();

const app: Application = express();

// ── Middlewares ──────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);

// ── Routes ───────────────────────────────────────
app.use("/api", healthRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/contracts", contractRouter);
app.use("/api/analysis", analysisRouter);

// ── Error Handler ────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────
const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
  console.log(`🚀 Aqdy backend running on port ${PORT} [${env.NODE_ENV}]`);
});

export default app;
