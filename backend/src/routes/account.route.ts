import { Router } from "express";
import {
  getProfileHandler,
  updateProfileHandler,
  deleteAccountHandler,
} from "../controllers/account.controller.js";
import {
  authenticateJwt,
  requireAuth,
} from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(authenticateJwt, requireAuth);

router.get("/profile", getProfileHandler);
router.patch("/profile", updateProfileHandler);
router.delete("/", deleteAccountHandler);

export default router;
