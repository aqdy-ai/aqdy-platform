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
  getContractListHandler,
  getContractDetailHandler,
  deleteContractHandler,
} from "../controllers/contractHistory.controller.js";
import {
  getAnalysisVersionsHandler,
  getAnalysisVersionDetailHandler,
} from "../controllers/analysisVersion.controller.js";
import {
  authenticateJwt,
  requireAuth,
} from "../middlewares/auth.middleware.js";
import { verifyContractOwnership } from "../middlewares/contractOwnership.middleware.js";

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

// Contract history routes
router.get("/contracts", getContractListHandler);
router.get(
  "/contracts/:contractId",
  verifyContractOwnership,
  getContractDetailHandler,
);
router.delete(
  "/contracts/:contractId",
  verifyContractOwnership,
  deleteContractHandler,
);

// Analysis version routes
router.get(
  "/contracts/:contractId/analyses",
  getAnalysisVersionsHandler,
);
router.get(
  "/contracts/:contractId/analyses/:analysisId",
  getAnalysisVersionDetailHandler,
);

export default router;
