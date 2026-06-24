import mongoose, { Document, Schema } from "mongoose";

export interface IKnowledgeBase extends Document {
  clauseText: string;
  contractType: string;
  category: string;
  jurisdiction: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  clausePattern: string;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeBaseSchema = new Schema<IKnowledgeBase>(
  {
    clauseText: { type: String, required: true, trim: true },
    contractType: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    jurisdiction: {
      type: String,
      required: true,
      trim: true,
      default: "General",
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
      default: "medium",
    },
    clausePattern: { type: String, default: "", maxlength: 2000 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

KnowledgeBaseSchema.index({
  clauseText: "text",
  clausePattern: "text",
  category: "text",
});
KnowledgeBaseSchema.index({ contractType: 1 });
KnowledgeBaseSchema.index({ category: 1 });
KnowledgeBaseSchema.index({ jurisdiction: 1 });
KnowledgeBaseSchema.index({ riskLevel: 1 });

export const KnowledgeBase = mongoose.model<IKnowledgeBase>(
  "KnowledgeBase",
  KnowledgeBaseSchema,
);
