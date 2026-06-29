import { Router } from "express";
import {
  authenticateJwt,
  requirePermission,
} from "../middlewares/auth.middleware.js";
import {
  submitFeedback,
  getUserFeedback,
  getFeedbackStats,
  getLowRatedFeedback,
  deleteFeedback,
} from "../controllers/feedback.controller.js";

const router = Router();

router.post("/", authenticateJwt, submitFeedback);

router.get("/", authenticateJwt, getUserFeedback);

router.get(
  "/stats",
  authenticateJwt,
  requirePermission("feedback", "read"),
  getFeedbackStats,
);

router.get(
  "/low-rated",
  authenticateJwt,
  requirePermission("feedback", "read"),
  getLowRatedFeedback,
);

router.delete(
  "/:id",
  authenticateJwt,
  requirePermission("feedback", "write"),
  deleteFeedback,
);

export default router;
