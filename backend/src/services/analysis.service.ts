import {
  RiskAnalysis,
  IRiskAnalysis,
  RiskAnalysisZodSchema,
} from "../models/riskAnalysis.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { extractorAgent } from "../agents/extractor.agent.js";
import { logger } from "../utils/logger.js";
import {
  AgentExecutionService,
  AgentJobPayload,
} from "../pipeline/agentExecution.service.js";

export class AnalysisService {
  private readonly executionQueue: AgentExecutionService<AgentJobPayload>;

  constructor(queueMaxAttempts = 3, queueRetryDelayMs = 2000) {
    this.executionQueue = new AgentExecutionService(
      this.executeAnalysisAttempt.bind(this),
      queueMaxAttempts,
      queueRetryDelayMs,
      this.logFinalFailure.bind(this),
    );
  }

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
   *   1. Queues the job in the agent execution queue
   *   2. Retries transient failures automatically
   *   3. Persists the final analysis result to the database
   *   4. Writes ANALYSIS_COMPLETED / ANALYSIS_FAILED audit log entries
   */
  async triggerAnalysis(
    contractId: string,
    userId: string,
    text: string,
    language: "ar" | "en",
  ): Promise<void> {
    try {
      await this.executionQueue.enqueue({
        contractId,
        userId,
        text,
        language,
      });
    } catch (error) {
      logger.error(
        `❌ Analysis queue failed for contract ${contractId}:`,
        error,
      );
    }
  }

  private async executeAnalysisAttempt(job: AgentJobPayload): Promise<void> {
    const startTime = Date.now();

    const extractionResult = await extractorAgent.extract(
      job.text,
      job.language,
    );

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

    const executiveSummary = {
      overallRisk: "low" as const,
      totalClauses: extractionResult.clauses.length,
      riskyClausesCount: 0,
      summary: {
        ar: "تم استخراج البنود بنجاح.",
        en: "Clauses extracted successfully.",
      },
    };

    const duration = Date.now() - startTime;
    await this.saveAnalysis({
      contractId: job.contractId,
      userId: job.userId,
      executiveSummary,
      clauseAnalysis,
      analysisDuration: duration,
    });

    await new AuditLog({
      contractId: job.contractId,
      userId: job.userId,
      action: "ANALYSIS_COMPLETED",
      metadata: {
        totalClauses: extractionResult.clauses.length,
        durationMs: duration,
        modelUsed: extractionResult.modelUsed,
        usedFallback: extractionResult.usedFallback,
      },
    }).save();

    logger.info(
      `✅ Background analysis complete for contract: ${job.contractId}`,
    );
  }

  private async logFinalFailure(
    job: AgentJobPayload,
    error: Error,
  ): Promise<void> {
    logger.error(
      `❌ Background analysis permanently failed for contract ${job.contractId}:`,
      error,
    );

    await new AuditLog({
      contractId: job.contractId,
      userId: job.userId,
      action: "ANALYSIS_FAILED",
      metadata: {
        error: error.message,
      },
    }).save();
  }
}

export const analysisService = new AnalysisService();
