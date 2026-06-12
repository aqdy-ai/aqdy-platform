/**
 * Langfuse Configuration — Enhanced LLM observability setup.
 *
 * This module provides:
 * 1. CallbackHandler factory for automatic LangChain tracing
 * 2. Langfuse client initialization for direct trace logging
 * 3. Agent execution tracing with structured metadata
 *
 * Gracefully returns null in test environments to avoid side effects.
 */

import { CallbackHandler } from "@langfuse/langchain";
import { Langfuse } from "langfuse";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// ── Types ─────────────────────────────────────────

export interface LangfuseHandlerOptions {
  /** Session ID for grouping traces (e.g. contract analysis session) */
  sessionId?: string;
  /** User ID for attribution */
  userId?: string;
  /** Custom trace name (e.g. "contract-analysis") */
  traceName?: string;
}

export interface AgentTraceMetadata {
  agentName: "extractor" | "riskClassifier" | "redline";
  contractId: string;
  userId: string;
  clauseNumber?: number;
  language: "ar" | "en";
  input?: string;
  output?: unknown;
  duration?: number;
  error?: string;
}

// ── Global Langfuse Client ──────────────────────

let langfuseClient: Langfuse | null = null;

/**
 * Initialize the global Langfuse client.
 * Called once on application startup.
 */
export function initializeLangfuse(): void {
  if (env.NODE_ENV === "test") {
    logger.info("Langfuse: skipped initialization in test environment");
    return;
  }

  if (langfuseClient) {
    logger.warn("Langfuse client already initialized");
    return;
  }

  try {
    langfuseClient = new Langfuse({
      publicKey: env.LANGFUSE_PUBLIC_KEY,
      secretKey: env.LANGFUSE_SECRET_KEY,
      baseUrl: env.LANGFUSE_URL,
      flushInterval: 10000, // Flush traces every 10 seconds
    });

    logger.info("✓ Langfuse client initialized", {
      baseUrl: env.LANGFUSE_URL,
      publicKey: env.LANGFUSE_PUBLIC_KEY.slice(0, 8) + "...",
    });
  } catch (error) {
    logger.error("Failed to initialize Langfuse client", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get the global Langfuse client instance.
 */
export function getLangfuseClient(): Langfuse | null {
  return langfuseClient;
}

/**
 * Flush all pending Langfuse traces to the cloud.
 * Useful before application shutdown.
 */
export async function flushLangfuseTraces(): Promise<void> {
  if (!langfuseClient) {
    return;
  }

  try {
    logger.info("Flushing Langfuse traces to cloud...");
    await langfuseClient.flush();
    logger.info("✓ Langfuse traces flushed successfully");
  } catch (error) {
    logger.error("Failed to flush Langfuse traces", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ── Factory ───────────────────────────────────────

/**
 * Creates a Langfuse CallbackHandler for LangChain tracing.
 *
 * @param options - Optional session/user/trace metadata
 * @returns CallbackHandler instance or null if in test environment
 */
export function createLangfuseHandler(
  options: LangfuseHandlerOptions = {},
): CallbackHandler | null {
  // Skip Langfuse in test environment
  if (env.NODE_ENV === "test") {
    return null;
  }

  try {
    const handler = new CallbackHandler({
      publicKey: env.LANGFUSE_PUBLIC_KEY,
      secretKey: env.LANGFUSE_SECRET_KEY,
      baseUrl: env.LANGFUSE_URL,
      sessionId: options.sessionId,
      userId: options.userId,
      traceMetadata: options.traceName
        ? { traceName: options.traceName }
        : undefined,
    });

    logger.info("Langfuse handler created", {
      sessionId: options.sessionId,
      traceName: options.traceName,
    });

    return handler;
  } catch (error) {
    logger.error("Failed to create Langfuse handler — tracing disabled", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Log an agent execution to Langfuse.
 * Use this for direct trace logging outside of LangChain handlers.
 *
 * @param metadata - Agent execution metadata
 */
export function logAgentExecution(metadata: AgentTraceMetadata): void {
  if (!langfuseClient) {
    return;
  }

  try {
    const traceId = `${metadata.contractId}-${metadata.agentName}-${metadata.clauseNumber || "full"}`;

    langfuseClient.trace({
      id: traceId,
      name: `agent-${metadata.agentName}`,
      userId: metadata.userId,
      sessionId: `analysis-${metadata.contractId}`,
      metadata: {
        agentName: metadata.agentName,
        contractId: metadata.contractId,
        clauseNumber: metadata.clauseNumber,
        language: metadata.language,
        status: metadata.error ? "error" : "success",
      },
      input: metadata.input
        ? {
            text: metadata.input.slice(0, 500), // Truncate long inputs
            length: metadata.input.length,
          }
        : undefined,
      output: metadata.output,
    });

    if (metadata.duration) {
      logger.info("Agent execution traced", {
        agent: metadata.agentName,
        contractId: metadata.contractId,
        duration: metadata.duration,
      });
    }
  } catch (error) {
    logger.error("Failed to log agent execution to Langfuse", {
      agent: metadata.agentName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
