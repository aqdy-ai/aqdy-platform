import { Router } from "express";
import {
  login,
  register,
  logout,
  refresh,
  me,
} from "../controllers/auth.controller.js";
import {
  authenticateJwt,
  requireAuth,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", authenticateJwt, requireAuth, me);

export default router;
