import {
  RiskAnalysis,
  IRiskAnalysis,
  IClauseAnalysis,
  IDiffSummary,
  IClauseDiff,
  RiskAnalysisZodSchema,
} from "../models/riskAnalysis.model.js";
import { auditLogService } from "./auditLog.service.js";
import { orchestratorService } from "../pipeline/orchestrator.service.js";
import { logger } from "../utils/logger.js";
import {
  AgentExecutionService,
  AgentJobPayload,
} from "../pipeline/agentExecution.service.js";
import { metrics } from "../utils/metrics.js";
import { creditsService } from "./credits.service.js";

// ── Risk-level weight map for determining escalation direction ──────────
const RISK_WEIGHTS: Record<string, number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

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

  // ── Save a completed analysis (with auto-versioning + diff) ────────────

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

    // Determine next version number for this contract
    const previousAnalysis = await RiskAnalysis.findOne({
      contractId: data.contractId,
    }).sort({ version: -1 });

    const nextVersion = previousAnalysis ? previousAnalysis.version + 1 : 1;

    // Generate diff summary against previous version (only for v2+)
    let diffSummary: IDiffSummary | null = null;
    if (previousAnalysis) {
      diffSummary = this.generateDiffSummary(
        previousAnalysis.clauseAnalysis,
        data.clauseAnalysis,
        previousAnalysis.version,
      );
    }

    const analysis = new RiskAnalysis({
      ...data,
      version: nextVersion,
      diffSummary,
    });
    await analysis.save();
    logger.info(
      `✅ Analysis saved: ${analysis._id} (v${nextVersion} for contract ${data.contractId})`,
    );
    return analysis;
  }

  // ── Retrieve the latest analysis by contract ID ───────────────────────

  async getAnalysisByContractId(
    contractId: string,
  ): Promise<IRiskAnalysis | null> {
    return await RiskAnalysis.findOne({ contractId }).sort({ version: -1 });
  }

  // ── Retrieve all analyses for a user ──────────────────────────────────

  async getAnalysesByUser(userId: string): Promise<IRiskAnalysis[]> {
    return await RiskAnalysis.find({ userId }).sort({ createdAt: -1 });
  }

  // ── List all analysis versions for a contract ─────────────────────────

  async getAnalysisVersionsByContractId(
    contractId: string,
  ): Promise<
    Pick<
      IRiskAnalysis,
      | "_id"
      | "version"
      | "createdAt"
      | "executiveSummary"
      | "diffSummary"
      | "analysisDuration"
    >[]
  > {
    return await RiskAnalysis.find({ contractId })
      .select(
        "_id version createdAt executiveSummary.overallRisk analysisDuration diffSummary",
      )
      .sort({ version: -1 })
      .lean();
  }

  // ── Get a specific analysis version by ID ─────────────────────────────

  async getAnalysisById(analysisId: string): Promise<IRiskAnalysis | null> {
    return await RiskAnalysis.findById(analysisId);
  }

  // ── Diff summary generation ───────────────────────────────────────────
  /**
   * Compares the current clause analysis with the previous version and returns
   * a diff summary highlighting which clauses changed risk level.
   *
   * Clauses are matched by `clauseType`. If a clauseType appears in both versions
   * with a different riskLevel, it's flagged as either "escalated" or "de-escalated".
   */
  generateDiffSummary(
    previousClauses: IClauseAnalysis[],
    currentClauses: IClauseAnalysis[],
    previousVersion: number,
  ): IDiffSummary {
    // Build a map of clauseType → riskLevel from the previous analysis
    const previousMap = new Map<string, { riskLevel: string; text: string }>();
    for (const clause of previousClauses) {
      previousMap.set(clause.clauseType, {
        riskLevel: clause.riskLevel,
        text: clause.clauseText,
      });
    }

    const changedClauses: IClauseDiff[] = [];

    for (const clause of currentClauses) {
      const prev = previousMap.get(clause.clauseType);
      if (!prev) continue; // new clause, not a change
      if (prev.riskLevel === clause.riskLevel) continue; // no change

      const prevWeight = RISK_WEIGHTS[prev.riskLevel] ?? 0;
      const currWeight = RISK_WEIGHTS[clause.riskLevel] ?? 0;

      changedClauses.push({
        clauseType: clause.clauseType,
        clauseText: clause.clauseText,
        previousRiskLevel: prev.riskLevel,
        currentRiskLevel: clause.riskLevel,
        direction: currWeight > prevWeight ? "escalated" : "de-escalated",
      });
    }

    return {
      comparedToVersion: previousVersion,
      changedClauses,
      totalChanged: changedClauses.length,
    };
  }

  // ── Full extraction pipeline (fire-and-forget safe) ───────────────────
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
    meta?: {
      userEmail?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      requestId?: string | null;
    },
  ): Promise<void> {
    try {
      await this.executionQueue.enqueue({
        contractId,
        userId,
        text,
        language,
        ...meta,
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

    const result = await orchestratorService.run(
      job.contractId,
      job.userId,
      job.text,
      job.language,
    );

    const duration = Date.now() - startTime;
    // record analysis metrics
    metrics.increment("analyses_completed");
    metrics.observe("analysis_duration_ms", duration);
    await this.saveAnalysis({
      contractId: job.contractId,
      userId: job.userId,
      executiveSummary: result.executiveSummary,
      clauseAnalysis: result.clauseAnalysis,
      analysisDuration: duration,
    });

    // ── Credits deduction ────────────────────────────────────────────────
    // Deduct the actual cost based on real token usage from the pipeline.
    // This runs AFTER a successful save so:
    //   - No charge on analysis failure or retries
    //   - No double-charge (deducted once per persisted analysis)
    try {
      const tokensUsed = result.tokensUsed;
      const actualCost = await creditsService.estimateCost(tokensUsed);
      await creditsService.deduct(job.userId, actualCost, {
        tokensUsed,
        contractId: job.contractId,
      });
      logger.info("creditsService: deducted credits after analysis", {
        userId: job.userId,
        contractId: job.contractId,
        tokensUsed,
        actualCost,
      });
    } catch (creditError) {
      // Non-fatal: log but do not fail the analysis job
      logger.error(
        `creditsService: deduction failed for user ${job.userId} / contract ${job.contractId}`,
        creditError,
      );
    }

    await auditLogService.logEvent({
      contractId: job.contractId,
      userId: job.userId,
      action: "ANALYSIS_COMPLETED",
      outcome: "success",
      userEmail: job.userEmail,
      ipAddress: job.ipAddress,
      userAgent: job.userAgent,
      requestId: job.requestId,
      metadata: {
        totalClauses: result.executiveSummary.totalClauses,
        durationMs: duration,
        modelUsed: result.extractionMeta.modelUsed,
        usedFallback: result.extractionMeta.usedFallback,
        tokensUsed: result.tokensUsed,
      },
    });

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

    await auditLogService.logEvent({
      contractId: job.contractId,
      userId: job.userId,
      action: "ANALYSIS_FAILED",
      outcome: "failure",
      userEmail: job.userEmail,
      ipAddress: job.ipAddress,
      userAgent: job.userAgent,
      requestId: job.requestId,
      metadata: {
        error: error.message,
      },
    });
  }
}

export const analysisService = new AnalysisService();
