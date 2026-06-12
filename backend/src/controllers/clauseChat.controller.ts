import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { env } from "../config/env.js";
import { RiskAnalysis } from "../models/riskAnalysis.model.js";
import { creditsService } from "../services/credits.service.js";
import { AppError } from "../middlewares/errorHandler.js";
import { AuthenticatedRequest } from "../types/auth.js";
import { logger } from "../utils/logger.js";

// Validation schema for request body
export const ClauseChatBodySchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .default([]),
});

// Rate limiting in-memory store
export const clauseChatLimits = new Map<
  string,
  { count: number; resetAt: number }
>();

export const resetClauseChatLimits = (): void => {
  clauseChatLimits.clear();
};

export const clauseChatController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?._id?.toString();
    if (!userId) {
      return next(new AppError(401, "Authentication required."));
    }

    const { contractId, clauseIndexStr } = req.params;
    const clauseIndex = parseInt(clauseIndexStr, 10);

    // 1. Validate clause index parameter
    if (isNaN(clauseIndex) || clauseIndex < 0) {
      return next(new AppError(400, "Invalid clause index format."));
    }

    // 2. Validate request body
    const bodyResult = ClauseChatBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      const firstIssue = bodyResult.error.issues[0];
      const errorMessage = firstIssue
        ? firstIssue.message
        : "Invalid request body";
      return next(new AppError(400, errorMessage));
    }
    const { message, history } = bodyResult.data;

    // 3. Retrieve clause context from RiskAnalysis
    const analysis = await RiskAnalysis.findOne({ contractId });
    if (!analysis) {
      return next(new AppError(404, "Contract analysis not found."));
    }

    if (clauseIndex >= analysis.clauseAnalysis.length) {
      return next(
        new AppError(404, `Clause index ${clauseIndex} is out of bounds.`),
      );
    }

    const clause = analysis.clauseAnalysis[clauseIndex];

    // 4. Rate Limiting Check
    const rateLimitKey = `${userId}:${contractId}:${clauseIndex}`;
    const limitLimit = env.CLAUSE_CHAT_RATE_LIMIT;
    const now = Date.now();
    const existingLimit = clauseChatLimits.get(rateLimitKey);

    if (existingLimit && existingLimit.resetAt > now) {
      if (existingLimit.count >= limitLimit) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((existingLimit.resetAt - now) / 1000),
        );
        res.setHeader("Retry-After", String(retryAfterSeconds));
        res.status(429).json({
          success: false,
          error:
            "Rate limit exceeded. Max 20 messages per clause per 24 hours.",
          retryAfter: retryAfterSeconds,
        });
        return;
      }
    }

    // 5. Credit Check
    // Estimate tokens for a typical clause chat exchange:
    //   ~3,000 input tokens (clause context + system prompt + question)
    //   ~1,000 output tokens (focused answer)
    const CHAT_INPUT_TOKENS = 3000;
    const CHAT_OUTPUT_TOKENS = 1000;
    const creditCost = creditsService.calculateChatCost(
      CHAT_INPUT_TOKENS,
      CHAT_OUTPUT_TOKENS,
    );
    const currentBalance = await creditsService.getBalance(userId);
    if (currentBalance < creditCost) {
      res.status(402).json({
        success: false,
        error: "Insufficient credits available.",
        balance: currentBalance,
        requiredCredits: creditCost,
      });
      return;
    }

    // 6. Enforce Rate Limit Increment
    if (existingLimit && existingLimit.resetAt > now) {
      existingLimit.count += 1;
    } else {
      clauseChatLimits.set(rateLimitKey, {
        count: 1,
        resetAt: now + 24 * 60 * 60 * 1000,
      });
    }

    // 7. Deduct Credits
    await creditsService.deduct(userId, creditCost, {
      reason: "chat_deduction",
      contractId,
    });

    // 8. Build System Prompt
    const systemPrompt = `You are an AI assistant designed to help answer questions about a specific contract clause.
You must ground your answers strictly on the provided clause context.

Here is the contract clause and its AI analysis context:
- Clause Text:
"""
${clause.clauseText}
"""
- Risk Classification / Level: ${clause.riskLevel} (Confidence: ${(clause.confidence * 100).toFixed(0)}%)
- AI Explanation (Arabic): ${clause.explanation?.ar || "N/A"}
- AI Explanation (English): ${clause.explanation?.en || "N/A"}
- Relevant KB Source: ${clause.sourceFromKB || "None"}
- Redline Suggestion: ${clause.redlineSuggestion || "None"}

INSTRUCTIONS:
1. ONLY answer questions about this specific clause based on the text, risk level, explanation, and KB sources provided.
2. Do NOT speculate beyond the provided context.
3. Do NOT answer questions that are outside the provided clause context or completely unrelated to this clause. If the question cannot be answered using the provided context, state clearly: "I do not have enough information to answer this based on the provided clause context."
4. Respond in the same language as the user's message.`;

    // 9. Prepare LangChain Messages
    const messages: BaseMessage[] = [];
    messages.push(new SystemMessage(systemPrompt));

    for (const msg of history) {
      if (msg.role === "user") {
        messages.push(new HumanMessage(msg.content));
      } else if (msg.role === "assistant") {
        messages.push(new AIMessage(msg.content));
      }
    }

    messages.push(new HumanMessage(message));

    // 10. Configure SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // 11. Stream from Gemini via LangChain
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-3.5-flash",
      apiKey: env.GEMINI_API_KEY,
      temperature: 0.2,
      maxOutputTokens: 2048,
    });

    try {
      const stream = await llm.stream(messages);

      for await (const chunk of stream) {
        const text = chunk.content;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (streamError) {
      logger.error("Error during clause chat streaming:", streamError);
      res.write(
        `data: ${JSON.stringify({ error: "An error occurred during response streaming." })}\n\n`,
      );
      res.end();
    }
  } catch (error) {
    next(error);
  }
};
