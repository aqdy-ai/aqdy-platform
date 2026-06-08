import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import Payment from "../models/payment.model.js";
import { authenticateJwt } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

const VALID_STATUSES = ["pending", "succeeded", "failed", "refunded"] as const;

/**
 * GET /api/admin/payments
 *
 * Paginated list of all payments across all accounts.
 *
 * Query parameters:
 *   status    – filter by payment status (pending|succeeded|failed|refunded)
 *   userId    – filter by user ObjectId
 *   dateFrom  – ISO date string; matches createdAt >= dateFrom
 *   dateTo    – ISO date string; matches createdAt <= dateTo
 *   page      – page number (default 1)
 *   pageSize  – results per page (default 20, max 100)
 *
 * Each payment includes a populated `userId` sub-document with
 * name, email, planSlug and status fields.
 *
 * IMPORTANT: This route file is intentionally separate from payment.route.ts
 * because that router is mounted before express.json() to support Stripe
 * webhook raw body parsing. This router must be registered AFTER express.json().
 *
 */
router.get(
  "/",
  authenticateJwt,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const {
        status,
        userId,
        dateFrom,
        dateTo,
        page: pageRaw,
        pageSize: pageSizeRaw,
      } = req.query;

      const filter: Record<string, unknown> = {};

      // ── status filter ─────────────────────────────────────────────────────
      if (status !== undefined) {
        if (
          typeof status !== "string" ||
          !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
        ) {
          return res.status(400).json({
            success: false,
            error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
          });
        }
        filter.status = status;
      }

      // ── userId filter ─────────────────────────────────────────────────────
      if (userId !== undefined) {
        if (
          typeof userId !== "string" ||
          !mongoose.Types.ObjectId.isValid(userId)
        ) {
          return res.status(400).json({
            success: false,
            error: "Invalid userId: must be a valid MongoDB ObjectId",
          });
        }
        filter.userId = new mongoose.Types.ObjectId(userId);
      }

      // ── date range filter ─────────────────────────────────────────────────
      if (dateFrom !== undefined || dateTo !== undefined) {
        const dateFilter: Record<string, Date> = {};

        if (dateFrom !== undefined) {
          if (typeof dateFrom !== "string" || isNaN(Date.parse(dateFrom))) {
            return res.status(400).json({
              success: false,
              error: "Invalid dateFrom: must be a valid ISO date string",
            });
          }
          dateFilter.$gte = new Date(dateFrom);
        }

        if (dateTo !== undefined) {
          if (typeof dateTo !== "string" || isNaN(Date.parse(dateTo))) {
            return res.status(400).json({
              success: false,
              error: "Invalid dateTo: must be a valid ISO date string",
            });
          }
          dateFilter.$lte = new Date(dateTo);
        }

        filter.createdAt = dateFilter;
      }

      // ── pagination ────────────────────────────────────────────────────────
      let page = parseInt(pageRaw as string, 10) || 1;
      let pageSize = parseInt(pageSizeRaw as string, 10) || 20;

      if (page < 1) page = 1;
      if (pageSize < 1) pageSize = 20;
      if (pageSize > 100) pageSize = 100;

      // ── query ─────────────────────────────────────────────────────────────
      const [data, total] = await Promise.all([
        Payment.find(filter)
          .populate("userId", "name email planSlug status")
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize),
        Payment.countDocuments(filter),
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
        filters: {
          status: status ?? null,
          userId: userId ?? null,
          dateFrom: dateFrom ?? null,
          dateTo: dateTo ?? null,
        },
        data,
      });
    } catch (error: unknown) {
      console.error("Error in GET /api/admin/payments:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

export default router;
