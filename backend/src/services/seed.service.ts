import { KnowledgeBase } from "../models/knowledgeBase.model.js";
import { AgentPrompt } from "../models/agentPrompt.model.js";
import { logger } from "../utils/logger.js";
import legalKb from "../data/legal_kb.json" with { type: "json" };

function toTitle(id: string): string {
  return id
    .replace(/^clause_\d+_/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function seedKnowledgeBase(): Promise<void> {
  try {
    const count = await KnowledgeBase.countDocuments();
    if (count > 0) {
      logger.info(`Seed: KnowledgeBase already has ${count} entries, skipping`);
      return;
    }

    const clauses = (legalKb as { clauses: Array<Record<string, unknown>> })
      .clauses;
    const entries = clauses.map((c) => {
      const context = c.context as Record<string, unknown> | undefined;
      const contractTypes = (context?.contractTypes as string[]) ?? [];
      const regions = (context?.applicableRegions as string[]) ?? [];
      return {
        clauseText: toTitle(c.id as string),
        contractType: contractTypes.join(", ") || "General",
        category: c.category as string,
        jurisdiction: regions.join(", ") || "General",
        riskLevel: c.riskLevel as "low" | "medium" | "high" | "critical",
        clausePattern: c.clausePattern as string,
      };
    });

    await KnowledgeBase.insertMany(entries);
    logger.info(
      `Seed: Inserted ${entries.length} KB entries from legal_kb.json`,
    );
  } catch (error) {
    logger.error("Seed: Failed to seed KnowledgeBase", error as object);
  }
}

export async function seedAgentPrompts(): Promise<void> {
  try {
    const count = await AgentPrompt.countDocuments();
    if (count > 0) {
      logger.info(`Seed: AgentPrompt already has ${count} entries, skipping`);
      return;
    }

    const { EXTRACTOR_SYSTEM_PROMPT } =
      await import("../agents/extractor.prompts.js");
    const { RISK_CLASSIFIER_SYSTEM_PROMPT } =
      await import("../agents/riskClassifier.prompts.js");
    const { REDLINE_SYSTEM_PROMPT } =
      await import("../agents/redline.prompts.js");

    const prompts = [
      { agent: "extractor" as const, prompt: EXTRACTOR_SYSTEM_PROMPT },
      {
        agent: "riskClassifier" as const,
        prompt: RISK_CLASSIFIER_SYSTEM_PROMPT,
      },
      { agent: "redline" as const, prompt: REDLINE_SYSTEM_PROMPT },
    ];

    await AgentPrompt.insertMany(prompts);
    logger.info("Seed: Inserted 3 agent prompts from prompt files");
  } catch (error) {
    logger.error("Seed: Failed to seed AgentPrompt", error as object);
  }
}

export async function seedAll(): Promise<void> {
  await seedKnowledgeBase();
  await seedAgentPrompts();
}
