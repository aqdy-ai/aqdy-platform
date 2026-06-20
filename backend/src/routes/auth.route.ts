import { Router } from "express";
import {
  login,
  register,
  logout,
  refresh,
  me,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import {
  authenticateJwt,
  requireAuth,
} from "../middlewares/auth.middleware.js";
import { forgotPasswordRateLimit } from "../middlewares/rateLimit.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", authenticateJwt, requireAuth, me);
router.post("/verify-email", verifyEmail);
router.post(
  "/resend-verification",
  authenticateJwt,
  requireAuth,
  resendVerification,
);
// Forgot password endpoints
router.post("/forgot-password", forgotPasswordRateLimit(), forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
