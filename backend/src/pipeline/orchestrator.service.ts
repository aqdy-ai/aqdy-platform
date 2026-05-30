/**
 * OrchestratorService — Chains agents sequentially for full contract analysis.
 *
 * Pipeline:
 *   1. ExtractorAgent  → structured clauses from raw contract text
 *   2. RiskClassifierAgent → risk classification per clause (with RAG)
 *   3. RedlineAgent → redline suggestions for risky clauses only
 *
 * Design principles:
 *   - Per-clause error isolation: one clause failing does NOT block others.
 *   - Langfuse tracing via LangChain CallbackHandler.
 *   - Clean separation from persistence (AnalysisService owns DB writes).
 */

import { extractorAgent } from "../agents/extractor.agent.js";
import { riskClassifierAgent } from "../agents/riskClassifier.agent.js";
import { redlineAgent } from "../agents/redline.agent.js";
import type { ExtractedClause } from "../agents/extractor.agent.js";
import { logger } from "../utils/logger.js";
import { createLangfuseHandler } from "../config/langfuse.config.js";
import { getStableHash } from "../utils/text.utils.js";
import type { IClauseAnalysis } from "../models/riskAnalysis.model.js";

// ── Types ─────────────────────────────────────────

export interface OrchestratorResult {
  executiveSummary: {
    overallRisk: "low" | "medium" | "high" | "critical";
    totalClauses: number;
    riskyClausesCount: number;
    summary: { ar: string; en: string };
  };
  clauseAnalysis: IClauseAnalysis[];
  extractionMeta: {
    modelUsed: string;
    usedFallback: boolean;
    chunkCount: number;
  };
  durationMs: number;
}

// ── Risk weight map ───────────────────────────────

const RISK_WEIGHTS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
  unknown: 0,
};

// ── OrchestratorService ───────────────────────────

export class OrchestratorService {
  private readonly extractionCache = new Map<
    string,
    {
      clauses: ExtractedClause[];
      language: "ar" | "en";
      modelUsed: string;
      usedFallback: boolean;
      chunkCount: number;
      durationMs: number;
    }
  >();

