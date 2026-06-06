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

export interface IClauseDiff {
  clauseType: string;
  clauseText: string;
  previousRiskLevel: string;
  currentRiskLevel: string;
  direction: "escalated" | "de-escalated";
}

export interface IDiffSummary {
  comparedToVersion: number;
  changedClauses: IClauseDiff[];
  totalChanged: number;
}

export interface IRiskAnalysis extends Document {
  contractId: mongoose.Types.ObjectId;
  userId: string;
  version: number;
  executiveSummary: {
    overallRisk: "low" | "medium" | "high" | "critical";
    totalClauses: number;
    riskyClausesCount: number;
    summary: { ar: string; en: string };
  };
  clauseAnalysis: IClauseAnalysis[];
  diffSummary: IDiffSummary | null;
  analysisDuration: number;
  createdAt: Date;
}

const ClauseDiffSchema = new Schema<IClauseDiff>(
  {
    clauseType: { type: String, required: true },
    clauseText: { type: String, required: true },
    previousRiskLevel: { type: String, required: true },
    currentRiskLevel: { type: String, required: true },
    direction: {
      type: String,
      enum: ["escalated", "de-escalated"],
      required: true,
    },
  },
  { _id: false },
);

const DiffSummarySchema = new Schema<IDiffSummary>(
  {
    comparedToVersion: { type: Number, required: true },
    changedClauses: [ClauseDiffSchema],
    totalChanged: { type: Number, required: true },
  },
  { _id: false },
);

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
    version: { type: Number, required: true, min: 1, default: 1 },
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
    diffSummary: { type: DiffSummarySchema, default: null },
    analysisDuration: { type: Number, required: true },
  },
  { timestamps: true },
);

RiskAnalysisSchema.index({ contractId: 1, version: -1 }, { unique: true });
RiskAnalysisSchema.index({ contractId: 1, createdAt: -1 });
RiskAnalysisSchema.index({ userId: 1, createdAt: -1 });

export const RiskAnalysis = mongoose.model<IRiskAnalysis>(
  "RiskAnalysis",
  RiskAnalysisSchema,
);
