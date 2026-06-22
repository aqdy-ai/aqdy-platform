import { Router } from "express";
import { authenticateJwt } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import {
  getEvaluationStats,
  getLowScores,
  reEvaluateAnalysis,
  backfillAllEvaluations,
} from "../controllers/evaluation.controller.js";

const router = Router();

router.get("/stats", authenticateJwt, requireAdmin, getEvaluationStats);

router.get("/low-scores", authenticateJwt, requireAdmin, getLowScores);

router.post(
  "/re-evaluate/:analysisId",
  authenticateJwt,
  requireAdmin,
  reEvaluateAnalysis,
);

router.post("/backfill", authenticateJwt, requireAdmin, backfillAllEvaluations);

export default router;
