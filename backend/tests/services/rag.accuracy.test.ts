import { describe, test, expect, jest } from "@jest/globals";
import { RAGService, KBMatch } from "../../src/services/rag.service.js";

const ragService = new RAGService();

const createMatch = (
  id: string,
  score: number,
  category: string,
  riskLevel: KBMatch["riskLevel"],
): KBMatch => ({
  id,
  score,
  category,
  riskLevel,
  clausePattern: `Pattern for ${id}`,
  explanation: { ar: "شرح", en: "Explanation" },
  whyRisky: { ar: "خطير", en: "Risky" },
  saferAlternative: { ar: "بديل", en: "Alternative" },
});

describe("RAG Accuracy: MMR Diversity", () => {
  test("should prefer diverse results over similar ones", () => {
    const matches = [
      createMatch("c1", 0.95, "liability", "critical"),
      createMatch("c2", 0.9, "liability", "high"),
      createMatch("c3", 0.85, "confidentiality", "medium"),
      createMatch("c4", 0.8, "payment", "low"),
    ];

    const result = ragService.applyMMR(matches, 0.7);
    const categories = result.map((m) => m.category);
    const uniqueCategories = new Set(categories);

    expect(uniqueCategories.size).toBeGreaterThan(1);
  });

  test("should always include highest scoring match first", () => {
    const matches = [
      createMatch("c1", 0.95, "liability", "critical"),
      createMatch("c2", 0.85, "confidentiality", "medium"),
      createMatch("c3", 0.75, "payment", "low"),
    ];

    const result = ragService.applyMMR(matches);
    expect(result[0].id).toBe("c1");
  });

  test("should return max 3 results", () => {
    const matches = Array.from({ length: 10 }, (_, i) =>
      createMatch(`c${i}`, 0.9 - i * 0.05, "liability", "high"),
    );

    const result = ragService.applyMMR(matches);
    expect(result.length).toBeLessThanOrEqual(3);
  });
});

describe("RAG Accuracy: Confidence Thresholds", () => {
  test("confidence >= 0.6 means hasMatch = true", async () => {
    jest
      .spyOn(ragService, "semanticSearch")
      .mockResolvedValue([createMatch("c1", 0.85, "liability", "high")]);

    const result = await ragService.searchKB("liability clause");
    expect(result.hasMatch).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  test("confidence < 0.6 means hasMatch = false", async () => {
    jest
      .spyOn(ragService, "semanticSearch")
      .mockResolvedValue([createMatch("c1", 0.55, "liability", "low")]);

    const result = await ragService.searchKB("some random text");
    expect(result.hasMatch).toBe(false);
  });

  test("empty results means no match", async () => {
    jest.spyOn(ragService, "semanticSearch").mockResolvedValue([]);

    const result = await ragService.searchKB("completely unknown clause");
    expect(result.hasMatch).toBe(false);
    expect(result.confidence).toBe(0);
  });
});

describe("RAG Accuracy: Risk Level Mapping", () => {
  test("should preserve critical risk level from KB match", async () => {
    jest
      .spyOn(ragService, "semanticSearch")
      .mockResolvedValue([createMatch("c1", 0.95, "liability", "critical")]);

    const result = await ragService.searchKB("unlimited liability");
    expect(result.matches[0].riskLevel).toBe("critical");
  });

  test("should preserve high risk level from KB match", async () => {
    jest
      .spyOn(ragService, "semanticSearch")
      .mockResolvedValue([createMatch("c1", 0.85, "confidentiality", "high")]);

    const result = await ragService.searchKB("broad confidentiality");
    expect(result.matches[0].riskLevel).toBe("high");
  });
});
