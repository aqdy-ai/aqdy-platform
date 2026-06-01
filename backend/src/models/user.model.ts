import mongoose, { Document, Schema } from "mongoose";
import { z } from "zod";

export const UserZodSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: z.enum(["admin", "user"]).default("user"),
  status: z.enum(["active", "suspended"]).default("active"),
  planSlug: z.enum(["free", "premium", "enterprise"]).default("free"),
});

export interface IUser extends Document {
  name: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "suspended";
  planSlug: "free" | "premium" | "enterprise";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 255 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
    planSlug: {
      type: String,
      enum: ["free", "premium", "enterprise"],
      default: "free",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "User",
  },
);

export const User = mongoose.model<IUser>("User", UserSchema);
