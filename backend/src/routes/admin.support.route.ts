import { Router, Response } from "express";
import { User } from "../models/user.model.js";
import { Contract } from "../models/contract.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import Payment from "../models/payment.model.js";
import {
  authenticateJwt,
  requirePermission,
} from "../middlewares/auth.middleware.js";
import { logSupport } from "../services/auditLog.service.js";
import { creditsService } from "../services/credits.service.js";
import { emailService } from "../services/email.service.js";
import { AuthenticatedRequest } from "../types/auth.js";
import mongoose from "mongoose";
import crypto from "crypto";

const router = Router();

// All support endpoints require accounts read permission at minimum
router.use(authenticateJwt, requirePermission("accounts", "read"));

/**
 * GET /api/admin/support/users/search
 * Search users by name or email
 */
router.get("/users/search", async (req, res: Response) => {
  try {
    const { q, page: pageRaw, pageSize: pageSizeRaw } = req.query;

    let page = parseInt(pageRaw as string, 10) || 1;
    let pageSize = parseInt(pageSizeRaw as string, 10) || 20;
    if (page < 1) page = 1;
    if (pageSize > 100) pageSize = 100;

    const filter: Record<string, unknown> = {};
    if (q && typeof q === "string") {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      data,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/admin/support/users/:id
 * User profile with account details, plan, credits, analysis history (read-only)
 */
router.get("/users/:id", async (req, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Get analysis history (read-only)
    const contracts = await Contract.find({ userId: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("filename uploadedAt language fileSize status");

    // Get payment history
    const payments = await Payment.find({ userId: id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("amount currency status createdAt planSlug");

    // Get recent audit activity
    const recentActivity = await AuditLog.find({
      $or: [
        { userId: new mongoose.Types.ObjectId(id) },
        { userEmail: user.email },
      ],
    })
      .sort({ timestamp: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      data: {
        user,
        analysisHistory: contracts,
        payments,
        recentActivity,
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/admin/support/users/:id/verify-email
 * Manually verify a user's email
 */
router.post(
  "/users/:id/verify-email",
  requirePermission("accounts", "write"),
  async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      if (user.isEmailVerified) {
        return res
          .status(400)
          .json({ success: false, error: "Email already verified" });
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpiresAt = undefined;
      await user.save();

      await logSupport.emailVerify(authReq, String(user._id), user.email);

      return res.status(200).json({
        success: true,
        message: `Email verified for ${user.email}`,
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

/**
 * POST /api/admin/support/users/:id/reset-password
 * Trigger a password reset email for a user
 */
router.post(
  "/users/:id/reset-password",
  requirePermission("accounts", "write"),
  async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Generate a reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.passwordResetToken = resetToken;
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      // Send reset email
      try {
        await emailService.sendPasswordResetEmail(
          user.email,
          user.name,
          resetToken,
        );
      } catch {
        // Log but don't fail the request
      }

      await logSupport.passwordReset(authReq, String(user._id), user.email);

      return res.status(200).json({
        success: true,
        message: `Password reset email triggered for ${user.email}`,
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

/**
 * POST /api/admin/support/users/:id/credit-adjustment
 * Adjust credits with mandatory reason
 * Body: { amount: number, reason: string }
 */
router.post(
  "/users/:id/credit-adjustment",
  requirePermission("accounts", "write"),
  async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const { amount, reason } = req.body;

      if (typeof amount !== "number" || amount === 0) {
        return res
          .status(400)
          .json({ success: false, error: "amount must be a non-zero number" });
      }
      if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
        return res
          .status(400)
          .json({ success: false, error: "reason is required (min 3 chars)" });
      }

      const user = await User.findById(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      if (amount > 0) {
        await creditsService.topup(
          String(user._id),
          amount,
          "manual_adjustment",
        );
      } else {
        await creditsService.deduct(String(user._id), Math.abs(amount), {
          reason: "manual_adjustment",
        });
      }

      // Refresh user to get updated balance
      const updatedUser = await User.findById(id);
      const newBalance = updatedUser?.creditBalance ?? 0;

      await logSupport.creditAdjustment(
        authReq,
        String(user._id),
        user.email,
        amount,
        reason.trim(),
        newBalance,
      );

      return res.status(200).json({
        success: true,
        message: `Credit adjustment of ${amount} applied to ${user.email}`,
        data: { newBalance },
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

export default router;
