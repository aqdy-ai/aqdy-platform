import mongoose, { Document, Schema } from "mongoose";
import { z } from "zod";

export const RiskAnalysisZodSchema = z.object({
  contractId: z.string().min(1),
  userId: z.string().min(1),
  analysisDuration: z.number().nonnegative(),
});

export interface IClauseAnalysis {
  clauseText: string;
  clauseType: string;
  riskLevel: "low" | "medium" | "high" | "critical" | "unknown";
  confidence: number;
  lowConfidenceWarning: boolean; // ← جديد
  kbCitationMissing: boolean; // ← جديد
  explanation: { ar: string; en: string };
  sourceFromKB: string | null;
  classificationDurationMs?: number;
  redlineSuggestion?: string;
  redlineDurationMs?: number;
}

export interface IRiskAnalysis extends Document {
  contractId: mongoose.Types.ObjectId;
  userId: string;
  executiveSummary: {
    overallRisk: "low" | "medium" | "high" | "critical";
    totalClauses: number;
    riskyClausesCount: number;
    summary: { ar: string; en: string };
  };
  clauseAnalysis: IClauseAnalysis[];
  analysisDuration: number;
  createdAt: Date;
}

const ClauseAnalysisSchema = new Schema<IClauseAnalysis>({
  clauseText: { type: String, required: true },
  clauseType: { type: String, required: true },
  riskLevel: {
    type: String,
    enum: ["low", "medium", "high", "critical", "unknown"],
    required: true,
  },
  confidence: { type: Number, min: 0, max: 1, required: true },
  lowConfidenceWarning: { type: Boolean, default: false }, // ← جديد
  kbCitationMissing: { type: Boolean, default: false }, // ← جديد
  explanation: {
    ar: { type: String, required: true },
    en: { type: String, required: true },
  },
  sourceFromKB: { type: String, default: null },
  classificationDurationMs: { type: Number, min: 0 },
  redlineSuggestion: { type: String },
  redlineDurationMs: { type: Number, min: 0 },
});

const RiskAnalysisSchema = new Schema<IRiskAnalysis>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    executiveSummary: {
      overallRisk: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        required: true,
      },
      totalClauses: { type: Number, required: true },
      riskyClausesCount: { type: Number, required: true },
      summary: {
        ar: { type: String, required: true },
        en: { type: String, required: true },
      },
    },
    clauseAnalysis: [ClauseAnalysisSchema],
    analysisDuration: { type: Number, required: true },
  },
  { timestamps: true },
);

RiskAnalysisSchema.index({ contractId: 1, createdAt: -1 });
RiskAnalysisSchema.index({ userId: 1, createdAt: -1 });

export const RiskAnalysis = mongoose.model<IRiskAnalysis>(
  "RiskAnalysis",
  RiskAnalysisSchema,
);
