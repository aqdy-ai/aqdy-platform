import bcrypt from "bcryptjs";
import { AppError } from "../middlewares/errorHandler.js";
import { User, IUser } from "../models/user.model.js";
import { UpdateProfileInput, ProfileResponse } from "../types/account.js";

export const getProfile = async (userId: string): Promise<ProfileResponse> => {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user || user.status !== "active") {
    throw new AppError(404, "User not found or inactive.");
  }

  return {
    name: user.name,
    email: user.email,
    plan: user.plan,
    memberSince: (user as unknown as { createdAt: Date }).createdAt,
    lastLogin: user.lastLogin,
    hasPassword: !!user.passwordHash,
  };
};

export const updateProfile = async (
  userId: string,
  data: UpdateProfileInput,
): Promise<IUser> => {
  // Select passwordHash so verifyPassword works
  const user = await User.findById(userId).select("+passwordHash");
  if (!user || user.status !== "active") {
    throw new AppError(404, "User not found or inactive.");
  }

  if (data.name) {
    user.name = data.name.trim();
  }

  if (data.email) {
    const normalizedEmail = data.email.toLowerCase().trim();
    if (normalizedEmail !== user.email) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        throw new AppError(409, "Email already in use.");
      }
      user.email = normalizedEmail;
    }
  }

  if (data.password) {
    const isGoogleWithoutPassword = user.googleId && !user.passwordHash;

    if (!isGoogleWithoutPassword) {
      if (!data.currentPassword) {
        throw new AppError(
          400,
          "Current password is required to change password.",
        );
      }

      const valid = await user.verifyPassword(data.currentPassword);

      if (!valid) {
        throw new AppError(403, "Invalid current password.");
      }
    }

    user.passwordHash = await bcrypt.hash(data.password, 12);
  }

  await user.save();
  return user;
};

export const deleteAccount = async (userId: string): Promise<void> => {
  const user = await User.findById(userId);
  if (!user || user.status === "deleted") {
    throw new AppError(404, "User not found or already deleted.");
  }

  user.status = "deleted";
  // We can also nullify refresh tokens to log them out globally
  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;

  await user.save();
};
