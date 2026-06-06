import bcrypt from "bcryptjs";
import mongoose, { Document, Schema } from "mongoose";
import { z } from "zod";

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended" | "deleted";

export const UserZodSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(100)
    .refine((val) => /\p{L}/u.test(val), {
      message: "Name must include at least 3 letter",
    })
    .transform((s) => s.trim()),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must include uppercase, lowercase, number, and special character",
    ),
});

export type UserRegisterInput = z.infer<typeof UserZodSchema>;

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  passwordHash: string;
  role: UserRole;
  plan: string;
  planSlug: string;
  creditBalance: number;
  status: UserStatus;
  lastLogin?: Date;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  verifyPassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    plan: { type: String, required: true, default: "free" },
    planSlug: {
      type: String,
      enum: ["free", "premium", "enterprise"],
      default: "free",
      index: true,
    },
    creditBalance: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
      index: true,
    },
    lastLogin: { type: Date },
    refreshToken: { type: String, select: false },
    refreshTokenExpiresAt: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret.passwordHash;
        delete ret.refreshToken;
        delete ret.refreshTokenExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_, ret) {
        delete ret.passwordHash;
        delete ret.refreshToken;
        delete ret.refreshTokenExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
  },
);

UserSchema.virtual("password")
  .set(function (this: IUser & { _password?: string }, password: string) {
    this._password = password;
  })
  .get(function (this: IUser & { _password?: string }) {
    return this._password;
  });

UserSchema.pre<IUser>("validate", async function () {
  const current = this as IUser & { _password?: string };
  if (!current._password) {
    return;
  }

  current.passwordHash = await bcrypt.hash(current._password, 12);
});

UserSchema.methods.verifyPassword = async function (password: string) {
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model<IUser>("User", UserSchema);
