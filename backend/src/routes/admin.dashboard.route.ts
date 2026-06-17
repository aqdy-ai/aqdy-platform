import { Router, Request, Response } from "express";
import { authenticateJwt } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { User } from "../models/user.model.js";
import { Contract } from "../models/contract.model.js";
import { RiskAnalysis } from "../models/riskAnalysis.model.js";
import { CreditLedger } from "../models/creditLedger.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import Payment from "../models/payment.model.js";

const router = Router();

function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { start, end };
}

function weekRange(date: Date, weeksAgo: number) {
  const end = new Date(date);
  const start = new Date(date);
  start.setDate(start.getDate() - weeksAgo * 7);
  return { start, end };
}

router.get(
  "/",
  authenticateJwt,
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();

      const { start: monthStart, end: monthEnd } = monthRange(y, m);
      const { start: lastMonthStart, end: lastMonthEnd } = monthRange(y, m - 1);
      const weekAgo = new Date(now.getTime() - 7 * 86400000);

      const sixMonthAgo = new Date(y, m - 5, 1);
      const eightWeekAgo = new Date(now.getTime() - 56 * 86400000);

      const [
        totalAccounts,
        accountsThisWeek,
        activeSubscriptions,
        currentRevenue,
        lastRevenue,
        analysesThisMonth,
        analysesLastMonth,
        totalAnalyses,
        creditIssued,
        creditsThisMonth,
        creditsLastMonth,
        totalCreditBalance,
        riskDistribution,
        languageData,
        recentAnalyses,
        pipelineErrors,
        planCounts,
      ] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ createdAt: { $gte: weekAgo } }),
        User.countDocuments({ planSlug: { $ne: "free" } }),
        Payment.aggregate([
          {
            $match: {
              status: "succeeded",
              createdAt: { $gte: monthStart, $lt: monthEnd },
            },
          },
          { $group: { _id: "$currency", total: { $sum: "$amount" } } },
        ]),
        Payment.aggregate([
          {
            $match: {
              status: "succeeded",
              createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
            },
          },
          { $group: { _id: "$currency", total: { $sum: "$amount" } } },
        ]),
        RiskAnalysis.countDocuments({
          createdAt: { $gte: monthStart, $lt: monthEnd },
        }),
        RiskAnalysis.countDocuments({
          createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
        }),
        RiskAnalysis.countDocuments({}),
        CreditLedger.aggregate([
          { $match: { delta: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: "$delta" } } },
        ]),
        CreditLedger.aggregate([
          {
            $match: {
              delta: { $lt: 0 },
              createdAt: { $gte: monthStart, $lt: monthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: { $abs: "$delta" } } } },
        ]),
        CreditLedger.aggregate([
          {
            $match: {
              delta: { $lt: 0 },
              createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: { $abs: "$delta" } } } },
        ]),
        User.aggregate([
          { $group: { _id: null, total: { $sum: "$creditBalance" } } },
        ]),
        RiskAnalysis.aggregate([
          {
            $group: {
              _id: "$executiveSummary.overallRisk",
              count: { $sum: 1 },
            },
          },
        ]),
        RiskAnalysis.aggregate([
          { $group: { _id: "$language", count: { $sum: 1 } } },
        ]),
        RiskAnalysis.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("contractId", "filename language")
          .lean(),
        AuditLog.find({
          action: {
            $in: [
              "AGENT_EXTRACTOR",
              "AGENT_RISK_CLASSIFIER",
              "AGENT_REDLINE",
              "AGENT_PIPELINE",
            ],
          },
          outcome: "failure",
          timestamp: { $gte: new Date(now.getTime() - 86400000) },
        })
          .sort({ timestamp: -1 })
          .limit(10)
          .lean(),
        User.aggregate([{ $group: { _id: "$planSlug", count: { $sum: 1 } } }]),
      ]);

      // ── Revenue ──
      const mrrCurrent: Record<string, number> = {};
      for (const r of currentRevenue) {
        mrrCurrent[r._id as string] = Math.round(r.total * 100) / 100;
      }
      const mrrLast: Record<string, number> = {};
      for (const r of lastRevenue) {
        mrrLast[r._id as string] = Math.round(r.total * 100) / 100;
      }

      const mrrUsdCurrent = mrrCurrent["USD"] || 0;
      const mrrUsdLast = mrrLast["USD"] || 0;
      const mrrChange =
        mrrUsdLast > 0 ? ((mrrUsdCurrent - mrrUsdLast) / mrrUsdLast) * 100 : 0;

      // ── Credits ──
      const creditsIssuedAllTime =
        creditIssued.length > 0 ? Math.round(creditIssued[0].total) : 0;
      const creditsConsumedThisMonth =
        creditsThisMonth.length > 0 ? Math.round(creditsThisMonth[0].total) : 0;
      const creditsConsumedLastMonth =
        creditsLastMonth.length > 0 ? Math.round(creditsLastMonth[0].total) : 0;
      const creditsRemainingAll =
        totalCreditBalance.length > 0
          ? Math.round(totalCreditBalance[0].total)
          : 0;

      const avgCredits =
        analysesThisMonth > 0
          ? Math.round((creditsConsumedThisMonth / analysesThisMonth) * 100) /
            100
          : 0;

      // ── MRR trend last 6 months ──
      const mrrTrend: { month: string; usd: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const { start, end } = monthRange(y, m - i);
        const rows = await Payment.aggregate([
          {
            $match: {
              status: "succeeded",
              createdAt: { $gte: start, $lt: end },
            },
          },
          { $group: { _id: "$currency", total: { $sum: "$amount" } } },
        ]);
        const usd = rows.find((r) => r._id === "USD")?.total || 0;
        const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
        mrrTrend.push({ month: label, usd: Math.round(usd * 100) / 100 });
      }

      // ── Weekly signups last 8 weeks ──
      const weeklySignups: { week: string; count: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const { start, end } = weekRange(now, i);
        // adjust start to monday
        const weekStart = new Date(start);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const count = await User.countDocuments({
          createdAt: { $gte: weekStart, $lt: weekEnd },
        });
        weeklySignups.push({
          week: weekStart.toISOString().slice(0, 10),
          count,
        });
      }

      // ── Daily analyses & credits this month ──
      const dailyAnalyses = await RiskAnalysis.aggregate([
        { $match: { createdAt: { $gte: monthStart, $lt: monthEnd } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const dailyCredits = await CreditLedger.aggregate([
        {
          $match: {
            delta: { $lt: 0 },
            createdAt: { $gte: monthStart, $lt: monthEnd },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: { $abs: "$delta" } },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // ── Top contract types (from clauseAnalysis.clauseType) ──
      const topContractTypes = await RiskAnalysis.aggregate([
        { $unwind: "$clauseAnalysis" },
        { $group: { _id: "$clauseAnalysis.clauseType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]);

      // ── Agent latency ──
      const extractorLatency = await AuditLog.aggregate([
        { $match: { action: "AGENT_EXTRACTOR", outcome: "success" } },
        { $sort: { timestamp: -1 } },
        { $limit: 20 },
        {
          $group: {
            _id: null,
            avg: { $avg: { $ifNull: ["$metadata.durationMs", 0] } },
          },
        },
      ]);
      const classifierLatency = await AuditLog.aggregate([
        { $match: { action: "AGENT_RISK_CLASSIFIER", outcome: "success" } },
        { $sort: { timestamp: -1 } },
        { $limit: 20 },
        {
          $group: {
            _id: null,
            avg: { $avg: { $ifNull: ["$metadata.durationMs", 0] } },
          },
        },
      ]);
      const redlineLatency = await AuditLog.aggregate([
        { $match: { action: "AGENT_REDLINE", outcome: "success" } },
        { $sort: { timestamp: -1 } },
        { $limit: 20 },
        {
          $group: {
            _id: null,
            avg: { $avg: { $ifNull: ["$metadata.durationMs", 0] } },
          },
        },
      ]);

      // ── Top 5 credit consumers this month ──
      const topCreditConsumers = await CreditLedger.aggregate([
        {
          $match: {
            delta: { $lt: 0 },
            createdAt: { $gte: monthStart, $lt: monthEnd },
          },
        },
        {
          $group: {
            _id: "$userId",
            credits: { $sum: { $abs: "$delta" } },
          },
        },
        { $sort: { credits: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: { $ifNull: ["$user.name", "Deleted User"] },
            email: { $ifNull: ["$user.email", ""] },
            planSlug: { $ifNull: ["$user.planSlug", "free"] },
            credits: 1,
          },
        },
      ]);

      // ── Avg input tokens per analysis ──
      const tokenData = await CreditLedger.aggregate([
        {
          $match: {
            reason: "analysis_deduction",
            "metadata.tokensUsed": { $exists: true, $ne: null },
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
        { $group: { _id: null, avg: { $avg: "$metadata.tokensUsed" } } },
      ]);
      const avgInputTokens =
        tokenData.length > 0 ? Math.round(tokenData[0].avg) : 0;

      // ── Recent 4 payments ──
      const recentPayments = await Payment.find()
        .sort({ createdAt: -1 })
        .limit(4)
        .populate("userId", "name email planSlug")
        .lean();

      // ── Analyses per day chart data (fill gaps) ──
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const analysesPerDay: { date: string; count: number }[] = [];
      const creditsPerDay: { date: string; credits: number }[] = [];
      const dailyMap = new Map(dailyAnalyses.map((d) => [d._id, d.count]));
      const creditMap = new Map(dailyCredits.map((d) => [d._id, d.total]));
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        analysesPerDay.push({ date: key, count: dailyMap.get(key) || 0 });
        creditsPerDay.push({ date: key, credits: creditMap.get(key) || 0 });
      }

      return res.status(200).json({
        success: true,
        data: {
          // Section 1
          totalAccounts,
          accountsThisWeek,
          activeSubscriptions,
          mrrCurrent: mrrUsdCurrent,
          mrrChange: Math.round(mrrChange * 100) / 100,
          mrrByCurrency: mrrCurrent,
          analysesThisMonth,
          analysesChange:
            analysesLastMonth > 0
              ? Math.round(
                  ((analysesThisMonth - analysesLastMonth) /
                    analysesLastMonth) *
                    10000,
                ) / 100
              : 0,
          totalAnalyses,
          avgCreditsPerAnalysis: avgCredits,

          // Section 2
          creditsIssuedAllTime,
          creditsConsumedThisMonth,
          creditsConsumedLastMonth,
          creditsRemaining: creditsRemainingAll,
          avgInputTokens,

          // Section 3 - Charts
          mrrTrend,
          weeklySignups,

          // Section 4 - Usage
          analysesPerDay,
          creditsPerDay,

          // Section 5 - Pipeline
          riskDistribution: riskDistribution.map(
            (r: { _id: string; count: number }) => ({
              risk: r._id || "unknown",
              count: r.count,
            }),
          ),
          agentLatency: {
            extractor:
              extractorLatency.length > 0
                ? Math.round((extractorLatency[0].avg / 1000) * 100) / 100
                : 0,
            classifier:
              classifierLatency.length > 0
                ? Math.round((classifierLatency[0].avg / 1000) * 100) / 100
                : 0,
            redline:
              redlineLatency.length > 0
                ? Math.round((redlineLatency[0].avg / 1000) * 100) / 100
                : 0,
          },
          topContractTypes: topContractTypes.map(
            (t: { _id: string; count: number }) => ({
              type: t._id || "unknown",
              count: t.count,
            }),
          ),

          // Section 6 - Users
          topCreditConsumers,
          planBreakdown: planCounts.map(
            (p: { _id: string; count: number }) => ({
              plan: p._id || "free",
              count: p.count,
            }),
          ),
          languageSplit: languageData.map(
            (l: { _id: string; count: number }) => ({
              language: l._id || "unknown",
              count: l.count,
            }),
          ),

          // Section 7
          recentAnalyses: recentAnalyses.map((a: Record<string, unknown>) => ({
            _id: a._id,
            contractId:
              typeof a.contractId === "object" && a.contractId
                ? (a.contractId as Record<string, unknown>)._id
                : null,
            filename:
              typeof a.contractId === "object" && a.contractId
                ? (a.contractId as Record<string, unknown>).filename
                : "Unknown",
            language:
              typeof a.contractId === "object" && a.contractId
                ? (a.contractId as Record<string, unknown>).language
                : "en",
            overallRisk:
              (a.executiveSummary as Record<string, unknown>)?.overallRisk ||
              "unknown",
            userId: a.userId,
            createdAt: a.createdAt,
          })),

          // Section 8
          recentPayments: recentPayments.map((p: Record<string, unknown>) => ({
            _id: p._id,
            user:
              typeof p.userId === "object" && p.userId
                ? p.userId
                : { name: "Unknown", email: "" },
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            createdAt: p.createdAt,
          })),

          // Section 9
          pipelineErrors: pipelineErrors.map((e: Record<string, unknown>) => ({
            _id: e._id,
            action: e.action,
            errorMessage: e.errorMessage,
            timestamp: e.timestamp,
          })),
        },
      });
    } catch (error: unknown) {
      console.error("Dashboard aggregation error:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

export default router;
