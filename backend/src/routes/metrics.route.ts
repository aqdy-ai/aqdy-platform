import { Router } from "express";
import { metrics } from "../utils/metrics.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ success: true, data: metrics.getMetrics() });
});

export default router;
