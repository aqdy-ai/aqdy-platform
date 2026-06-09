import mongoose, { Document, Schema } from "mongoose";
import { z } from "zod";

export const ContractZodSchema = z.object({
  filename: z.string().min(1).max(255),
  language: z.enum(["ar", "en"]),
  text: z.string().min(1),
  userId: z.string().min(1),
  fileSize: z.number().positive(),
});

export interface IContract extends Document {
  filename: string;
  uploadedAt: Date;
  language: "ar" | "en";
  text: string;
  userId: string;
  fileSize: number;
  deletedAt: Date | null;
}

const ContractSchema = new Schema<IContract>(
  {
    filename: { type: String, required: true, trim: true, maxlength: 255 },
    uploadedAt: { type: Date, default: Date.now },
    language: { type: String, enum: ["ar", "en"], required: true },
    text: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    fileSize: { type: Number, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ContractSchema.index({ userId: 1, uploadedAt: -1 });
ContractSchema.index({ userId: 1, deletedAt: 1 });
ContractSchema.index({ language: 1 });

export const Contract = mongoose.model<IContract>("Contract", ContractSchema);