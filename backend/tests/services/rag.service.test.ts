import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// ── Mock Setup ───────────────────────────────────

const mockSearchRecords = jest.fn() as jest.Mock;

jest.unstable_mockModule("@pinecone-database/pinecone", () => ({
  Pinecone: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue({
      searchRecords: mockSearchRecords,
    }),
  })),
}));

// Import AFTER mocking (required for ESM mock hoisting)
const { RAGService } = await import("../../src/services/rag.service.js");

// ── Helpers ──────────────────────────────────────

const createMatch = (overrides: Partial<{
  id: string;
  score: number;
  category: string;
  riskLevel: string;
  clausePattern: string;
  explanation: { ar: string; en: string };
  whyRisky: { ar: string; en: string };
  saferAlternative: { ar: string; en: string };
  relatedLaw: string;
}> = {}) => ({
  id: overrides.id ?? "clause_001",
  score: overrides.score ?? 0.85,
  category: overrides.category ?? "liability",
  riskLevel: (overrides.riskLevel ?? "high") as "low" | "medium" | "high" | "critical",
  clausePattern: overrides.clausePattern ?? "Unlimited liability clause",
  explanation: overrides.explanation ?? { ar: "شرح", en: "Explanation" },
  whyRisky: overrides.whyRisky ?? { ar: "خطير", en: "Risky" },
  saferAlternative: overrides.saferAlternative ?? { ar: "بديل", en: "Alternative" },
  relatedLaw: overrides.relatedLaw ?? "Article 224",
});

/** Creates a Pinecone hit in the searchRecords response format */
const createPineconeHit = (id: string, score: number, fields: Record<string, unknown> = {}) => ({
  _id: id,
  _score: score,
  fields: {
    category: "liability",
    riskLevel: "critical",
    text: "Unlimited liability clause text",
    explanation_ar: "شرح عربي",
    explanation_en: "English explanation",
    whyRisky_ar: "خطير جداً",
    whyRisky_en: "Very risky",
    saferAlternative_ar: "حدد المسؤولية",
    saferAlternative_en: "Cap the liability",
    relatedLaw: "Egyptian Civil Code Article 224",
    ...fields,
  },
});

// ── Tests ────────────────────────────────────────

describe("RAGService — MMR Reranking", () => {
  let ragService: InstanceType<typeof RAGService>;

  beforeEach(() => {
    jest.clearAllMocks();
    ragService = new RAGService();
  });

  const mockMatches = [
    createMatch({ id: "clause_001", score: 0.95, category: "liability", riskLevel: "critical" }),
    createMatch({ id: "clause_002", score: 0.85, category: "liability", riskLevel: "high" }),
    createMatch({ id: "clause_003", score: 0.75, category: "confidentiality", riskLevel: "medium" }),
  ];

  test("should return single match without modification", () => {
    const result = ragService.applyMMR([mockMatches[0]]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("clause_001");
  });

  test("should apply MMR and return at most 3 results", () => {
    const result = ragService.applyMMR(mockMatches);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0].id).toBe("clause_001");
  });

  test("should prefer diverse categories over similar ones", () => {
    const result = ragService.applyMMR(mockMatches);
    const categories = result.map((m) => m.category);
    const uniqueCategories = new Set(categories);
    expect(uniqueCategories.size).toBeGreaterThan(1);
  });

  test("should return empty array for empty input", () => {
    const result = ragService.applyMMR([]);
    expect(result).toHaveLength(0);
  });
});

describe("RAGService — Confidence Scoring", () => {
  let ragService: InstanceType<typeof RAGService>;

  beforeEach(() => {
    jest.clearAllMocks();
    ragService = new RAGService();
  });

  test("should return 0 for empty matches", () => {
    expect(ragService.calculateConfidence([])).toBe(0);
  });

  test("should return 0.95 for score >= 0.9", () => {
    expect(ragService.calculateConfidence([createMatch({ score: 0.95 })])).toBe(0.95);
  });

  test("should return 0.85 for score >= 0.8", () => {
    expect(ragService.calculateConfidence([createMatch({ score: 0.82 })])).toBe(0.85);
  });

  test("should return 0.75 for score >= 0.7", () => {
    expect(ragService.calculateConfidence([createMatch({ score: 0.72 })])).toBe(0.75);
  });

  test("should return 0.60 for score >= 0.6", () => {
    expect(ragService.calculateConfidence([createMatch({ score: 0.62 })])).toBe(0.6);
  });

  test("should return 0.40 for score < 0.6", () => {
    expect(ragService.calculateConfidence([createMatch({ score: 0.55 })])).toBe(0.4);
  });
});

