import { Router, Request, Response } from "express";
import { authenticateJwt } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import Payment from "../models/payment.model.js";
import { RiskAnalysis } from "../models/riskAnalysis.model.js";
import { CreditLedger } from "../models/creditLedger.model.js";

const router = Router();

/**
 * GET /api/admin/stats
 *
 * Returns aggregated platform health metrics for the current calendar month:
 *  - totalAccounts         – total registered user count
 *  - activeSubscriptions   – subscriptions with status "active"
 *  - revenueThisMonth      – succeeded payment totals grouped by currency
 *  - analysesThisMonth     – risk analyses created this month
 *  - creditsConsumedThisMonth – sum of deduction-only ledger entries (delta < 0)
 *
 * NOTE: Revenue is grouped by currency because the Payment model stores a
 * per-record currency field. Summing across currencies without normalisation
 * would produce a meaningless number. Consumers should sum a single currency
 * (typically "USD") from the returned map.
 */
router.get(
  "/",
  authenticateJwt,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // ── Month boundaries ──────────────────────────────────────────────────
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // ── Parallel queries ──────────────────────────────────────────────────
      const [
        totalAccounts,
        activeSubscriptions,
        revenueRows,
        analysesThisMonth,
        creditRows,
      ] = await Promise.all([
        // 1. Total registered users (all statuses)
        User.countDocuments({}),

        // 2. Currently active subscriptions
        Subscription.countDocuments({ status: "active" }),

        // 3. Revenue this month grouped by currency (succeeded payments only)
        Payment.aggregate([
          {
            $match: {
              status: "succeeded",
              createdAt: { $gte: monthStart, $lt: monthEnd },
            },
          },
          {
            $group: {
              _id: "$currency",
              total: { $sum: "$amount" },
            },
          },
        ]),

        // 4. Analyses run this month
        RiskAnalysis.countDocuments({
          createdAt: { $gte: monthStart, $lt: monthEnd },
        }),

        // 5. Credits CONSUMED this month.
        // Only sum entries where delta < 0 (deductions).
        // This intentionally excludes plan_topup and refund entries
        // so the figure represents true consumption, not net movement.
        CreditLedger.aggregate([
          {
            $match: {
              delta: { $lt: 0 },
              reason: {
                $in: [
                  "analysis_deduction",
                  "chat_deduction",
                  "manual_adjustment",
                ],
              },
              createdAt: { $gte: monthStart, $lt: monthEnd },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $abs: "$delta" } },
            },
          },
        ]),
      ]);

      // ── Shape revenue into { USD: 1290, EGP: 5000, ... } ─────────────────
      const revenueThisMonth: Record<string, number> = {};
      for (const row of revenueRows) {
        revenueThisMonth[row._id as string] = Math.round(row.total * 100) / 100;
      }

      const creditsConsumedThisMonth =
        creditRows.length > 0 ? Math.round(creditRows[0].total) : 0;

      // ── Period metadata ───────────────────────────────────────────────────
      const monthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      return res.status(200).json({
        success: true,
        period: {
          month: monthLabel,
          from: monthStart.toISOString(),
          to: new Date(monthEnd.getTime() - 1).toISOString(),
        },
        data: {
          totalAccounts,
          activeSubscriptions,
          revenueThisMonth,
          analysesThisMonth,
          creditsConsumedThisMonth,
        },
      });
    } catch (error: unknown) {
      console.error("Error in GET /api/admin/stats:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

export default router;
