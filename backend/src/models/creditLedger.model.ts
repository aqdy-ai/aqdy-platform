import mongoose, { Document, Schema } from "mongoose";

export type CreditLedgerReason =
  | "plan_topup"
  | "analysis_deduction"
  | "chat_deduction"
  | "manual_adjustment"
  | "plan_reset"
  | "refund";

export interface CreditMetadata {
  tokensUsed?: number;
  hostingCost?: number;
  contractId?: string;
  reason?: CreditLedgerReason;
}

export interface ICreditLedger extends Document {
  userId: mongoose.Types.ObjectId;
  delta: number;
  balanceAfter: number;
  reason: CreditLedgerReason;
  metadata: {
    tokensUsed?: number;
    hostingCost?: number;
    contractId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CreditLedgerSchema = new Schema<ICreditLedger>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    delta: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: {
      type: String,
      required: true,
      enum: [
        "plan_topup",
        "analysis_deduction",
        "chat_deduction",
        "manual_adjustment",
        "refund",
      ],
    },
    metadata: {
      tokensUsed: { type: Number },
      hostingCost: { type: Number },
      contractId: { type: String, trim: true },
    },
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

CreditLedgerSchema.index({ userId: 1, createdAt: -1 });

export const CreditLedger = mongoose.model<ICreditLedger>(
  "CreditLedger",
  CreditLedgerSchema,
);
