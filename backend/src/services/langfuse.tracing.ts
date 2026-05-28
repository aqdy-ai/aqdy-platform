/**
 * Langfuse Tracing Wrapper — Wraps agent executions with detailed tracing.
 *
 * Provides utilities to wrap any agent function with:
 * - Automatic duration tracking
 * - Structured metadata logging
 * - Error tracking
 * - Langfuse integration
 */

import { logger } from "../utils/logger.js";
import { logAgentExecution, AgentTraceMetadata } from "../config/langfuse.config.js";

// ── Types ─────────────────────────────────────────

export interface TracedAgentOptions {
  agentName: "extractor" | "riskClassifier" | "redline";
  contractId: string;
  userId: string;
  language: "ar" | "en";
  clauseNumber?: number;
}

export interface TracedAgentResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  metadata: {
    agentName: string;
    contractId: string;
    timestamp: string;
  };
}

// ── Wrapper Functions ────────────────────────────

/**
 * Wraps an agent execution function with tracing and logging.
 *
 * Usage:
 *   const result = await traceAgent(
 *     () => extractorAgent.extract(text, language),
 *     { agentName: "extractor", contractId, userId, language }
 *   );
 *
 * @param fn - The async function to trace
 * @param options - Tracing metadata
 * @returns Traced result with duration and metadata
 */
export async function traceAgent<T>(
  fn: () => Promise<T>,
  options: TracedAgentOptions,
): Promise<TracedAgentResult<T>> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const baseMetadata = {
    agentName: options.agentName,
    contractId: options.contractId,
    userId: options.userId,
    language: options.language,
    clauseNumber: options.clauseNumber,
  };

  logger.info(`[AGENT-START] ${options.agentName}`, {
    ...baseMetadata,
    timestamp,
  });

  try {
    const data = await fn();
    const duration = Date.now() - startTime;

    logger.info(`[AGENT-SUCCESS] ${options.agentName}`, {
      ...baseMetadata,
      duration,
      timestamp,
    });

    // Log to Langfuse
    const langfuseMetadata: AgentTraceMetadata = {
      agentName: options.agentName,
      contractId: options.contractId,
      userId: options.userId,
      clauseNumber: options.clauseNumber,
      language: options.language,
      output: typeof data === "object" ? JSON.stringify(data) : String(data),
      duration,
    };
    logAgentExecution(langfuseMetadata);

    return {
      success: true,
      data,
      duration,
      metadata: {
        agentName: options.agentName,
        contractId: options.contractId,
        timestamp,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`[AGENT-ERROR] ${options.agentName}`, {
      ...baseMetadata,
      error: errorMessage,
      duration,
      timestamp,
    });

    // Log error to Langfuse
    const langfuseMetadata: AgentTraceMetadata = {
      agentName: options.agentName,
      contractId: options.contractId,
      userId: options.userId,
      clauseNumber: options.clauseNumber,
      language: options.language,
      error: errorMessage,
      duration,
    };
    logAgentExecution(langfuseMetadata);

    return {
      success: false,
      error: errorMessage,
      duration,
      metadata: {
        agentName: options.agentName,
        contractId: options.contractId,
        timestamp,
      },
    };
  }
}

/**
 * Wraps a pipeline execution (multiple agents) with tracing.
 *
 * Usage:
 *   const result = await tracePipeline(
 *     async () => {
 *       const extracted = await extractor();
 *       const classified = await classifier(extracted);
 *       return classified;
 *     },
 *     { contractId, userId, language }
 *   );
 *
 * @param fn - The async pipeline function
 * @param options - Pipeline metadata
 * @returns Traced result with total duration
 */
export async function tracePipeline<T>(
  fn: () => Promise<T>,
  options: Pick<TracedAgentOptions, "contractId" | "userId" | "language">,
): Promise<TracedAgentResult<T>> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const pipelineId = `pipeline-${options.contractId}`;

  logger.info(`[PIPELINE-START] ${pipelineId}`, {
    contractId: options.contractId,
    userId: options.userId,
    language: options.language,
    timestamp,
  });

  try {
    const data = await fn();
    const duration = Date.now() - startTime;

    logger.info(`[PIPELINE-SUCCESS] ${pipelineId}`, {
      contractId: options.contractId,
      userId: options.userId,
      language: options.language,
      duration,
      timestamp,
    });

    return {
      success: true,
      data,
      duration,
      metadata: {
        agentName: "pipeline" as any,
        contractId: options.contractId,
        timestamp,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`[PIPELINE-ERROR] ${pipelineId}`, {
      contractId: options.contractId,
      userId: options.userId,
      language: options.language,
      error: errorMessage,
      duration,
      timestamp,
    });

    return {
      success: false,
      error: errorMessage,
      duration,
      metadata: {
        agentName: "pipeline" as any,
        contractId: options.contractId,
        timestamp,
      },
    };
  }
}

/**
 * Format agent execution metrics for logging/monitoring.
 *
 * @param result - The traced agent result
 * @returns Formatted metrics string
 */
export function formatAgentMetrics(result: TracedAgentResult<any>): string {
  const status = result.success ? "✓" : "✗";
  const durationSec = (result.duration / 1000).toFixed(2);
  return `${status} ${result.metadata.agentName} [${durationSec}s]`;
}

/**
 * Log detailed metrics for a batch of agent executions.
 *
 * @param results - Array of traced results
 * @param context - Additional context (e.g., contract ID)
 */
export function logAgentMetricsReport(
  results: TracedAgentResult<any>[],
  context?: string,
): void {
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;

  logger.info("Agent Execution Report", {
    context,
    totalAgents: results.length,
    successful: successCount,
    failed: failureCount,
    totalDurationMs: totalDuration,
    totalDurationSec: (totalDuration / 1000).toFixed(2),
    averageDurationMs: Math.round(totalDuration / results.length),
    metrics: results.map(formatAgentMetrics).join(" | "),
  });
}
