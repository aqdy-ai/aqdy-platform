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
import { ragService } from "../services/rag.service.js";
import { logger } from "../utils/logger.js";
import { createLangfuseHandler } from "../config/langfuse.config.js";
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
    const extractionResult = await extractorAgent.extract(text, language);

    logger.info("Orchestrator: extraction complete", {
      clauseCount: extractionResult.clauses.length,
      model: extractionResult.modelUsed,
    });

    // ── Step 2 & 3: Classification + Redlining ───

    const clauseAnalysis: IClauseAnalysis[] = [];
    let riskyClausesCount = 0;
    let maxRiskWeight = 0;

    for (const clause of extractionResult.clauses) {
      // Step 2: Classify
      let riskLevel: IClauseAnalysis["riskLevel"] = "unknown";
      let confidence = 0.0;
      let explanation: { ar: string; en: string } = {
        ar: "فشل تصنيف مخاطر هذا البند.",
        en: "Failed to classify the risk of this clause.",
      };
      let sourceFromKB: string | null = null;
      let saferAlternativeText: string | undefined;

      try {
        logger.info(
          `Orchestrator: Step 2 — Classifying clause ${clause.clauseNumber}`,
        );

        // Fetch RAG context for this clause (used by both classifier and redliner)
        let ragMatches: Awaited<ReturnType<typeof ragService.searchKB>> | null =
          null;
        try {
          ragMatches = await ragService.searchKB(clause.clauseText);
        } catch {
          logger.warn(
            `Orchestrator: RAG search failed for clause ${clause.clauseNumber}, continuing without KB`,
          );
        }

        // Extract safer alternative from top KB match for redlining
        if (
          ragMatches &&
          ragMatches.hasMatch &&
          ragMatches.matches.length > 0
        ) {
          const topMatch = ragMatches.matches[0];
          const lang = language === "ar" ? "ar" : "en";
          saferAlternativeText = topMatch.saferAlternative?.[lang] || undefined;
        }

        const classification = await riskClassifierAgent.classify(
          clause.clauseText,
          clause.clauseType,
          language,
        );

        riskLevel = classification.riskLevel;
        confidence = classification.confidence;
        explanation = classification.explanation;
        sourceFromKB = classification.sourceFromKB;
      } catch (err) {
        logger.error(
          `Orchestrator: classification failed for clause ${clause.clauseNumber}`,
          err,
        );
        // Clause gets default "unknown" values set above
      }

      // Track risk metrics
      if (riskLevel !== "low" && riskLevel !== "unknown") {
        riskyClausesCount++;
      }
      const weight = RISK_WEIGHTS[riskLevel] ?? 0;
      if (weight > maxRiskWeight) {
        maxRiskWeight = weight;
      }

      // Step 3: Redline (only for risky clauses)
      let redlineSuggestion: string | undefined;

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
            saferAlternativeText,
          );

          redlineSuggestion = redline.suggestedText;
        } catch (err) {
          logger.error(
            `Orchestrator: redline generation failed for clause ${clause.clauseNumber}`,
            err,
          );
          // Clause still gets classification results, just no redline
        }
      }

      clauseAnalysis.push({
        clauseText: clause.clauseText,
        clauseType: clause.clauseType,
        riskLevel,
        confidence,
        lowConfidenceWarning: confidence < 0.6,
        kbCitationMissing: sourceFromKB === null,
        explanation,
        sourceFromKB,
        redlineSuggestion,
      });
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
