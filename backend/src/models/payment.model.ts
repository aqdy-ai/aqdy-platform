import mongoose, { Document, Schema } from "mongoose";

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  subscriptionId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  provider: string;
  providerTxId: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded"],
      default: "pending",
      required: true,
    },
    provider: { type: String, required: true },
    providerTxId: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
  },
  {
    timestamps: true,
  },
);

// Indexes
PaymentSchema.index({ userId: 1, createdAt: -1 });

const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
