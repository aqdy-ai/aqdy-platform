import {
  RiskAnalysis,
  IRiskAnalysis,
  IClauseAnalysis,
  IDiffSummary,
  IClauseDiff,
  RiskAnalysisZodSchema,
} from "../models/riskAnalysis.model.js";
import { logger } from "../utils/logger.js";

const RISK_WEIGHTS: Record<string, number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export class AnalysisService {
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

    const previousAnalysis = await RiskAnalysis.findOne({
      contractId: data.contractId,
    }).sort({ version: -1 });

    const nextVersion = previousAnalysis ? previousAnalysis.version + 1 : 1;

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

  async getAnalysisByContractId(
    contractId: string,
  ): Promise<IRiskAnalysis | null> {
    return await RiskAnalysis.findOne({ contractId }).sort({ version: -1 });
  }

  async getAnalysesByUser(userId: string): Promise<IRiskAnalysis[]> {
    return await RiskAnalysis.find({ userId }).sort({ createdAt: -1 });
  }

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

  async getAnalysisById(analysisId: string): Promise<IRiskAnalysis | null> {
    return await RiskAnalysis.findById(analysisId);
  }

  generateDiffSummary(
    previousClauses: IClauseAnalysis[],
    currentClauses: IClauseAnalysis[],
    previousVersion: number,
  ): IDiffSummary {
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
      if (!prev) continue;
      if (prev.riskLevel === clause.riskLevel) continue;

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
}

export const analysisService = new AnalysisService();
