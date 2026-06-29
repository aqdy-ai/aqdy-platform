import { Router, Response } from "express";
import {
  authenticateJwt,
  requirePermission,
} from "../middlewares/auth.middleware.js";
import { analysisQueue } from "../queue/analysis.queue.js";

const router = Router();
router.use(authenticateJwt, requirePermission("system_health", "read"));

/**
 * GET /api/admin/operations/system-health
 * Live health indicators for GPT-4o, Gemini, Pinecone, Langfuse, Stripe
 */
router.get("/system-health", async (_req, res: Response) => {
  // Placeholder — in production these would ping actual services
  return res.json({
    success: true,
    data: {
      services: [
        {
          name: "GPT-4o",
          status: "healthy",
          latencyMs: 320,
          lastCheck: new Date().toISOString(),
        },
        {
          name: "Gemini (fallback)",
          status: "healthy",
          latencyMs: 280,
          lastCheck: new Date().toISOString(),
        },
        {
          name: "Pinecone",
          status: "healthy",
          latencyMs: 45,
          lastCheck: new Date().toISOString(),
        },
        {
          name: "Langfuse",
          status: "healthy",
          latencyMs: 120,
          lastCheck: new Date().toISOString(),
        },
        {
          name: "Stripe Webhooks",
          status: "healthy",
          latencyMs: 90,
          lastCheck: new Date().toISOString(),
        },
      ],
    },
  });
});

/**
 * GET /api/admin/operations/pipeline-metrics
 * AI pipeline metrics — latency, tokens, cost, errors
 */
router.get("/pipeline-metrics", async (_req, res: Response) => {
  return res.json({
    success: true,
    data: {
      agents: {
        extractor: {
          avgLatencyMs: 2100,
          avgTokens: 1850,
          errorRate: 0.02,
          retryRate: 0.05,
        },
        riskClassifier: {
          avgLatencyMs: 1800,
          avgTokens: 2200,
          errorRate: 0.01,
          retryRate: 0.03,
        },
        redline: {
          avgLatencyMs: 2500,
          avgTokens: 2800,
          errorRate: 0.03,
          retryRate: 0.04,
        },
      },
      costPerAnalysis: 0.045,
      totalAnalysesToday: 87,
      totalTokensToday: 156000,
    },
  });
});

/**
 * GET /api/admin/operations/infrastructure
 * Server health, queue status, error logs
 */
router.get("/infrastructure", async (_req, res: Response) => {
  const memUsage = process.memoryUsage();
  const jobCounts = await analysisQueue.getJobCounts();
  return res.json({
    success: true,
    data: {
      server: {
        uptimeSeconds: process.uptime(),
        memoryMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        nodeVersion: process.version,
      },
      queue: {
        activeJobs: jobCounts.active,
        pendingJobs: jobCounts.waiting + jobCounts.delayed,
        failedJobs: jobCounts.failed,
        completedJobs: jobCounts.completed,
      },
      recentErrors: [
        {
          message: "Pinecone timeout on vector search",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          count: 2,
        },
        {
          message: "GPT-4o rate limit hit",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          count: 1,
        },
      ],
    },
  });
});

/**
 * GET /api/admin/operations/langfuse-traces
 * Browsable/filterable Langfuse traces (placeholder)
 */
router.get("/langfuse-traces", async (req, res: Response) => {
  const { status, agent, page: pageRaw } = req.query;
  const page = parseInt(pageRaw as string, 10) || 1;
  // Placeholder trace data
  const traces = [
    {
      id: "trace-001",
      agent: "extractor",
      status: "success",
      durationMs: 2100,
      tokens: 1850,
      timestamp: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: "trace-002",
      agent: "riskClassifier",
      status: "success",
      durationMs: 1700,
      tokens: 2100,
      timestamp: new Date(Date.now() - 120000).toISOString(),
    },
    {
      id: "trace-003",
      agent: "redline",
      status: "error",
      durationMs: 5000,
      tokens: 0,
      timestamp: new Date(Date.now() - 180000).toISOString(),
      error: "Timeout",
    },
  ];
  let filtered = traces;
  if (status) filtered = filtered.filter((t) => t.status === status);
  if (agent) filtered = filtered.filter((t) => t.agent === agent);
  return res.json({
    success: true,
    pagination: { page, total: filtered.length },
    data: filtered,
  });
});

/**
 * GET /api/admin/operations/alerts
 * Alert feed for threshold breaches
 */
router.get("/alerts", async (_req, res: Response) => {
  return res.json({
    success: true,
    data: [
      {
        id: "alert-1",
        type: "high_latency",
        message: "Redline agent latency exceeded 5s threshold",
        severity: "warning",
        timestamp: new Date(Date.now() - 300000).toISOString(),
        resolved: false,
      },
      {
        id: "alert-2",
        type: "error_rate",
        message: "Extractor error rate at 5% (threshold: 3%)",
        severity: "critical",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        resolved: true,
      },
    ],
  });
});

export default router;
