import { Router } from "express";
import {
  getActivePlans,
  getPlanBySlug,
} from "../controllers/plans.controller.js";

const router = Router();

router.get("/", getActivePlans);
router.get("/:slug", getPlanBySlug);

export default router;
