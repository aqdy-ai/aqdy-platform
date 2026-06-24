import { Router, Request, Response } from "express";
import { Plan, PlanZodSchema } from "../models/plan.model.js";
import {
  authenticateJwt,
  requirePermission,
} from "../middlewares/auth.middleware.js";
import mongoose from "mongoose";

const router = Router();

router.use(authenticateJwt, requirePermission("billing", "read"));

// GET / — list all plans
router.get("/", async (_req: Request, res: Response) => {
  try {
    const {
      page = "1",
      pageSize = "20",
      isActive,
      billingCycle,
      search,
    } = _req.query;

    const filter: Record<string, unknown> = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (billingCycle) filter.billingCycle = billingCycle;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(pageSize as string, 10) || 20),
    );
    const skip = (pageNum - 1) * limit;

    const [plans, total] = await Promise.all([
      Plan.find(filter).sort({ price: 1 }).skip(skip).limit(limit),
      Plan.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: plans,
      pagination: {
        page: pageNum,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: pageNum * limit < total,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch plans" });
  }
});

// GET /:id — single plan
router.get("/:id", async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: "Invalid plan ID" });
      return;
    }

    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      res.status(404).json({ success: false, error: "Plan not found" });
      return;
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch plan" });
  }
});

// POST / — create plan
router.post(
  "/",
  requirePermission("billing", "write"),
  async (req: Request, res: Response) => {
    try {
      const parsed = PlanZodSchema.parse(req.body);
      const existing = await Plan.findOne({ slug: parsed.slug });
      if (existing) {
        res.status(409).json({
          success: false,
          error: "A plan with this slug already exists",
        });
        return;
      }
      const plan = await Plan.create(parsed);
      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      if (error instanceof Error && "issues" in error) {
        res
          .status(400)
          .json({ success: false, error: "Validation error", details: error });
        return;
      }
      res.status(500).json({ success: false, error: "Failed to create plan" });
    }
  },
);

// PUT /:id — update plan
router.put(
  "/:id",
  requirePermission("billing", "write"),
  async (req: Request, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid plan ID" });
        return;
      }

      const parsed = PlanZodSchema.partial().parse(req.body);

      if (parsed.slug) {
        const duplicate = await Plan.findOne({
          slug: parsed.slug,
          _id: { $ne: req.params.id },
        });
        if (duplicate) {
          res.status(409).json({
            success: false,
            error: "A plan with this slug already exists",
          });
          return;
        }
      }

      const plan = await Plan.findByIdAndUpdate(req.params.id, parsed, {
        new: true,
        runValidators: true,
      });

      if (!plan) {
        res.status(404).json({ success: false, error: "Plan not found" });
        return;
      }

      res.json({ success: true, data: plan });
    } catch (error) {
      if (error instanceof Error && "issues" in error) {
        res
          .status(400)
          .json({ success: false, error: "Validation error", details: error });
        return;
      }
      res.status(500).json({ success: false, error: "Failed to update plan" });
    }
  },
);

// DELETE /:id — soft delete (set isActive: false)
router.delete(
  "/:id",
  requirePermission("billing", "write"),
  async (req: Request, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid plan ID" });
        return;
      }

      const plan = await Plan.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true },
      );

      if (!plan) {
        res.status(404).json({ success: false, error: "Plan not found" });
        return;
      }

      res.json({
        success: true,
        message: "Plan deactivated successfully",
        data: plan,
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, error: "Failed to deactivate plan" });
    }
  },
);

export default router;
