import { Router, Request, Response } from "express";
import { Contract } from "../models/contract.model.js";
import { RiskAnalysis } from "../models/riskAnalysis.model.js";
import {
  authenticateJwt,
  requirePermission,
} from "../middlewares/auth.middleware.js";
import { User } from "../models/user.model.js";

const router = Router();

const VALID_STATUSES = ["analyzed", "pending", "failed"] as const;
const VALID_RISK_LEVELS = ["critical", "high", "medium", "low"] as const;

/**
 * GET /api/admin/contracts
 *
 * Paginated list of all contracts across all accounts.
 *
 * Query parameters:
 *   status    – filter by contract analysis status (analyzed|pending|failed)
 *   riskLevel – filter by risk level (critical|high|medium|low)
 *   dateFrom  – ISO date string; matches uploadedAt >= dateFrom
 *   dateTo    – ISO date string; matches uploadedAt <= dateTo
 *   search    – search by filename (case-insensitive)
 *   page      – page number (default 1)
 *   pageSize  – results per page (default 20, max 100)
 *
 * Each contract is enriched with owner info (name, email) and
 * risk analysis data (status, riskLevel) if available.
 */
router.get(
  "/",
  authenticateJwt,
  requirePermission("contracts", "read"),
  async (req: Request, res: Response) => {
    try {
      const {
        status,
        riskLevel,
        dateFrom,
        dateTo,
        search,
        page: pageRaw,
        pageSize: pageSizeRaw,
      } = req.query;

      const filter: Record<string, unknown> = {
        deletedAt: null, // Exclude soft-deleted contracts
      };

      // ── search filter ──────────────────────────────────────────────────
      if (search && typeof search === "string") {
        filter.filename = { $regex: search, $options: "i" };
      }

      // ── date range filter ──────────────────────────────────────────────
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

        filter.uploadedAt = dateFilter;
      }

      // ── pagination ─────────────────────────────────────────────────────
      let page = parseInt(pageRaw as string, 10) || 1;
      let pageSize = parseInt(pageSizeRaw as string, 10) || 20;

      if (page < 1) page = 1;
      if (pageSize < 1) pageSize = 20;
      if (pageSize > 100) pageSize = 100;

      // ── query contracts ────────────────────────────────────────────────
      const [contracts, total] = await Promise.all([
        Contract.find(filter)
          .sort({ uploadedAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
        Contract.countDocuments(filter),
      ]);

      // ── Enrich with owner info and risk analysis ───────────────────────
      const userIds = [...new Set(contracts.map((c) => c.userId))];
      const contractIds = contracts.map((c) => c._id!.toString());

      const [users, analyses] = await Promise.all([
        User.find({ _id: { $in: userIds } })
          .select("name email")
          .lean(),
        RiskAnalysis.find({ contractId: { $in: contractIds } })
          .select("contractId overallRisk status")
          .lean(),
      ]);

      // Build lookup maps
      const userMap = new Map(users.map((u) => [u._id.toString(), u]));
      const analysisMap = new Map(
        analyses.map((a) => [a.contractId?.toString(), a]),
      );

      // Build enriched data
      let enrichedContracts = contracts.map((contract) => {
        const owner = userMap.get(contract.userId) || null;
        const analysis = analysisMap.get(contract._id!.toString()) || null;

        return {
          _id: contract._id,
          filename: contract.filename,
          uploadedAt: contract.uploadedAt,
          language: contract.language,
          fileSize: contract.fileSize,
          owner: owner
            ? {
                _id: (owner as Record<string, unknown>)._id,
                name: (owner as Record<string, unknown>).name,
                email: (owner as Record<string, unknown>).email,
              }
            : null,
          status: analysis
            ? (analysis as Record<string, unknown>).status || "analyzed"
            : "pending",
          riskLevel: analysis
            ? (analysis as Record<string, unknown>).overallRisk || null
            : null,
        };
      });

      // ── Post-query filters (status / riskLevel are derived from analysis)
      if (
        status !== undefined &&
        typeof status === "string" &&
        VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
      ) {
        enrichedContracts = enrichedContracts.filter(
          (c) => c.status === status,
        );
      }

      if (
        riskLevel !== undefined &&
        typeof riskLevel === "string" &&
        VALID_RISK_LEVELS.includes(
          riskLevel as (typeof VALID_RISK_LEVELS)[number],
        )
      ) {
        enrichedContracts = enrichedContracts.filter(
          (c) => c.riskLevel === riskLevel,
        );
      }

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
          riskLevel: riskLevel ?? null,
          dateFrom: dateFrom ?? null,
          dateTo: dateTo ?? null,
          search: search ?? null,
        },
        data: enrichedContracts,
      });
    } catch (error: unknown) {
      console.error("Error in GET /api/admin/contracts:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

export default router;
