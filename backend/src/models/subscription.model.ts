import mongoose, { Document, Schema } from "mongoose";
import { z } from "zod";

export const SubscriptionZodSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  status: z.enum(["active", "cancelled", "expired", "past_due"]),
});

export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "past_due";

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  startDate: Date;
  endDate: Date;
  renewalDate: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired", "past_due"],
      default: "active",
      index: true,
    },
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
    renewalDate: { type: Date, required: true },
    cancelledAt: { type: Date },
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
  },
);

SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ renewalDate: 1 });

export const Subscription = mongoose.model<ISubscription>(
  "Subscription",
  SubscriptionSchema,
);
