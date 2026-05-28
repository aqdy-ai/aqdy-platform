/**
 * RedlineAgent — Contract clause redline suggestion generator agent using Gemini.
 *
 * Generates balanced, realistic revisions of contract clauses to mitigate
 * risks, provides bilingual explanation and negotiation talking points,
 * and maintains robust structure validation with Zod.
 */

import { z } from "zod";
import { llmService } from "../services/llm.service.js";
import { logger } from "../utils/logger.js";
import { safeParseJSON } from "../utils/text.utils.js";
import {
  REDLINE_SYSTEM_PROMPT,
  buildRedlineUserPrompt,
} from "./redline.prompts.js";

// ── Output Schema ────────────────────────────────

export const RedlineOutputSchema = z.object({
  suggestedText: z.string().min(1),
  explanation: z.object({
    ar: z.string().min(1),
    en: z.string().min(1),
  }),
  talkingPoints: z.object({
    ar: z.array(z.string()).min(1),
    en: z.array(z.string()).min(1),
  }),
  confidence: z.number().min(0.0).max(1.0),
});

export type RedlineOutput = z.infer<typeof RedlineOutputSchema>;

export interface RedlineResult {
  suggestedText: string;
  explanation: { ar: string; en: string };
  talkingPoints: { ar: string[]; en: string[] };
  confidence: number;
}

// ── RedlineAgent Class ───────────────────────────

export class RedlineAgent {
  /**
   * Generates realistic redline suggestions for a single contract clause.
   *
   * @param clauseText - The text of the clause to redline
   * @param riskLevel - The classified risk level of the clause
   * @param clauseType - The categorized type of the clause
   * @param language - The contract's language ("ar" | "en")
   * @param saferAlternative - Optional guiding safer alternative from RAG/KB
   * @returns RedlineResult containing suggestedText, explanation, talkingPoints, and confidence
   */
  async generate(
    clauseText: string,
    riskLevel: string,
    clauseType: string,
    language: "ar" | "en",
    saferAlternative?: string,
  ): Promise<RedlineResult> {
    // Input validation
    if (!clauseText || clauseText.trim().length === 0) {
      throw new Error(
        "Clause text is empty — cannot generate redline suggestions.",
      );
    }

    logger.info("RedlineAgent: starting suggestion generation", {
      clauseType,
      riskLevel,
      language,
      textLength: clauseText.length,
      hasAlternative: !!saferAlternative,
    });

    // 1. Construct prompts
    const systemPrompt = REDLINE_SYSTEM_PROMPT;
    const userPrompt = buildRedlineUserPrompt(
      clauseText,
      riskLevel,
      clauseType,
      language,
      saferAlternative,
    );

    // 2. Call LLM service (Gemini 3.5 with fallback)
    const llmResponse = await llmService.call(userPrompt, {
      systemPrompt,
      temperature: 0.2, // slightly higher temp for creative/negotiation suggestions
      maxTokens: 4096,
    });

    // 3. Parse & Validate LLM Output
    const parsed = safeParseJSON<unknown>(llmResponse.content);
    const validated = RedlineOutputSchema.parse(parsed);

    // 4. Calibrate confidence score
    let calibratedConfidence = validated.confidence;
    if (saferAlternative && saferAlternative.trim().length > 0) {
      // Boost slightly since we have a reliable knowledge base alternative as guide
      calibratedConfidence = calibratedConfidence * 1.05;
    } else {
      // Scale down slightly if no KB-matching safer alternative was available
      calibratedConfidence = calibratedConfidence * 0.95;
    }

    // Round and clamp between 0.0 and 1.0
    calibratedConfidence = Math.min(
      1.0,
      Math.max(0.0, Math.round(calibratedConfidence * 100) / 100),
    );

    logger.info("RedlineAgent: generation complete", {
      confidence: calibratedConfidence,
      modelUsed: llmResponse.model,
      usedFallback: llmResponse.usedFallback,
    });

    return {
      suggestedText: validated.suggestedText,
      explanation: validated.explanation,
      talkingPoints: validated.talkingPoints,
      confidence: calibratedConfidence,
    };
  }
}

// ── Default Instance ─────────────────────────────

export const redlineAgent = new RedlineAgent();
