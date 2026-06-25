import { Request, Response, NextFunction } from "express";
import { Evaluation } from "../models/evaluation.model.js";
import { RiskAnalysis } from "../models/riskAnalysis.model.js";
import { judgeService } from "../services/judge.service.js";
import { AppError } from "../middlewares/errorHandler.js";
import { logger } from "../utils/logger.js";

interface AuthRequest extends Request {
  user?: { _id: { toString(): string }; role?: string };
}

export const getEvaluationStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const match: Record<string, unknown> = {
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
      { $sort: { _id: 1 } },
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

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getLowScores = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;
    const match: Record<string, unknown> = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate)
        (match.createdAt as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate)
        (match.createdAt as Record<string, unknown>).$lte = new Date(endDate);
    }
    match.$or = [
      { faithfulness: { $lt: 3 } },
      { relevancy: { $lt: 3 } },
      { precision: { $lt: 3 } },
      { recall: { $lt: 3 } },
    ];

    const lowScores = await Evaluation.find(match).lean();
    res.status(200).json({ success: true, data: lowScores });
  } catch (error) {
    next(error);
  }
};

export const reEvaluateAnalysis = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { analysisId } = req.params;

    const analysis = await RiskAnalysis.findById(analysisId);
    if (!analysis) {
      throw new AppError(404, "Analysis not found");
    }

    judgeService.evaluateAnalysis(analysis).catch((err) => {
      console.error("Re-evaluation failed:", err);
    });

    res.status(202).json({
      success: true,
      message: "Re-evaluation triggered",
    });
  } catch (error) {
    next(error);
  }
};

export const backfillAllEvaluations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const evaluatedIds = await Evaluation.distinct("analysisId");
    const analyses = await RiskAnalysis.find({
      _id: { $nin: evaluatedIds },
    }).sort({ createdAt: -1 });

    if (analyses.length === 0) {
      res.status(200).json({
        success: true,
        message: "All analyses already have evaluations",
        triggered: 0,
      });
      return;
    }

    for (const analysis of analyses) {
      judgeService.evaluateAnalysis(analysis).catch((err) => {
        logger.error("Backfill re-evaluation failed", {
          error: err instanceof Error ? err.message : String(err),
          analysisId: analysis._id?.toString(),
        });
      });
    }

    res.status(202).json({
      success: true,
      message: `Triggered evaluation for ${analyses.length} analyses`,
      triggered: analyses.length,
    });
  } catch (error) {
    next(error);
  }
};
