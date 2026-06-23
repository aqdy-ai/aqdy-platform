import { Router, Response } from "express";
import {
  authenticateJwt,
  requirePermission,
} from "../middlewares/auth.middleware.js";
import { logContent } from "../services/auditLog.service.js";
import { AuthenticatedRequest } from "../types/auth.js";

const router = Router();
router.use(authenticateJwt, requirePermission("knowledge_base", "read"));

// In-memory placeholder KB store
const kbEntries = [
  {
    id: "kb-001",
    clauseText: "Force Majeure",
    contractType: "General",
    category: "Liability",
    jurisdiction: "UAE",
    riskLevel: "medium",
    clausePattern: "Neither party shall be liable for failure...",
  },
  {
    id: "kb-002",
    clauseText: "Termination for Convenience",
    contractType: "Employment",
    category: "Termination",
    jurisdiction: "KSA",
    riskLevel: "high",
    clausePattern: "Either party may terminate this agreement...",
  },
];

// In-memory prompt store
const agentPrompts: Record<string, string> = {
  extractor: "You are a legal clause extractor...",
  riskClassifier: "You are a risk classification agent...",
  redline: "You are a redline suggestion agent...",
};

router.get("/knowledge-base", async (req, res: Response) => {
  const { contractType, category, jurisdiction, riskLevel } = req.query;
  let filtered = [...kbEntries];
  if (contractType)
    filtered = filtered.filter((e) => e.contractType === contractType);
  if (category) filtered = filtered.filter((e) => e.category === category);
  if (jurisdiction)
    filtered = filtered.filter((e) => e.jurisdiction === jurisdiction);
  if (riskLevel) filtered = filtered.filter((e) => e.riskLevel === riskLevel);
  return res.json({ success: true, data: filtered });
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
    const entry = {
      id: `kb-${Date.now()}`,
      clauseText,
      contractType,
      category,
      jurisdiction: jurisdiction || "General",
      riskLevel: riskLevel || "medium",
      clausePattern: clausePattern || "",
    };
    kbEntries.push(entry);
    await logContent.kbChange(
      authReq,
      "KB_ENTRY_CREATED",
      entry.id,
      undefined,
      entry as unknown as Record<string, unknown>,
    );
    return res.status(201).json({ success: true, data: entry });
  },
);

router.put(
  "/knowledge-base/:id",
  requirePermission("knowledge_base", "write"),
  async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const idx = kbEntries.findIndex((e) => e.id === req.params.id);
    if (idx === -1)
      return res.status(404).json({ success: false, error: "Entry not found" });
    const prev = { ...kbEntries[idx] };
    Object.assign(kbEntries[idx], req.body);
    await logContent.kbChange(
      authReq,
      "KB_ENTRY_UPDATED",
      req.params.id,
      prev as unknown as Record<string, unknown>,
      kbEntries[idx] as unknown as Record<string, unknown>,
    );
    return res.json({ success: true, data: kbEntries[idx] });
  },
);

router.delete(
  "/knowledge-base/:id",
  requirePermission("knowledge_base", "write"),
  async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const idx = kbEntries.findIndex((e) => e.id === req.params.id);
    if (idx === -1)
      return res.status(404).json({ success: false, error: "Entry not found" });
    const prev = kbEntries.splice(idx, 1)[0];
    await logContent.kbChange(
      authReq,
      "KB_ENTRY_DELETED",
      req.params.id,
      prev as unknown as Record<string, unknown>,
    );
    return res.json({ success: true, message: "Entry deleted" });
  },
);

router.get("/prompts", async (_req, res: Response) => {
  const data = Object.entries(agentPrompts).map(([agent, prompt]) => ({
    agent,
    prompt,
  }));
  return res.json({ success: true, data });
});

router.put(
  "/prompts/:agentName",
  requirePermission("prompts", "write"),
  async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { agentName } = req.params;
    const { prompt } = req.body;
    if (!prompt)
      return res
        .status(400)
        .json({ success: false, error: "prompt is required" });
    if (!agentPrompts[agentName])
      return res.status(404).json({ success: false, error: "Agent not found" });
    const prev = agentPrompts[agentName];
    agentPrompts[agentName] = prompt;
    await logContent.promptChange(authReq, agentName, prev, prompt);
    return res.json({ success: true, data: { agent: agentName, prompt } });
  },
);

router.get("/langfuse-metrics", async (_req, res: Response) => {
  // Placeholder metrics
  return res.json({
    success: true,
    data: {
      avgFaithfulness: 0.85,
      avgRelevancy: 0.82,
      avgPrecision: 0.78,
      avgRecall: 0.8,
      totalEvaluations: 142,
      trend: [
        { date: "2026-06-01", faithfulness: 0.83, relevancy: 0.8 },
        { date: "2026-06-15", faithfulness: 0.87, relevancy: 0.84 },
      ],
    },
  });
});

export default router;