  /**
   * Runs the full analysis pipeline for a contract.
   *
   * @param contractId - The contract's database ID (for tracing)
   * @param userId - The user's ID (for tracing)
   * @param text - The raw contract text
   * @param language - The contract language ("ar" | "en")
   * @returns OrchestratorResult with all clause analyses and executive summary
   */
  async run(
    contractId: string,
    userId: string,
    text: string,
    language: "ar" | "en",
  ): Promise<OrchestratorResult> {
    const startTime = Date.now();

    // Create Langfuse trace for this analysis run
    const langfuseHandler = createLangfuseHandler({
      sessionId: `analysis-${contractId}`,
      userId,
      traceName: "contract-analysis",
    });

    logger.info("Orchestrator: starting pipeline", {
      contractId,
      language,
      textLength: text.length,
      tracingEnabled: !!langfuseHandler,
    });

    // ── Step 1: Extraction ────────────────────────

    logger.info("Orchestrator: Step 1 — Extraction");
    const extractionCacheKey = getStableHash(`${text.trim()}|${language}`);
    const cachedExtraction = this.extractionCache.get(extractionCacheKey);
    const extractionResult =
      cachedExtraction ?? (await extractorAgent.extract(text, language));

    if (!cachedExtraction) {
      this.extractionCache.set(extractionCacheKey, extractionResult);
    }

    logger.info("Orchestrator: extraction complete", {
      clauseCount: extractionResult.clauses.length,
      model: extractionResult.modelUsed,
      cacheHit: !!cachedExtraction,
    });

    // ── Step 2 & 3: Classification + Redlining ───

    const clauseAnalysis = await Promise.all(
      extractionResult.clauses.map(async (clause) => {
        let riskLevel: IClauseAnalysis["riskLevel"] = "unknown";
        let confidence = 0.0;
        let explanation: { ar: string; en: string } = {
          ar: "فشل تصنيف مخاطر هذا البند.",
          en: "Failed to classify the risk of this clause.",
        };
        let sourceFromKB: string | null = null;
        let classificationDurationMs: number | undefined;
        let redlineSuggestion: string | undefined;
        let redlineDurationMs: number | undefined;

        try {
          logger.info(
            `Orchestrator: Step 2 — Classifying clause ${clause.clauseNumber}`,
          );

          const classification = await riskClassifierAgent.classify(
            clause.clauseText,
            clause.clauseType,
            language,
          );

          riskLevel = classification.riskLevel;
          confidence = classification.confidence;
          explanation = classification.explanation;
          sourceFromKB = classification.sourceFromKB;
          classificationDurationMs = classification.durationMs;

          if (riskLevel !== "low" && riskLevel !== "unknown") {
            try {
              logger.info(
                `Orchestrator: Step 3 — Generating redline for clause ${clause.clauseNumber}`,
              );

              const redline = await redlineAgent.generate(
                clause.clauseText,
                riskLevel,
                clause.clauseType,
                language,
                classification.saferAlternative,
              );

              redlineSuggestion = redline.suggestedText;
              redlineDurationMs = redline.durationMs;
            } catch (err) {
              logger.error(
                `Orchestrator: redline generation failed for clause ${clause.clauseNumber}`,
                err,
              );
            }
          }
        } catch (err) {
          logger.error(
            `Orchestrator: classification failed for clause ${clause.clauseNumber}`,
            err,
          );
        }

        return {
          clauseText: clause.clauseText,
          clauseType: clause.clauseType,
          riskLevel,
          confidence,
          explanation,
          sourceFromKB,
          classificationDurationMs,
          redlineSuggestion,
          redlineDurationMs,
        };
      }),
    );

    let riskyClausesCount = 0;
    let maxRiskWeight = 0;
    for (const analysis of clauseAnalysis) {
      if (analysis.riskLevel !== "low" && analysis.riskLevel !== "unknown") {
        riskyClausesCount++;
      }
      const weight = RISK_WEIGHTS[analysis.riskLevel] ?? 0;
      if (weight > maxRiskWeight) {
        maxRiskWeight = weight;
      }
    }

    // ── Executive Summary ─────────────────────────

    let overallRisk: "low" | "medium" | "high" | "critical" = "low";
    if (maxRiskWeight === 4) overallRisk = "critical";
    else if (maxRiskWeight === 3) overallRisk = "high";
    else if (maxRiskWeight === 2) overallRisk = "medium";

    const totalClauses = extractionResult.clauses.length;

    const summaryAr = `تم تحليل العقد بنجاح. تم تحديد عدد ${riskyClausesCount} بند ينطوي على مخاطر من إجمالي ${totalClauses} بند تم استخراجها. مستوى المخاطر العام للعقد هو: ${overallRisk}.`;
    const summaryEn = `Contract analysis completed. Identified ${riskyClausesCount} risky clauses out of ${totalClauses} extracted clauses. The overall contract risk level is ${overallRisk}.`;

    const durationMs = Date.now() - startTime;

    logger.info("Orchestrator: pipeline complete", {
      contractId,
      totalClauses,
      riskyClausesCount,
      overallRisk,
      durationMs,
    });

    // Flush Langfuse traces
    if (langfuseHandler) {
      try {
        await (
          langfuseHandler as unknown as { shutdownAsync?: () => Promise<void> }
        ).shutdownAsync?.();
      } catch {
        // Non-critical — tracing flush failure should not break the pipeline
      }
    }

    return {
      executiveSummary: {
        overallRisk,
        totalClauses,
        riskyClausesCount,
        summary: { ar: summaryAr, en: summaryEn },
      },
      clauseAnalysis,
      extractionMeta: {
        modelUsed: extractionResult.modelUsed,
        usedFallback: extractionResult.usedFallback,
        chunkCount: extractionResult.chunkCount,
      },
      durationMs,
    };
  }
}

// ── Default Instance ──────────────────────────────

export const orchestratorService = new OrchestratorService();
