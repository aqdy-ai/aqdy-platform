/**
 * RiskClassifierAgent — Contract clause risk classification agent using LangChain/Gemini and RAG.
 *
 * Classifies the risk level of contract clauses with:
 * - Context awareness (RAG search against legal KB)
 * - Automatic confidence calibration based on vector similarity
 * - Robust JSON validation using Zod
 * - Resilient error handling and logging
 */

import { z } from "zod";
import { llmService } from "../services/llm.service.js";
import { ragService } from "../services/rag.service.js";
import { logger } from "../utils/logger.js";
import { safeParseJSON } from "../utils/text.utils.js";
import {
  RISK_CLASSIFIER_SYSTEM_PROMPT,
  buildClassificationUserPrompt,
} from "./riskClassifier.prompts.js";

// ── Output Schema ────────────────────────────────

export const ClassificationOutputSchema = z.object({
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  explanation: z.object({
    ar: z.string().min(1),
    en: z.string().min(1),
  }),
  confidence: z.number().min(0).max(1),
});

export type ClassificationOutput = z.infer<typeof ClassificationOutputSchema>;

export interface ClassificationResult {
  riskLevel: "low" | "medium" | "high" | "critical" | "unknown";
  confidence: number;
  explanation: { ar: string; en: string };
  sourceFromKB: string | null;
  saferAlternative?: string;
  durationMs: number;
}

// ── RiskClassifierAgent Class ────────────────────

export class RiskClassifierAgent {
  private readonly similarityThreshold: number;
  private readonly classifyCache = new Map<string, ClassificationResult>();

  /**
   * @param similarityThreshold - The similarity score cut-off above which a KB match is considered valid.
   *                              Defaults to 0.75.
   */
  constructor(similarityThreshold = 0.75) {
    this.similarityThreshold = similarityThreshold;
  }

  /**
   * Classifies the risk level of a single clause.
   *
   * @param clauseText - The text of the clause to analyze
   * @param clauseType - The categorized type of the clause
   * @param language - The contract's language ("ar" | "en")
   * @returns ClassificationResult containing riskLevel, confidence, explanation, and sourceFromKB
   */
  async classify(
    clauseText: string,
    clauseType: string,
    language: "ar" | "en",
    options?: { callbacks?: any[] },
  ): Promise<ClassificationResult> {
    const startTime = Date.now();

    // Input validation
    if (!clauseText || clauseText.trim().length === 0) {
      throw new Error("Clause text is empty — nothing to classify.");
    }

    logger.info("RiskClassifierAgent: starting classification", {
      clauseType,
      language,
      textLength: clauseText.length,
    });

    const cacheKey = JSON.stringify({
      text: clauseText.trim(),
      type: clauseType,
      language,
    });

    const cachedResult = this.classifyCache.get(cacheKey);
    if (cachedResult) {
      logger.info(
        "RiskClassifierAgent: returning cached classification result",
        {
          clauseType,
          language,
        },
      );
      return cachedResult;
    }

    // 1. Query legal Knowledge Base (RAG)
    let kbMatch = null;
    let sourceFromKB: string | null = null;
    let saferAlternative: string | undefined;

    try {
      const ragResult = await ragService.searchKB(clauseText);
      const matches = ragResult?.matches || [];
      if (matches && matches.length > 0) {
        const bestMatch = matches[0];
        if (bestMatch.score >= this.similarityThreshold) {
          kbMatch = bestMatch;
          sourceFromKB = bestMatch.id;
          saferAlternative = bestMatch.saferAlternative?.[language];
          logger.info("RiskClassifierAgent: KB match found and accepted", {
            matchId: bestMatch.id,
            score: bestMatch.score,
            threshold: this.similarityThreshold,
          });
        } else {
          logger.info(
            "RiskClassifierAgent: KB match found but below threshold",
            {
              matchId: bestMatch.id,
              score: bestMatch.score,
              threshold: this.similarityThreshold,
            },
          );
        }
      } else {
        logger.info("RiskClassifierAgent: no matches returned from KB");
      }
    } catch (error) {
      logger.error(
        "RiskClassifierAgent: KB search query failed (continuing without RAG)",
        error,
      );
    }

    // 2. Construct context-aware prompts
    const systemPrompt = RISK_CLASSIFIER_SYSTEM_PROMPT;
    const userPrompt = buildClassificationUserPrompt(
      clauseText,
      clauseType,
      language,
      kbMatch || undefined,
    );

    const llmResponse = await llmService.call(userPrompt, {
      systemPrompt,
      temperature: 0.1,
      maxTokens: 2048,
      callbacks: options?.callbacks,
    });

    // 4. Parse & Validate LLM Output
    const parsed = safeParseJSON<unknown>(llmResponse.content);
    const validated = ClassificationOutputSchema.parse(parsed);

    // 5. Calibrate confidence score
    let calibratedConfidence: number;
    if (kbMatch) {
      // Blend vector similarity score and LLM confidence score
      calibratedConfidence = 0.5 * kbMatch.score + 0.5 * validated.confidence;
    } else {
      // Penalize slightly since we didn't back it up with matching KB data
      calibratedConfidence = validated.confidence * 0.9;
    }

    // Round to two decimal places and clamp between 0.0 and 1.0
    calibratedConfidence = Math.min(
      1.0,
      Math.max(0.0, Math.round(calibratedConfidence * 100) / 100),
    );

    const durationMs = Date.now() - startTime;

    const result: ClassificationResult = {
      riskLevel: validated.riskLevel,
      confidence: calibratedConfidence,
      explanation: validated.explanation,
      sourceFromKB,
      saferAlternative,
      durationMs,
    };

    logger.info("RiskClassifierAgent: classification complete", {
      riskLevel: validated.riskLevel,
      confidence: calibratedConfidence,
      sourceFromKB,
      hasSaferAlternative: !!saferAlternative,
      modelUsed: llmResponse.model,
      durationMs,
    });

    this.classifyCache.set(cacheKey, result);
    return result;
  }
}

// ── Default Instance ─────────────────────────────

export const riskClassifierAgent = new RiskClassifierAgent();