describe("RAGService — searchKB", () => {
  let ragService: InstanceType<typeof RAGService>;

  beforeEach(() => {
    jest.clearAllMocks();
    ragService = new RAGService();
  });

  test("should return empty result for empty clause text", async () => {
    const result = await ragService.searchKB("");
    expect(result.hasMatch).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.matches).toHaveLength(0);
  });

  test("should return empty result for whitespace-only input", async () => {
    const result = await ragService.searchKB("   ");
    expect(result.hasMatch).toBe(false);
    expect(result.confidence).toBe(0);
  });

  test("should return matches when Pinecone returns hits", async () => {
    mockSearchRecords.mockResolvedValueOnce({
      result: {
        hits: [
          createPineconeHit("clause_001", 0.95),
          createPineconeHit("clause_010", 0.72, { category: "payment", riskLevel: "medium" }),
        ],
      },
    });

    const result = await ragService.searchKB("unlimited liability clause");

    expect(result.hasMatch).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].id).toBe("clause_001");
  });

  test("should filter out low-score hits (< 0.5)", async () => {
    mockSearchRecords.mockResolvedValueOnce({
      result: {
        hits: [
          createPineconeHit("clause_001", 0.3),
          createPineconeHit("clause_002", 0.2),
        ],
      },
    });

    const result = await ragService.searchKB("some random text");

    expect(result.hasMatch).toBe(false);
    expect(result.matches).toHaveLength(0);
  });

  test("should map Pinecone fields to KBMatch structure correctly", async () => {
    mockSearchRecords.mockResolvedValueOnce({
      result: {
        hits: [
          createPineconeHit("clause_007", 0.88, {
            category: "penalties",
            riskLevel: "high",
            text: "50% penalty per incident",
            explanation_ar: "شرط جزائي",
            explanation_en: "Penalty clause",
            whyRisky_ar: "عقوبة مفرطة",
            whyRisky_en: "Excessive penalty",
            saferAlternative_ar: "حدد العقوبات",
            saferAlternative_en: "Cap penalties",
            relatedLaw: "Egyptian Civil Code Article 224",
          }),
        ],
      },
    });

    const result = await ragService.searchKB("penalty clause");
    const match = result.matches[0];

    expect(match.id).toBe("clause_007");
    expect(match.category).toBe("penalties");
    expect(match.riskLevel).toBe("high");
    expect(match.explanation.ar).toBe("شرط جزائي");
    expect(match.explanation.en).toBe("Penalty clause");
    expect(match.whyRisky.en).toBe("Excessive penalty");
    expect(match.saferAlternative.en).toBe("Cap penalties");
    expect(match.relatedLaw).toBe("Egyptian Civil Code Article 224");
  });

  test("should degrade gracefully when Pinecone throws an error", async () => {
    mockSearchRecords.mockRejectedValueOnce(new Error("Pinecone unavailable"));

    const result = await ragService.searchKB("some clause text");

    expect(result.hasMatch).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.matches).toHaveLength(0);
  });

  test("should handle empty hits array from Pinecone", async () => {
    mockSearchRecords.mockResolvedValueOnce({
      result: { hits: [] },
    });

    const result = await ragService.searchKB("clause text");

    expect(result.hasMatch).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.matches).toHaveLength(0);
  });

  test("should handle missing relatedLaw gracefully", async () => {
    mockSearchRecords.mockResolvedValueOnce({
      result: {
        hits: [
          createPineconeHit("clause_099", 0.8, { relatedLaw: "" }),
        ],
      },
    });

    const result = await ragService.searchKB("clause");
    expect(result.matches[0].relatedLaw).toBeFalsy();
  });
});