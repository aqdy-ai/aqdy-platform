import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import {
  AuditAction,
  AuditLog,
  ACTION_TYPES,
  AuditOutcome,
  OUTCOMES,
} from "../models/auditLog.model.js";
import { logAdmin } from "../services/auditLog.service.js";
import { authenticateJwt, requirePermission } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/admin/audit-logs
router.get("/", authenticateJwt, requirePermission("audit_log", "read"), async (req: Request, res: Response) => {
  try {
    const {
      userId,
      action,
      outcome,
      email,
      dateFrom,
      dateTo,
      page: pageRaw,
      pageSize: pageSizeRaw,
      traceId,
    } = req.query;

    const filter: Record<string, unknown> = {};

    // Validate and filter by userId
    if (userId) {
      if (
        typeof userId !== "string" ||
        !mongoose.Types.ObjectId.isValid(userId)
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid userId format" });
      }
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    // Validate and filter by action
    if (action) {
      if (
        typeof action !== "string" ||
        !ACTION_TYPES.includes(action as AuditAction)
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid action value" });
      }
      filter.action = action;
    }

    // Validate and filter by outcome
    if (outcome) {
      if (
        typeof outcome !== "string" ||
        !OUTCOMES.includes(outcome as AuditOutcome)
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid outcome value" });
      }
      filter.outcome = outcome;
    }

    // Filter by traceId
    if (traceId && typeof traceId === "string") {
      filter.langfuseTraceId = traceId;
    }

    // Filter by email (partial case-insensitive match)
    if (email && typeof email === "string") {
      filter.userEmail = { $regex: email, $options: "i" };
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom && typeof dateFrom === "string") {
        filter.timestamp.$gte = new Date(dateFrom);
      }
      if (dateTo && typeof dateTo === "string") {
        filter.timestamp.$lte = new Date(dateTo);
      }
    }

    // Parse pagination parameters
    let page = parseInt(pageRaw as string, 10) || 1;
    let pageSize = parseInt(pageSizeRaw as string, 10) || 20;

    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 20;
    if (pageSize > 100) pageSize = 100; // capped at 100

    // Run query and count in parallel
    const [data, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      AuditLog.countDocuments(filter),
    ]);

    // Log the admin access itself (non-blocking)
    const activeFilters = {
      userId,
      action,
      outcome,
      email,
      dateFrom,
      dateTo,
      traceId,
    };
    await logAdmin.viewLogs(req, activeFilters, data.length);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
      filters: activeFilters,
      data,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/audit-logs:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/admin/audit-logs/actions
router.get("/actions", authenticateJwt, requirePermission("audit_log", "read"), async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      data: ACTION_TYPES,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/audit-logs/actions:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/admin/audit-logs/stats
router.get("/stats", authenticateJwt, requirePermission("audit_log", "read"), async (req: Request, res: Response) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalEvents, failedLogins, contractUploads, agentRuns] =
      await Promise.all([
        AuditLog.countDocuments({ timestamp: { $gte: oneDayAgo } }),
        AuditLog.countDocuments({
          action: "AUTH_LOGIN_FAILED",
          timestamp: { $gte: oneDayAgo },
        }),
        AuditLog.countDocuments({
          action: { $in: ["CONTRACT_UPLOAD", "CONTRACT_UPLOADED"] },
          timestamp: { $gte: oneDayAgo },
        }),
        AuditLog.countDocuments({
          action: {
            $in: [
              "AGENT_EXTRACTOR",
              "AGENT_RISK_CLASSIFIER",
              "AGENT_REDLINE",
              "AGENT_PIPELINE",
            ],
          },
          timestamp: { $gte: oneDayAgo },
        }),
      ]);

    return res.status(200).json({
      success: true,
      last24h: {
        totalEvents,
        failedLogins,
        contractUploads,
        agentRuns,
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/audit-logs/stats:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
