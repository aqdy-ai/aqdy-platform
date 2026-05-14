import {
  RiskAnalysis,
  IRiskAnalysis,
  RiskAnalysisZodSchema,
} from "../models/riskAnalysis.model.js";
import { logger } from "../utils/logger.js";

export class AnalysisService {
  // حفظ نتيجة التحليل
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

  // جيب التحليل بالـ contract ID
  async getAnalysisByContractId(
    contractId: string,
  ): Promise<IRiskAnalysis | null> {
    return await RiskAnalysis.findOne({ contractId }).sort({ createdAt: -1 });
  }

  // جيب كل تحليلات الـ user
  async getAnalysesByUser(userId: string): Promise<IRiskAnalysis[]> {
    return await RiskAnalysis.find({ userId }).sort({ createdAt: -1 });
  }
}

export const analysisService = new AnalysisService();
