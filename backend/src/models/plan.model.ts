import mongoose, { Document, Schema } from "mongoose";
import { z } from "zod";

export const PlanZodSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must be URL-safe (lowercase, numbers, and hyphens)",
    ),
  price: z.number().nonnegative().nullable().optional(),
  billingCycle: z.enum(["monthly", "annual"]),
  features: z.array(z.string()),
  analysisLimit: z.number().int(), // -1 for unlimited
  storageLimit: z.number().int(), // -1 for unlimited
  creditAllowance: z.number().int().nonnegative().default(0),
  stripePriceId: z.string().optional(),
  stripeAnnualPriceId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export interface IPlan extends Document {
  name: string;
  slug: string;
  price: number | null;
  billingCycle: "monthly" | "annual";
  features: string[];
  analysisLimit: number;
  storageLimit: number;
  creditAllowance: number;
  stripePriceId?: string;
  stripeAnnualPriceId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    price: { type: Number, default: null }, // null represents custom pricing / TBD
    billingCycle: {
      type: String,
      enum: ["monthly", "annual"],
      required: true,
    },
    features: { type: [String], required: true, default: [] },
    analysisLimit: { type: Number, required: true }, // -1 for unlimited
    storageLimit: { type: Number, required: true }, // -1 for unlimited
    creditAllowance: { type: Number, required: true, default: 0, min: 0 },
    stripePriceId: { type: String, default: null },
    stripeAnnualPriceId: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
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

export const Plan = mongoose.model<IPlan>("Plan", PlanSchema);
