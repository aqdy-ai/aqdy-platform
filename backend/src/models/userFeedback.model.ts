import mongoose, { Document, Schema, Types } from "mongoose";

export type FeedbackTargetType = "analysis" | "clause" | "chat_message";
export type FeedbackType = "thumbs_up" | "thumbs_down" | "report";
export type ReportCategory = "inaccurate" | "offensive" | "unclear" | "other";

export interface IUserFeedback extends Document {
  userId: Types.ObjectId;
  targetType: FeedbackTargetType;
  targetId: string;
  feedbackType: FeedbackType;
  contractId?: Types.ObjectId;
  analysisId?: Types.ObjectId;
  comment?: string;
  category?: ReportCategory;
  createdAt: Date;
}

const UserFeedbackSchema = new Schema<IUserFeedback>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["analysis", "clause", "chat_message"],
      required: true,
    },
    targetId: { type: String, required: true },
    feedbackType: {
      type: String,
      enum: ["thumbs_up", "thumbs_down", "report"],
      required: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
    },
    analysisId: {
      type: Schema.Types.ObjectId,
      ref: "RiskAnalysis",
    },
    comment: { type: String, maxlength: 1000 },
    category: {
      type: String,
      enum: ["inaccurate", "offensive", "unclear", "other"],
    },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

UserFeedbackSchema.index({ userId: 1, targetType: 1, targetId: 1 });
UserFeedbackSchema.index({ analysisId: 1 });

export const UserFeedback = mongoose.model<IUserFeedback>(
  "UserFeedback",
  UserFeedbackSchema,
);
