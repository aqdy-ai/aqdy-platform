import { Worker } from "bullmq";
import { getRedisConnection } from "../config/redis.config.js";
import { orchestratorService } from "../pipeline/orchestrator.service.js";
import { analysisService } from "../services/analysis.service.js";
import { creditsService } from "../services/credits.service.js";
import { auditLogService } from "../services/auditLog.service.js";
import { judgeService } from "../services/judge.service.js";
import { metrics } from "../utils/metrics.js";
import { logger } from "../utils/logger.js";
import type { AnalysisPayload } from "./analysis.queue.js";

const redisConnection = getRedisConnection();

async function processAnalysisJob(job: { data: AnalysisPayload }): Promise<void> {
  const { contractId, userId, text, language, userEmail, ipAddress, userAgent, requestId } = job.data;
  const startTime = Date.now();

  logger.info("BullMQ worker: starting analysis", {
    contractId,
    jobId: job.data.contractId,
  });

  const result = await orchestratorService.run(
    contractId,
    userId,
    text,
    language,
  );

  const duration = Date.now() - startTime;

  metrics.increment("analyses_completed");
  metrics.observe("analysis_duration_ms", duration);

  const analysis = await analysisService.saveAnalysis({
    contractId,
    userId,
    executiveSummary: result.executiveSummary,
    clauseAnalysis: result.clauseAnalysis,
    analysisDuration: duration,
  });

  // Fire-and-forget: judge evaluation
  judgeService.evaluateAnalysis(analysis).catch((err) =>
    logger.error("Judge evaluation failed", {
      error: err instanceof Error ? err.message : String(err),
      analysisId: analysis._id?.toString(),
    }),
  );

  // Credits deduction
  try {
    const combinedTokens = result.tokensUsed ?? 0;
    const inputTokens = Math.round(combinedTokens * 0.7);
    const outputTokens = Math.round(combinedTokens * 0.3);
    const actualCost = Math.max(
      1,
      creditsService.calculateAnalysisCost(inputTokens, outputTokens),
    );
    await creditsService.deduct(userId, actualCost, {
      tokensUsed: combinedTokens,
      contractId,
    });
    logger.info("Credits deducted after analysis", {
      userId,
      contractId,
      combinedTokens,
      actualCost,
    });
  } catch (creditError) {
    logger.error("Credit deduction failed", {
      userId,
      contractId,
      error: creditError instanceof Error ? creditError.message : String(creditError),
    });
  }

  await auditLogService.logEvent({
    contractId,
    userId,
    action: "ANALYSIS_COMPLETED",
    outcome: "success",
    userEmail,
    ipAddress,
    userAgent,
    requestId,
    metadata: {
      totalClauses: result.executiveSummary.totalClauses,
      durationMs: duration,
      modelUsed: result.extractionMeta.modelUsed,
      usedFallback: result.extractionMeta.usedFallback,
      tokensUsed: result.tokensUsed,
    },
  });

  logger.info("BullMQ worker: analysis complete", { contractId, durationMs: duration });
}

export const analysisWorker = new Worker<AnalysisPayload>(
  "analysis",
  processAnalysisJob,
  {
    connection: redisConnection,
    concurrency: 3,
    lockDuration: 300000,
    maxStalledCount: 2,
  },
);

analysisWorker.on("completed", (job) => {
  logger.info("BullMQ job completed", {
    jobId: job.id,
    contractId: job.data.contractId,
  });
});

analysisWorker.on("failed", (job, error) => {
  if (!job) return;
  logger.error("BullMQ job failed", {
    jobId: job.id,
    contractId: job.data.contractId,
    error: error.message,
    attempts: job.attemptsMade,
  });

  auditLogService.logEvent({
    contractId: job.data.contractId,
    userId: job.data.userId,
    action: "ANALYSIS_FAILED",
    outcome: "failure",
    userEmail: job.data.userEmail,
    ipAddress: job.data.ipAddress,
    userAgent: job.data.userAgent,
    requestId: job.data.requestId,
    metadata: { error: error.message },
  }).catch((err) => {
    logger.error("Failed to log ANALYSIS_FAILED audit event", {
      error: err instanceof Error ? err.message : String(err),
    });
  });
});

analysisWorker.on("error", (error) => {
  logger.error("BullMQ worker error", {
    error: error.message,
  });
});

export async function closeAnalysisWorker(): Promise<void> {
  try {
    await analysisWorker.close();
    logger.info("Analysis worker closed");
  } catch (error) {
    logger.error("Error closing analysis worker", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
