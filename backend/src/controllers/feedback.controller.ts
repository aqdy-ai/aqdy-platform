import { Request, Response, NextFunction } from "express";
import { UserFeedback } from "../models/userFeedback.model.js";
import { getLangfuseClient } from "../config/langfuse.config.js";
import { AppError } from "../middlewares/errorHandler.js";
import { logger } from "../utils/logger.js";

interface AuthRequest extends Request {
  user?: { _id: { toString(): string }; role?: string };
}

export const submitFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const {
      targetType,
      targetId,
      feedbackType,
      comment,
      category,
      contractId,
      analysisId,
    } = req.body;

    if (!targetType || !targetId || !feedbackType) {
      throw new AppError(
        400,
        "targetType, targetId, and feedbackType are required",
      );
    }

    const validTargetTypes = ["analysis", "clause", "chat_message"];
    const validFeedbackTypes = ["thumbs_up", "thumbs_down", "report"];
    const validCategories = ["inaccurate", "offensive", "unclear", "other"];

    if (!validTargetTypes.includes(targetType)) {
      throw new AppError(
        400,
        `Invalid targetType. Must be one of: ${validTargetTypes.join(", ")}`,
      );
    }
    if (!validFeedbackTypes.includes(feedbackType)) {
      throw new AppError(
        400,
        `Invalid feedbackType. Must be one of: ${validFeedbackTypes.join(", ")}`,
      );
    }
    if (feedbackType === "report" && !category) {
      throw new AppError(
        400,
        "category is required when feedbackType is 'report'",
      );
    }
    if (category && !validCategories.includes(category)) {
      throw new AppError(
        400,
        `Invalid category. Must be one of: ${validCategories.join(", ")}`,
      );
    }

    const feedback = new UserFeedback({
      userId,
      targetType,
      targetId,
      feedbackType,
      contractId: contractId || undefined,
      analysisId: analysisId || undefined,
      comment: comment || undefined,
      category: category || undefined,
    });
    await feedback.save();

    const langfuse = getLangfuseClient();
    if (langfuse && analysisId) {
      const scoreValue =
        feedbackType === "thumbs_up"
          ? 1
          : feedbackType === "thumbs_down"
            ? 0
            : undefined;
      if (scoreValue !== undefined) {
        try {
          langfuse.score({
            name: "user_feedback",
            value: scoreValue,
            traceId: `${analysisId}-pipeline`,
            comment: comment || undefined,
          });
        } catch (err) {
          logger.warn("Failed to push user feedback score to Langfuse", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    next(error);
  }
};

export const getUserFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const { targetType, targetId } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { userId };
    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;

    const feedback = await UserFeedback.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: feedback });
  } catch (error) {
    next(error);
  }
};

export const getFeedbackStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await UserFeedback.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          thumbsUp: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "thumbs_up"] }, 1, 0] },
          },
          thumbsDown: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "thumbs_down"] }, 1, 0] },
          },
          reports: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "report"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          thumbsUp: 1,
          thumbsDown: 1,
          reports: 1,
          total: 1,
          _id: 0,
        },
      },
    ]);

    const totals = await UserFeedback.aggregate([
      {
        $group: {
          _id: null,
          totalThumbsUp: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "thumbs_up"] }, 1, 0] },
          },
          totalThumbsDown: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "thumbs_down"] }, 1, 0] },
          },
          totalReports: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "report"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      { $project: { _id: 0 } },
    ]);

    const countByTarget = await UserFeedback.aggregate([
      {
        $group: {
          _id: "$targetType",
          count: { $sum: 1 },
          thumbsUp: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "thumbs_up"] }, 1, 0] },
          },
          thumbsDown: {
            $sum: { $cond: [{ $eq: ["$feedbackType", "thumbs_down"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          targetType: "$_id",
          count: 1,
          thumbsUp: 1,
          thumbsDown: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        daily: stats,
        totals: totals[0] || {
          totalThumbsUp: 0,
          totalThumbsDown: 0,
          totalReports: 0,
          total: 0,
        },
        byTarget: countByTarget,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getLowRatedFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const lowRated = await UserFeedback.aggregate([
      { $match: { feedbackType: { $in: ["thumbs_down", "report"] } } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          targetType: 1,
          targetId: 1,
          feedbackType: 1,
          comment: 1,
          category: 1,
          createdAt: 1,
          userEmail: "$user.email",
        },
      },
    ]);

    res.status(200).json({ success: true, data: lowRated });
  } catch (error) {
    next(error);
  }
};

export const deleteFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const feedback = await UserFeedback.findByIdAndDelete(id);
    if (!feedback) {
      throw new AppError(404, "Feedback not found");
    }
    res.status(200).json({ success: true, message: "Feedback deleted" });
  } catch (error) {
    next(error);
  }
};
