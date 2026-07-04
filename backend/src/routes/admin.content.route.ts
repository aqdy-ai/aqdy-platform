import { Router, Response } from "express";
import {
  authenticateJwt,
  requirePermission,
} from "../middlewares/auth.middleware.js";
import { logContent } from "../services/auditLog.service.js";
import { AuthenticatedRequest } from "../types/auth.js";
import { KnowledgeBase } from "../models/knowledgeBase.model.js";
import { AgentPrompt } from "../models/agentPrompt.model.js";
import { Evaluation } from "../models/evaluation.model.js";
import { invalidateCache } from "../services/prompt.service.js";

const router = Router();
router.use(authenticateJwt, requirePermission("knowledge_base", "read"));

router.get("/knowledge-base", async (req, res: Response) => {
  try {
    const {
      search,
      contractType,
      category,
      jurisdiction,
      riskLevel,
      page: pageStr,
      pageSize: pageSizeStr,
    } = req.query as Record<string, string | undefined>;

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { clauseText: { $regex: search, $options: "i" } },
        { clausePattern: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
    if (contractType && contractType !== "all")
      filter.contractType = { $regex: contractType, $options: "i" };
    if (category && category !== "all") filter.category = category;
    if (jurisdiction && jurisdiction !== "all")
      filter.jurisdiction = { $regex: jurisdiction, $options: "i" };
    if (riskLevel && riskLevel !== "all") filter.riskLevel = riskLevel;

    const page = Math.max(1, parseInt(pageStr || "1", 10) || 1);
    const pageSize = Math.max(
      1,
      Math.min(100, parseInt(pageSizeStr || "20", 10) || 20),
    );

    const [entries, total, allDocs] = await Promise.all([
      KnowledgeBase.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      KnowledgeBase.countDocuments(filter),
      KnowledgeBase.find().lean(),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    const allTypes = new Set<string>();
    const allCategories = new Set<string>();
    const allJurisdictions = new Set<string>();
    const allRiskLevels = new Set<string>();
    allDocs.forEach((e) => {
      e.contractType.split(", ").forEach((t) => allTypes.add(t));
      allCategories.add(e.category);
      e.jurisdiction.split(", ").forEach((j) => allJurisdictions.add(j));
      allRiskLevels.add(e.riskLevel);
    });

    const entriesMapped = entries.map((e) => ({
      id: e._id.toString(),
      clauseText: e.clauseText,
      contractType: e.contractType,
      category: e.category,
      jurisdiction: e.jurisdiction,
      riskLevel: e.riskLevel,
      clausePattern: e.clausePattern,
    }));

    return res.json({
      success: true,
      data: {
        entries: entriesMapped,
        pagination: { page, pageSize, total, totalPages },
        filterOptions: {
          contractTypes: Array.from(allTypes).sort(),
          categories: Array.from(allCategories).sort(),
          jurisdictions: Array.from(allJurisdictions).sort(),
          riskLevels: Array.from(allRiskLevels).sort(),
        },
      },
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch knowledge base" });
  }
});

router.post(
  "/knowledge-base",
  requirePermission("knowledge_base", "write"),
  async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const {
      clauseText,
      contractType,
      category,
      jurisdiction,
      riskLevel,
      clausePattern,
    } = req.body;

    if (!clauseText || !contractType || !category) {
      return res.status(400).json({
        success: false,
        error: "clauseText, contractType, category required",
      });
    }
    if (clausePattern && clausePattern.length > 2000) {
      return res
        .status(400)
        .json({ success: false, error: "clausePattern too long (max 2000)" });
    }

    try {
      const entry = await KnowledgeBase.create({
        clauseText,
        contractType,
        category,
        jurisdiction: jurisdiction || "General",
        riskLevel: riskLevel || "medium",
        clausePattern: clausePattern || "",
      });

      await logContent.kbChange(
        authReq,
        "KB_ENTRY_CREATED",
        entry._id.toString(),
        undefined,
        entry.toObject() as unknown as Record<string, unknown>,
      );

      return res.status(201).json({
        success: true,
        data: {
          id: entry._id.toString(),
          clauseText: entry.clauseText,
          contractType: entry.contractType,
          category: entry.category,
          jurisdiction: entry.jurisdiction,
          riskLevel: entry.riskLevel,
          clausePattern: entry.clausePattern,
        },
      });
    } catch {
      return res
        .status(500)
        .json({ success: false, error: "Failed to create KB entry" });
    }
  },
);

router.put(
  "/knowledge-base/:id",
  requirePermission("knowledge_base", "write"),
  async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const prev = await KnowledgeBase.findById(req.params.id).lean();
      if (!prev) {
        return res
          .status(404)
          .json({ success: false, error: "Entry not found" });
      }

      const updated = await KnowledgeBase.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true },
      ).lean();

      if (!updated) {
        return res
          .status(404)
          .json({ success: false, error: "Entry not found" });
      }

      await logContent.kbChange(
        authReq,
        "KB_ENTRY_UPDATED",
        req.params.id,
        prev as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>,
      );

      return res.json({
        success: true,
        data: {
          id: updated._id.toString(),
          clauseText: updated.clauseText,
          contractType: updated.contractType,
          category: updated.category,
          jurisdiction: updated.jurisdiction,
          riskLevel: updated.riskLevel,
          clausePattern: updated.clausePattern,
        },
      });
    } catch {
      return res
        .status(500)
        .json({ success: false, error: "Failed to update KB entry" });
    }
  },
);

