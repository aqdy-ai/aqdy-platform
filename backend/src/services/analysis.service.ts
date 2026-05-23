import {
  RiskAnalysis,
  IRiskAnalysis,
  RiskAnalysisZodSchema,
} from "../models/riskAnalysis.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { extractorAgent } from "../agents/extractor.agent.js";
import { logger } from "../utils/logger.js";

export class AnalysisService {
  // ── Save a completed analysis ─────────────────────────────────────────────

  async saveAnalysis(data: {
    contractId: string;
    userId: string;
    executiveSummary: IRiskAnalysis["executiveSummary"];
    clauseAnalysis: IRiskAnalysis["clauseAnalysis"];
    analysisDuration: number;
  }): Promise<IRiskAnalysis> {
    RiskAnalysisZodSchema.parse({
      contractId: data.contractId,
      userId: data.userId,
      analysisDuration: data.analysisDuration,
    });

    const analysis = new RiskAnalysis(data);
    await analysis.save();
    logger.info(`✅ Analysis saved: ${analysis._id}`);
    return analysis;
  }

  // ── Retrieve analysis by contract ID ──────────────────────────────────────

  async getAnalysisByContractId(
    contractId: string,
  ): Promise<IRiskAnalysis | null> {
    return await RiskAnalysis.findOne({ contractId }).sort({ createdAt: -1 });
  }

  // ── Retrieve all analyses for a user ──────────────────────────────────────

  async getAnalysesByUser(userId: string): Promise<IRiskAnalysis[]> {
    return await RiskAnalysis.find({ userId }).sort({ createdAt: -1 });
  }

  // ── Full extraction pipeline (fire-and-forget safe) ───────────────────────
  /**
   * Runs the complete extraction pipeline for a contract:
   *   1. Calls ExtractorAgent to extract clauses via LLM
   *   2. Maps extracted clauses to IRiskAnalysis.clauseAnalysis
   *   3. Persists the analysis to the RiskAnalysis collection
   *   4. Writes ANALYSIS_COMPLETED / ANALYSIS_FAILED audit log entries
   *
   * Designed to be called as a background task after contract upload:
   *   analysisService.triggerAnalysis(...).catch(logger.error);
   */
  async triggerAnalysis(
    contractId: string,
    userId: string,
    text: string,
    language: "ar" | "en",
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Step 1 — Run the extractor agent
      const extractionResult = await extractorAgent.extract(text, language);

      // Step 2 — Map extracted clauses to IRiskAnalysis.clauseAnalysis
      const clauseAnalysis = extractionResult.clauses.map((clause) => ({
        clauseText: clause.clauseText,
        clauseType: clause.clauseType,
        riskLevel: "unknown" as const,
        confidence: 1.0,
        explanation: {
          ar: "تم استخراج البند بنجاح.",
          en: "Clause extracted successfully.",
        },
        sourceFromKB: null,
      }));

      // Step 3 — Build executive summary
      const executiveSummary = {
        overallRisk: "low" as const,
        totalClauses: extractionResult.clauses.length,
        riskyClausesCount: 0,
        summary: {
          ar: "تم استخراج البنود بنجاح.",
          en: "Clauses extracted successfully.",
        },
      };

      // Step 4 — Persist analysis
      const duration = Date.now() - startTime;
      await this.saveAnalysis({
        contractId,
        userId,
        executiveSummary,
        clauseAnalysis,
        analysisDuration: duration,
      });

      // Step 5 — Audit trail: ANALYSIS_COMPLETED
      await new AuditLog({
        contractId,
        userId,
        action: "ANALYSIS_COMPLETED",
        metadata: {
          totalClauses: extractionResult.clauses.length,
          durationMs: duration,
          modelUsed: extractionResult.modelUsed,
          usedFallback: extractionResult.usedFallback,
        },
      }).save();

      logger.info(`✅ Background analysis complete for contract: ${contractId}`);
    } catch (error) {
      logger.error(
        `❌ Background analysis failed for contract ${contractId}:`,
        error,
      );

      // Audit trail: ANALYSIS_FAILED
      await new AuditLog({
        contractId,
        userId,
        action: "ANALYSIS_FAILED",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      }).save();
    }
  }
}

export const analysisService = new AnalysisService();
