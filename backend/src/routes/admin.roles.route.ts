import { Router, Response } from "express";
import { User } from "../models/user.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import {
  authenticateJwt,
  requireRole,
} from "../middlewares/auth.middleware.js";
import {
  ADMIN_ROLES,
  isAdminRole,
  MAX_SUPER_ADMINS,
  ROLE_LABELS,
  type AdminRole,
} from "../config/roles.js";
import { logRole } from "../services/auditLog.service.js";
import { AuthenticatedRequest } from "../types/auth.js";

const router = Router();

// All endpoints in this router are Super Admin only
router.use(authenticateJwt, requireRole("super_admin"));

/**
 * GET /api/admin/roles
 * List all users with admin roles + Super Admin count
 */
router.get("/", async (req, res: Response) => {
  try {
    const adminUsers = await User.find({
      role: { $in: [...ADMIN_ROLES] },
    }).sort({ role: 1, createdAt: -1 });

    const superAdminCount = adminUsers.filter(
      (u) => u.role === "super_admin",
    ).length;

    return res.status(200).json({
      success: true,
      data: {
        adminUsers,
        superAdminCount,
        maxSuperAdmins: MAX_SUPER_ADMINS,
        superAdminWarning: superAdminCount >= MAX_SUPER_ADMINS,
        roleLabels: ROLE_LABELS,
        availableRoles: ADMIN_ROLES,
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/roles:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/admin/roles/assign
 * Assign an admin role to a user. Enforces max 2 Super Admin limit.
 * Body: { userId: string, role: AdminRole }
 */
router.post("/assign", async (req, res: Response) => {
  try {
    const { userId, role } = req.body;
    const authReq = req as AuthenticatedRequest;

    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        error: "userId and role are required.",
      });
    }

    if (!isAdminRole(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${ADMIN_ROLES.join(", ")}`,
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    // Prevent assigning the same role
    if (targetUser.role === role) {
      return res.status(400).json({
        success: false,
        error: `User already has the ${ROLE_LABELS[role as AdminRole]} role.`,
      });
    }

    // Enforce max Super Admin limit
    if (role === "super_admin") {
      const currentSuperAdmins = await User.countDocuments({
        role: "super_admin",
        status: "active",
      });
      if (currentSuperAdmins >= MAX_SUPER_ADMINS) {
        return res.status(400).json({
          success: false,
          error: `Cannot assign Super Admin role. Maximum of ${MAX_SUPER_ADMINS} active Super Admin accounts allowed. Revoke an existing Super Admin first.`,
          superAdminCount: currentSuperAdmins,
          maxSuperAdmins: MAX_SUPER_ADMINS,
        });
      }
    }

    const previousRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    // Audit log
    await logRole.assign(
      authReq,
      String(targetUser._id),
      targetUser.email,
      role,
      previousRole,
    );

    return res.status(200).json({
      success: true,
      message: `${ROLE_LABELS[role as AdminRole]} role assigned to ${targetUser.email}.`,
      data: targetUser,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/admin/roles/assign:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/admin/roles/revoke
 * Revoke an admin role (set back to "user").
 * Body: { userId: string }
 */
router.post("/revoke", async (req, res: Response) => {
  try {
    const { userId } = req.body;
    const authReq = req as AuthenticatedRequest;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required.",
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    // Prevent revoking your own role
    if (String(targetUser._id) === String(authReq.user?._id)) {
      return res.status(400).json({
        success: false,
        error: "You cannot revoke your own admin role.",
      });
    }

    if (!isAdminRole(targetUser.role)) {
      return res.status(400).json({
        success: false,
        error: "User does not have an admin role.",
      });
    }

    const previousRole = targetUser.role;
    targetUser.role = "user";
    await targetUser.save();

    // Audit log
    await logRole.revoke(
      authReq,
      String(targetUser._id),
      targetUser.email,
      previousRole,
    );

    return res.status(200).json({
      success: true,
      message: `Admin role revoked from ${targetUser.email}. Role reset to user.`,
      data: targetUser,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/admin/roles/revoke:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/admin/roles/audit-log
 * Full audit log of all role changes and sensitive admin actions.
 */
router.get("/audit-log", async (req, res: Response) => {
  try {
    const {
      page: pageRaw,
      pageSize: pageSizeRaw,
      action,
      dateFrom,
      dateTo,
    } = req.query;

    let page = parseInt(pageRaw as string, 10) || 1;
    let pageSize = parseInt(pageSizeRaw as string, 10) || 50;
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 50;
    if (pageSize > 200) pageSize = 200;

    const roleActions = [
      "ROLE_ASSIGNED",
      "ROLE_REVOKED",
      "ADMIN_EMAIL_VERIFY",
      "ADMIN_PASSWORD_RESET_TRIGGER",
      "ADMIN_CREDIT_ADJUSTMENT",
      "ADMIN_REFUND",
      "ADMIN_SUBSCRIPTION_CHANGE",
      "KB_ENTRY_CREATED",
      "KB_ENTRY_UPDATED",
      "KB_ENTRY_DELETED",
      "PROMPT_UPDATED",
    ];

    const filter: Record<string, unknown> = {
      action: action ? { $eq: action } : { $in: roleActions },
    };

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom as string);
      if (dateTo) dateFilter.$lte = new Date(dateTo as string);
      filter.timestamp = dateFilter;
    }

    const [data, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      AuditLog.countDocuments(filter),
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
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/roles/audit-log:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