router.delete(
  "/knowledge-base/:id",
  requirePermission("knowledge_base", "write"),
  async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const deleted = await KnowledgeBase.findByIdAndDelete(
        req.params.id,
      ).lean();
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, error: "Entry not found" });
      }

      await logContent.kbChange(
        authReq,
        "KB_ENTRY_DELETED",
        req.params.id,
        deleted as unknown as Record<string, unknown>,
      );

      return res.json({ success: true, message: "Entry deleted" });
    } catch {
      return res
        .status(500)
        .json({ success: false, error: "Failed to delete KB entry" });
    }
  },
);

router.get("/prompts", async (_req, res: Response) => {
  try {
    const prompts = await AgentPrompt.find().lean();
    const data = prompts.map((p) => ({ agent: p.agent, prompt: p.prompt }));
    return res.json({ success: true, data });
  } catch {
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch prompts" });
  }
});

router.put(
  "/prompts/:agentName",
  requirePermission("prompts", "write"),
  async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { agentName } = req.params;
    const { prompt } = req.body;

    if (!prompt) {
      return res
        .status(400)
        .json({ success: false, error: "prompt is required" });
    }

    const validAgents = ["extractor", "riskClassifier", "redline"];
    if (!validAgents.includes(agentName)) {
      return res.status(404).json({ success: false, error: "Agent not found" });
    }

    try {
      const prev = await AgentPrompt.findOne({ agent: agentName }).lean();

      const updated = await AgentPrompt.findOneAndUpdate(
        { agent: agentName },
        { prompt, updatedAt: new Date() },
        { upsert: true, new: true },
      ).lean();

      if (!updated) {
        return res
          .status(500)
          .json({ success: false, error: "Failed to update prompt" });
      }

      invalidateCache(agentName as "extractor" | "riskClassifier" | "redline");

      await logContent.promptChange(
        authReq,
        agentName,
        prev?.prompt ?? "",
        prompt,
      );

      return res.json({
        success: true,
        data: { agent: updated.agent, prompt: updated.prompt },
      });
    } catch {
      return res
        .status(500)
        .json({ success: false, error: "Failed to update prompt" });
    }
  },
);

router.get(
  "/langfuse-metrics",
  requirePermission("evaluations", "read"),
  async (req, res: Response) => {
    try {
      const { startDate, endDate } = req.query as Record<
        string,
        string | undefined
      >;
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const match: Record<string, unknown> = {
        createdAt: {
          $gte: startDate ? new Date(startDate) : defaultStart,
          $lte: endDate ? new Date(endDate) : now,
        },
      };

      const stats = await Evaluation.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            avgFaithfulness: { $avg: "$faithfulness" },
            avgRelevancy: { $avg: "$relevancy" },
            avgPrecision: { $avg: "$precision" },
            avgRecall: { $avg: "$recall" },
            totalEvaluations: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            avgFaithfulness: { $round: ["$avgFaithfulness", 2] },
            avgRelevancy: { $round: ["$avgRelevancy", 2] },
            avgPrecision: { $round: ["$avgPrecision", 2] },
            avgRecall: { $round: ["$avgRecall", 2] },
            totalEvaluations: 1,
          },
        },
      ]);

      const data = stats[0] || {
        avgFaithfulness: 0,
        avgRelevancy: 0,
        avgPrecision: 0,
        avgRecall: 0,
        totalEvaluations: 0,
      };

      data.avgFaithfulness = data.avgFaithfulness / 5;
      data.avgRelevancy = data.avgRelevancy / 5;
      data.avgPrecision = data.avgPrecision / 5;
      data.avgRecall = data.avgRecall / 5;

      return res.json({ success: true, data });
    } catch {
      return res
        .status(500)
        .json({ success: false, error: "Failed to fetch metrics" });
    }
  },
);

export default router;
