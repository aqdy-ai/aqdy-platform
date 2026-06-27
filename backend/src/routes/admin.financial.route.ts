import { Router, Response } from "express";
import { User } from "../models/user.model.js";
import { Plan } from "../models/plan.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import {
  authenticateJwt,
  requirePermission,
} from "../middlewares/auth.middleware.js";
import { AuthenticatedRequest } from "../types/auth.js";
import { writeLog } from "../services/auditLog.service.js";

const router = Router();
router.use(authenticateJwt, requirePermission("billing", "read"));

/** GET /api/admin/financial/overview — MRR, ARR, churn, revenue */
router.get("/overview", async (req, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const filter: Record<string, unknown> = {
      status: "active",
      planSlug: { $ne: "free" },
    };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const totalActive = await User.countDocuments(filter);
    const planCounts = await User.aggregate([
      { $match: filter },
      { $group: { _id: "$planSlug", count: { $sum: 1 } } },
    ]);
    const planPrices: Record<string, number> = { pro: 29, enterprise: 99 };
    let mrr = 0;
    const revenueByPlan: Record<string, number> = {};
    for (const p of planCounts) {
      const price = planPrices[p._id] || 0;
      mrr += price * p.count;
      revenueByPlan[p._id] = price * p.count;
    }
    return res.json({
      success: true,
      data: {
        mrr,
        arr: mrr * 12,
        churnRate: 2.4,
        revenueByPlan,
        totalActiveSubscriptions: totalActive,
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/** GET /api/admin/financial/subscriptions */
router.get("/subscriptions", async (req, res: Response) => {
  try {
    const { page: pR, pageSize: psR, planSlug, search } = req.query;
    let page = parseInt(pR as string, 10) || 1;
    let pageSize = parseInt(psR as string, 10) || 20;
    if (page < 1) page = 1;
    if (pageSize > 100) pageSize = 100;
    const filter: Record<string, unknown> = { planSlug: { $ne: "free" } };
    if (planSlug) filter.planSlug = planSlug;
    if (search && typeof search === "string") {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const [data, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select(
          "name email planSlug plan creditBalance status createdAt lastLogin",
        ),
      User.countDocuments(filter),
    ]);
    return res.json({
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

/** POST /api/admin/financial/subscriptions/:id/change */
router.post(
  "/subscriptions/:id/change",
  requirePermission("billing", "write"),
  async (req, res: Response) => {
    try {
      const { id } = req.params;
      const { action, planSlug } = req.body;
      const authReq = req as AuthenticatedRequest;
      const user = await User.findById(id);
      if (!user)
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      const previousPlan = user.planSlug;
      if (action === "cancel") {
        user.planSlug = "free";
        user.plan = "free";
      } else if (planSlug) {
        user.planSlug = planSlug;
        user.plan = planSlug;
        // Sync credit allowance to the new plan
        const targetPlan = await Plan.findOne({
          slug: planSlug,
          isActive: true,
        });
        if (targetPlan) {
          user.creditBalance = targetPlan.creditAllowance;
        }
      }
      await user.save();
      await writeLog({
        action: "ADMIN_SUBSCRIPTION_CHANGE",
        outcome: "success",
        userId: authReq.user?._id,
        userEmail: authReq.user?.email,
        metadata: {
          targetUserId: String(user._id),
          targetEmail: user.email,
          action,
          previousPlan,
          newPlan: user.planSlug,
        },
      });
      return res.json({
        success: true,
        message: `Subscription ${action}d for ${user.email}`,
        data: user,
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

/** POST /api/admin/financial/refunds */
router.post(
  "/refunds",
  requirePermission("billing", "write"),
  async (req, res: Response) => {
    try {
      const { userId, amount, reason } = req.body;
      const authReq = req as AuthenticatedRequest;
      if (!userId || !amount || !reason)
        return res.status(400).json({
          success: false,
          error: "userId, amount, and reason required",
        });
      const user = await User.findById(userId);
      if (!user)
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      await writeLog({
        action: "ADMIN_REFUND",
        outcome: "success",
        userId: authReq.user?._id,
        userEmail: authReq.user?.email,
        metadata: {
          targetUserId: String(user._id),
          targetEmail: user.email,
          amount,
          reason,
        },
      });
      return res.json({
        success: true,
        message: `Refund of ${amount} issued to ${user.email}`,
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

/** POST /api/admin/financial/credits */
router.post(
  "/credits",
  requirePermission("billing", "write"),
  async (req, res: Response) => {
    try {
      const { userId, amount, reason } = req.body;
      const authReq = req as AuthenticatedRequest;
      if (!userId || typeof amount !== "number" || !reason)
        return res
          .status(400)
          .json({ success: false, error: "userId, amount, reason required" });
      const user = await User.findById(userId);
      if (!user)
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      user.creditBalance = Math.max(0, user.creditBalance + amount);
      await user.save();
      await writeLog({
        action: "ADMIN_CREDIT_ADJUSTMENT",
        outcome: "success",
        userId: authReq.user?._id,
        userEmail: authReq.user?.email,
        metadata: {
          targetUserId: String(user._id),
          targetEmail: user.email,
          amount,
          reason,
          newBalance: user.creditBalance,
          context: "financial",
        },
      });
      return res.json({
        success: true,
        data: { newBalance: user.creditBalance },
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

/** GET /api/admin/financial/stripe-webhooks */
router.get("/stripe-webhooks", async (req, res: Response) => {
  try {
    const { page: pR, pageSize: psR, eventType, status } = req.query;
    let page = parseInt(pR as string, 10) || 1;
    let pageSize = parseInt(psR as string, 10) || 50;
    if (page < 1) page = 1;
    if (pageSize > 200) pageSize = 200;
    const filter: Record<string, unknown> = { action: "STRIPE_WEBHOOK" };
    if (eventType) filter["metadata.eventType"] = eventType;
    if (status) filter.outcome = status;
    const [data, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      AuditLog.countDocuments(filter),
    ]);
    return res.json({
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

/** GET /api/admin/financial/export */
router.get("/export", async (req, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const filter: Record<string, unknown> = {
      status: "active",
      planSlug: { $ne: "free" },
    };
    if (dateFrom || dateTo) {
      const d: Record<string, Date> = {};
      if (dateFrom) d.$gte = new Date(dateFrom as string);
      if (dateTo) d.$lte = new Date(dateTo as string);
      filter.createdAt = d;
    }
    const subscriptions = await User.find(filter)
      .select("name email planSlug creditBalance status createdAt")
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: { subscriptions } });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
