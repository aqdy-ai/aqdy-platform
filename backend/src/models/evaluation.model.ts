import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Evaluation scores for a completed analysis.
 * Each metric is scored on a 1‑5 scale where 5 is best.
 * The `reasoning` object provides human‑readable justification for each metric.
 */
export interface IEvaluation extends Document {
  /** Reference to the RiskAnalysis document this evaluation belongs to */
  analysisId: Types.ObjectId;
  /** Langfuse trace identifier for tracing the evaluation */
  traceId: string;
  /** Faithfulness score (1‑5) */
  faithfulness: number;
  /** Answer relevancy score (1‑5) */
  relevancy: number;
  /** Context precision score (1‑5) */
  precision: number;
  /** Context recall score (1‑5) */
  recall: number;
  /** Optional detailed justification for each metric */
  reasoning: {
    faithfulness?: string;
    relevancy?: string;
    precision?: string;
    recall?: string;
    overall?: string;
  };
  /** When the evaluation was recorded */
  createdAt: Date;
}

const EvaluationSchema = new Schema<IEvaluation>(
  {
    analysisId: {
      type: Schema.Types.ObjectId,
      ref: "RiskAnalysis",
      required: true,
    },
    traceId: { type: String, required: true },
    faithfulness: { type: Number, min: 1, max: 5, required: true },
    relevancy: { type: Number, min: 1, max: 5, required: true },
    precision: { type: Number, min: 1, max: 5, required: true },
    recall: { type: Number, min: 1, max: 5, required: true },
    reasoning: {
      faithfulness: { type: String },
      relevancy: { type: String },
      precision: { type: String },
      recall: { type: String },
      overall: { type: String },
    },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Ensure a unique evaluation per analysis (one‑to‑one relationship)
EvaluationSchema.index({ analysisId: 1 }, { unique: true });

export const Evaluation = mongoose.model<IEvaluation>(
  "Evaluation",
  EvaluationSchema,
);
