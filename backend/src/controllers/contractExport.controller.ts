import { Request, Response, NextFunction } from "express";
import { contractExportService } from "../services/contractExport.service.js";
import { AppError } from "../middlewares/errorHandler.js";
import { AuthenticatedRequest } from "../types/auth.js";
import { Subscription } from "../models/subscription.model.js";
import { Plan } from "../models/plan.model.js";

const UPGRADE_URL = "https://aqdy.ai/pricing";
const ALLOWED_PLANS = ["pro", "enterprise", "premium"];

// GET /api/account/contracts/export
export const exportContractsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = String(authReq.user!._id);
    const format = (req.query.format as string) ?? "csv";

    // Check plan
    const subscription = await Subscription.findOne({
      userId,
      status: "active",
    }).populate("planId");

    const plan = subscription?.planId as any;
    const planSlug = plan?.slug ?? "free";

    if (!ALLOWED_PLANS.includes(planSlug)) {
      res.status(403).json({
        success: false,
        error: "Export is available for Pro and Enterprise plans only.",
        details: {
          currentPlan: planSlug,
          upgradeUrl: UPGRADE_URL,
          message: "Upgrade your plan to export your contract history.",
        },
      });
      return;
    }

    // Validate format
    if (!["csv", "json"].includes(format)) {
      throw new AppError(
        400,
        "Invalid format. Use ?format=csv or ?format=json",
      );
    }

    let result;

    if (format === "csv") {
      const rows = await contractExportService.getExportData(userId);
      result = contractExportService.generateCSV(rows);
    } else {
      result = await contractExportService.generateJSON(userId);
    }

    res.setHeader("Content-Type", result.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.status(200).send(result.data);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            500,
            `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
    );
  }
};
