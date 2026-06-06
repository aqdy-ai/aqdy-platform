import { Router } from "express";
import { z } from "zod";
import {
  analyzeContract,
  getContractAnalysis,
} from "../controllers/analysis.controller.js";
import { userAnalysisRateLimit } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import { enforceAnalysisLimit } from "../middlewares/planEnforcement.middleware.js";
import { verifyContractOwnership } from "../middlewares/contractOwnership.middleware.js";
import {
  authenticateJwt,
  requireAuth,
} from "../middlewares/auth.middleware.js";

/**
 * Validation schema for the analyze request.
 * contractId must be a valid 24-char MongoDB ObjectId hex string.
 */
const AnalyzeRequestSchema = z.object({
  contractId: z
    .string()
    .min(1, "contractId is required")
    .regex(/^[0-9a-fA-F]{24}$/, "contractId must be a valid ObjectId"),
  userId: z.string().min(1, "userId is required"),
});

/**
 * Validation schema for the get analysis path params.
 */
const GetAnalysisParamsSchema = z.object({
  contractId: z
    .string()
    .min(1, "contractId is required")
    .regex(/^[0-9a-fA-F]{24}$/, "contractId must be a valid ObjectId"),
});

const router = Router();

/**
 * POST /api/analysis/analyze
 * Start analysis for a previously uploaded contract.
 *
 * Body: { contractId, userId }
 */
router.post(
  "/analyze",
  authenticateJwt,
  requireAuth,
  validate(AnalyzeRequestSchema),
  verifyContractOwnership,
  userAnalysisRateLimit(),
  enforceAnalysisLimit,
  analyzeContract,
);

/**
 * GET /api/analysis/:contractId
 * Retrieve the status/results of a contract analysis.
 */
router.get(
  "/:contractId",
  validate(GetAnalysisParamsSchema, "params"),
  getContractAnalysis,
);

export default router;
