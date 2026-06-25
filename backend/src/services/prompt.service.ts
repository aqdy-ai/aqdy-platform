import { AgentPrompt } from "../models/agentPrompt.model.js";
import { logger } from "../utils/logger.js";

type AgentName = "extractor" | "riskClassifier" | "redline";

interface CacheEntry {
  prompt: string;
  fetchedAt: number;
}

const cache = new Map<AgentName, CacheEntry>();
const CACHE_TTL_MS = 60_000;
const fallbacks: Record<AgentName, string> = {
  extractor: "",
  riskClassifier: "",
  redline: "",
};

export function setFallback(agent: AgentName, prompt: string): void {
  fallbacks[agent] = prompt;
}

export async function getPrompt(agent: AgentName): Promise<string> {
  const cached = cache.get(agent);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.prompt;
  }

  try {
    const doc = await AgentPrompt.findOne({ agent }).lean();
    if (doc?.prompt) {
      cache.set(agent, { prompt: doc.prompt, fetchedAt: Date.now() });
      return doc.prompt;
    }
  } catch (error) {
    logger.warn(
      `PromptService: DB error for "${agent}", using fallback`,
      error as object,
    );
  }

  return fallbacks[agent] || "";
}

export function invalidateCache(agent: AgentName): void {
  cache.delete(agent);
}

export function invalidateAllCache(): void {
  cache.clear();
}
