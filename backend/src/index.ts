import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { httpLogger } from "./utils/logger";
import { errorHandler } from "./middlewares/errorHandler";
import healthRouter from "./routes/health.route";

const app: Application = express();

// ── Middlewares ──────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);

// ── Routes ───────────────────────────────────────
app.use("/api", healthRouter);

// ── Error Handler ────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────
const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
    console.log(`🚀 Aqdy backend running on port ${PORT} [${env.NODE_ENV}]`);
});

export default app;