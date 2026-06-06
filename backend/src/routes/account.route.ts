import { Router } from "express";
import {
  getProfileHandler,
  updateProfileHandler,
  deleteAccountHandler,
  getCreditsHandler,
} from "../controllers/account.controller.js";
import {
  getSubscriptionHandler,
  upgradeSubscriptionHandler,
  cancelSubscriptionHandler,
} from "../controllers/subscription.controller.js";
import {
  authenticateJwt,
  requireAuth,
} from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(authenticateJwt, requireAuth);

// Profile routes
router.get("/profile", getProfileHandler);
router.patch("/profile", updateProfileHandler);
router.delete("/", deleteAccountHandler);
router.get("/credits", getCreditsHandler);

// Subscription routes
router.get("/subscription", getSubscriptionHandler);
router.post("/subscription/upgrade", upgradeSubscriptionHandler);
router.post("/subscription/cancel", cancelSubscriptionHandler);

export default router;
