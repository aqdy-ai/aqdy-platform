import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Contract } from "../models/contract.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/admin/accounts
router.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page: pageRaw, pageSize: pageSizeRaw, planSlug, status, search } = req.query;

    const filter: Record<string, any> = {};

    if (planSlug && typeof planSlug === "string") {
      filter.planSlug = planSlug;
    }

    if (status && typeof status === "string") {
      filter.status = status;
    }

    if (search && typeof search === "string") {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    let page = parseInt(pageRaw as string, 10) || 1;
    let pageSize = parseInt(pageSizeRaw as string, 10) || 20;

    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 20;
    if (pageSize > 100) pageSize = 100;

    const [data, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      data,
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/accounts:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/accounts/:id
router.get("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid user ID format" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Fetch usage stats
    const contractsCount = await Contract.countDocuments({ userId: id });
    const totalSizeResult = await Contract.aggregate([
      { $match: { userId: id } },
      { $group: { _id: null, totalSize: { $sum: "$fileSize" } } },
    ]);
    const totalFileSizeBytes = totalSizeResult[0]?.totalSize || 0;

    // Fetch recent activity from AuditLog
    const recentActivity = await AuditLog.find({
      $or: [{ userId: new mongoose.Types.ObjectId(id) }, { userEmail: user.email }],
    })
      .sort({ timestamp: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      data: {
        user,
        subscription: {
          planSlug: user.planSlug,
          status: user.status === "suspended" ? "suspended" : "active",
        },
        usageStats: {
          contractsCount,
          totalFileSizeBytes,
        },
        recentActivity,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/accounts/:id:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/admin/accounts/:id
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { plan, planSlug, status, role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid user ID format" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Handle updates
    if (plan !== undefined) {
      if (!["free", "premium", "enterprise"].includes(plan)) {
        return res.status(400).json({ success: false, error: "Invalid plan type" });
      }
      user.planSlug = plan;
    } else if (planSlug !== undefined) {
      if (!["free", "premium", "enterprise"].includes(planSlug)) {
        return res.status(400).json({ success: false, error: "Invalid plan slug type" });
      }
      user.planSlug = planSlug;
    }

    if (status !== undefined) {
      if (!["active", "suspended"].includes(status)) {
        return res.status(400).json({ success: false, error: "Invalid status type" });
      }
      user.status = status;
    }

    if (role !== undefined) {
      if (!["admin", "user"].includes(role)) {
        return res.status(400).json({ success: false, error: "Invalid role type" });
      }
      user.role = role;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error("Error in PATCH /api/admin/accounts/:id:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/accounts/:id
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: "Confirmation flag 'confirm: true' is required in the body to delete this user",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid user ID format" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `User with ID ${id} has been hard deleted successfully.`,
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/admin/accounts/:id:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
