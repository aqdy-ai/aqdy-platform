import { Router } from "express";
import {
  authenticateJwt,
  requirePermission,
} from "../middlewares/auth.middleware.js";
import {
  getEvaluationStats,
  getLowScores,
  reEvaluateAnalysis,
  backfillAllEvaluations,
} from "../controllers/evaluation.controller.js";

const router = Router();

router.get(
  "/stats",
  authenticateJwt,
  requirePermission("evaluations", "read"),
  getEvaluationStats,
);

router.get(
  "/low-scores",
  authenticateJwt,
  requirePermission("evaluations", "read"),
  getLowScores,
);

router.post(
  "/re-evaluate/:analysisId",
  authenticateJwt,
  requirePermission("evaluations", "write"),
  reEvaluateAnalysis,
);

router.post(
  "/backfill",
  authenticateJwt,
  requirePermission("evaluations", "write"),
  backfillAllEvaluations,
);

export default router;
