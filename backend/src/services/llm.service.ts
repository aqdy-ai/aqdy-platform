import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

// ── Constants ────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const GEMINI_PRIMARY = "gemini-3.5-flash";
const GEMINI_FALLBACK = "gemini-3.1-flash-lite";

// ── Interfaces ───────────────────────────────────

export interface LLMRequestOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  usedFallback: boolean;
}

// ── Helpers ──────────────────────────────────────

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const buildMessages = (
  userPrompt: string,
  systemPrompt?: string,
): BaseMessage[] => {
  const messages: BaseMessage[] = [];
  if (systemPrompt) {
    messages.push(new SystemMessage(systemPrompt));
  }
  messages.push(new HumanMessage(userPrompt));
  return messages;
};

// ── Client Factories ─────────────────────────────

const createGeminiPrimaryClient = (
  options: LLMRequestOptions,
): ChatGoogleGenerativeAI => {
  return new ChatGoogleGenerativeAI({
    model: GEMINI_PRIMARY,
    apiKey: env.GEMINI_API_KEY,
    temperature: options.temperature ?? 0.1,
    maxOutputTokens: options.maxTokens ?? 4096,
    maxRetries: 0, // We handle retries manually
  });
};

const createGeminiFallbackClient = (
  options: LLMRequestOptions,
): ChatGoogleGenerativeAI => {
  return new ChatGoogleGenerativeAI({
    model: GEMINI_FALLBACK,
    apiKey: env.GEMINI_API_KEY,
    temperature: options.temperature ?? 0.1,
    maxOutputTokens: options.maxTokens ?? 4096,
    maxRetries: 0,
  });
};

// ── Core Call with Retry ─────────────────────────

const callWithRetry = async (
  prompt: string,
  options: LLMRequestOptions,
  useFallback = false,
): Promise<string> => {
  const clientName = useFallback ? GEMINI_FALLBACK : GEMINI_PRIMARY;
  const messages = buildMessages(prompt, options.systemPrompt);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info(`LLM call attempt ${attempt}/${MAX_RETRIES}`, {
        model: clientName,
        attempt,
      });

      const client = useFallback
        ? createGeminiFallbackClient(options)
        : createGeminiPrimaryClient(options);

      const response = await client.invoke(messages);
      const content = response.content;

      if (typeof content !== "string") {
        throw new Error("Unexpected non-string response from LLM");
      }

      logger.info("LLM call succeeded", { model: clientName, attempt });
      return content;
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.warn("LLM call failed", {
        model: clientName,
        attempt,
        error: errorMessage,
        willRetry: !isLastAttempt,
      });

      if (isLastAttempt) {
        throw error;
      }

      // Exponential backoff: 1s → 2s → 4s
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
    }
  }

  throw new Error(`All ${MAX_RETRIES} attempts failed for ${clientName}`);
};

// ── Public API ───────────────────────────────────

export const llmService = {
  /**
   * Call Gemini 3.5 Flash with automatic fallback to Gemini 3.1 Flash Lite
   * if the primary model fails all retries.
   * This is the main method all agents should use.
   */
  async call(
    prompt: string,
    options: LLMRequestOptions = {},
  ): Promise<LLMResponse> {
    // Try Gemini 3.5 Flash first
    try {
      const content = await callWithRetry(prompt, options, false);
      return {
        content,
        model: GEMINI_PRIMARY,
        usedFallback: false,
      };
    } catch (primaryError) {
      logger.warn(
        "Gemini 3.5 Flash exhausted all retries — switching to Gemini 3.1 Flash Lite fallback",
        {
          error:
            primaryError instanceof Error
              ? primaryError.message
              : "Unknown error",
        },
      );
    }

    // Fallback to Gemini 3.1 Flash Lite
    try {
      const content = await callWithRetry(prompt, options, true);
      return {
        content,
        model: GEMINI_FALLBACK,
        usedFallback: true,
      };
    } catch (fallbackError) {
      logger.error("Both Gemini models failed", {
        error:
          fallbackError instanceof Error
            ? fallbackError.message
            : "Unknown error",
      });
      throw new Error("All LLM providers failed. Please try again later.", {
        cause: fallbackError,
      });
    }
  },

  /**
   * Call Gemini 3.5 Flash (primary) directly — no fallback.
   * Use when you specifically need the larger, more capable model.
   */
  async callPrimary(
    prompt: string,
    options: LLMRequestOptions = {},
  ): Promise<LLMResponse> {
    const content = await callWithRetry(prompt, options, false);
    return {
      content,
      model: GEMINI_PRIMARY,
      usedFallback: false,
    };
  },

  /**
   * Call Gemini 3.1 Flash Lite (fallback) directly — no fallback chain.
   * Use for lighter tasks where speed matters more than raw capability.
   */
  async callFallback(
    prompt: string,
    options: LLMRequestOptions = {},
  ): Promise<LLMResponse> {
    const content = await callWithRetry(prompt, options, true);
    return {
      content,
      model: GEMINI_FALLBACK,
      usedFallback: false,
    };
  },
};
