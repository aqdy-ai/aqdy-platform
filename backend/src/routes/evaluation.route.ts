import { Router, Request, Response } from "express";
import { authenticateJwt } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { Evaluation } from "../models/evaluation.model.js";

const router = Router();

/**
 * GET /api/admin/evaluations/stats
 * Returns average scores (faithfulness, relevancy, precision, recall) grouped by date.
 * Optional query parameters: startDate, endDate (ISO strings). If omitted, defaults to the last 30 days.
 */
router.get(
  "/stats",
  authenticateJwt,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const match: any = {
        createdAt: {
          $gte: startDate ? new Date(startDate) : defaultStart,
          $lte: endDate ? new Date(endDate) : now,
        },
      };

      const stats = await Evaluation.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            avgFaithfulness: { $avg: "$faithfulness" },
            avgRelevancy: { $avg: "$relevancy" },
            avgPrecision: { $avg: "$precision" },
            avgRecall: { $avg: "$recall" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id": 1 } },
        {
          $project: {
            date: "$_id",
            avgFaithfulness: { $round: ["$avgFaithfulness", 2] },
            avgRelevancy: { $round: ["$avgRelevancy", 2] },
            avgPrecision: { $round: ["$avgPrecision", 2] },
            avgRecall: { $round: ["$avgRecall", 2] },
            count: 1,
            _id: 0,
          },
        },
      ]);

      return res.status(200).json({ success: true, data: stats });
    } catch (error: unknown) {
      console.error("Error in GET /api/admin/evaluations/stats:", error);
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  },
);

/**
 * GET /api/admin/evaluations/low-scores
 * Returns evaluation records where any metric score is below 3.
 * Optional query parameters: startDate, endDate to limit the time window.
 */
router.get(
  "/low-scores",
  authenticateJwt,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const now = new Date();
      const match: any = {};
      if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
      }
      // Add low‑score condition
      match.$or = [
        { faithfulness: { $lt: 3 } },
        { relevancy: { $lt: 3 } },
        { precision: { $lt: 3 } },
        { recall: { $lt: 3 } },
      ];

      const lowScores = await Evaluation.find(match).lean();
      return res.status(200).json({ success: true, data: lowScores });
    } catch (error: unknown) {
      console.error("Error in GET /api/admin/evaluations/low-scores:", error);
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  },
);

export default router;
