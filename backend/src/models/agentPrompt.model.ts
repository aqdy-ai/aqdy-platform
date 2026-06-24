import mongoose, { Document, Schema } from "mongoose";

export interface IAgentPrompt extends Document {
  agent: "extractor" | "riskClassifier" | "redline";
  prompt: string;
  updatedAt: Date;
}

const AgentPromptSchema = new Schema<IAgentPrompt>(
  {
    agent: {
      type: String,
      enum: ["extractor", "riskClassifier", "redline"],
      required: true,
      unique: true,
    },
    prompt: { type: String, required: true },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
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

export const AgentPrompt = mongoose.model<IAgentPrompt>(
  "AgentPrompt",
  AgentPromptSchema,
);
