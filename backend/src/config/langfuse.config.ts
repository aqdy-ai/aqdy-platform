/**
 * Langfuse Configuration — LangChain callback handler factory.
 *
 * Creates a CallbackHandler from @langfuse/langchain to automatically
 * trace LLM calls, chains, and agents in the Langfuse dashboard.
 *
 * Gracefully returns null in test environments to avoid side effects.
 */

import { CallbackHandler } from "@langfuse/langchain";
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
      sessionId: options.sessionId,
      userId: options.userId,
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
