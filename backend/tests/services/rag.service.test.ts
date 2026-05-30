import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// ── Mock Setup ───────────────────────────────────

const mockSearchRecords = jest.fn() as jest.Mock;
const mockIndex = jest.fn().mockImplementation(() => ({
  searchRecords: mockSearchRecords,
}));

jest.unstable_mockModule("@pinecone-database/pinecone", () => {
  return {
    Pinecone: jest.fn().mockImplementation(() => ({
      index: mockIndex,
    })),
  };
});

const mockCallFallback = jest.fn() as jest.Mock;
jest.unstable_mockModule("../../src/services/llm.service.js", () => {
  return {
    llmService: {
      callFallback: mockCallFallback,
    },
  };
});

// Import after mocking
const { ragService, RAGService } = await import("../../src/services/rag.service.js");

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

describe("RAG Service — expandQuery()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should expand query with terms from LLM", async () => {
    mockCallFallback.mockResolvedValueOnce({
      content: "unilateral modification adjustment alter change",
    });

    const result = await ragService.expandQuery("salary decrease");

    expect(result).toBe("salary decrease unilateral modification adjustment alter change");
    expect(mockCallFallback).toHaveBeenCalledTimes(1);
  });

  test("should fallback to original query if LLM call fails", async () => {
    mockCallFallback.mockRejectedValueOnce(new Error("LLM failure"));

    const result = await ragService.expandQuery("salary decrease");

    expect(result).toBe("salary decrease");
    expect(mockCallFallback).toHaveBeenCalledTimes(1);
  });
});

describe("RAG Service — applyMMR() Vector Mode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return all hits if topK is greater than hits length", () => {
    const hits = [{ id: "1" }, { id: "2" }];
    const result = ragService.applyMMR(hits, 5);
    expect(result).toEqual(hits);
  });

  test("should perform MMR selection based on similarity and diversity", () => {
    const hits = [
      { id: "A", _score: 0.9, values: [1.0, 0.0] },
      { id: "B", _score: 0.8, values: [0.95, 0.05] }, // Highly similar to A
      { id: "C", _score: 0.65, values: [0.1, 0.9] },   // Distinct from A (diverse)
    ];

    const result = ragService.applyMMR(hits, 2, 0.5);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("A");
    expect(result[1].id).toBe("C"); // Diverse result selected over B
  });

  test("should fallback to relevance ranking if vectors are missing", () => {
    const hits = [
      { id: "A", _score: 0.9 },
      { id: "B", _score: 0.8 },
    ];

    const result = ragService.applyMMR(hits, 2, 0.5);
    expect(result[0].id).toBe("A");
    expect(result[1].id).toBe("B");
  });
});

describe("RAGService — MMR Reranking Category Mode", () => {
  let service: InstanceType<typeof RAGService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RAGService();
  });

  const mockMatches = [
    createMatch({ id: "clause_001", score: 0.95, category: "liability", riskLevel: "critical" }),
    createMatch({ id: "clause_002", score: 0.85, category: "liability", riskLevel: "high" }),
    createMatch({ id: "clause_003", score: 0.75, category: "confidentiality", riskLevel: "medium" }),
  ];

  test("should return single match without modification", () => {
    const result = service.applyMMR([mockMatches[0]]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("clause_001");
  });

  test("should apply MMR and return at most 3 results", () => {
    const result = service.applyMMR(mockMatches);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0].id).toBe("clause_001");
  });

  test("should prefer diverse categories over similar ones", () => {
    const result = service.applyMMR(mockMatches);
    const categories = result.map((m) => m.category);
    const uniqueCategories = new Set(categories);
    expect(uniqueCategories.size).toBeGreaterThan(1);
  });

  test("should return empty array for empty input", () => {
    const result = service.applyMMR([]);
    expect(result).toHaveLength(0);
  });
});

describe("RAGService — Confidence Scoring", () => {
  let service: InstanceType<typeof RAGService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RAGService();
  });

  test("should return 0 for empty matches", () => {
    expect(service.calculateConfidence([])).toBe(0);
  });

  test("should return 0.95 for score >= 0.9", () => {
    expect(service.calculateConfidence([createMatch({ score: 0.95 })])).toBe(0.95);
  });

  test("should return 0.85 for score >= 0.8", () => {
    expect(service.calculateConfidence([createMatch({ score: 0.82 })])).toBe(0.85);
  });

  test("should return 0.75 for score >= 0.7", () => {
    expect(service.calculateConfidence([createMatch({ score: 0.72 })])).toBe(0.75);
  });

  test("should return 0.60 for score >= 0.6", () => {
    expect(service.calculateConfidence([createMatch({ score: 0.62 })])).toBe(0.6);
  });

  test("should return 0.40 for score < 0.6", () => {
    expect(service.calculateConfidence([createMatch({ score: 0.55 })])).toBe(0.4);
  });
});

describe("RAG Service — search()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPineconeHits = [
    {
      _id: "clause_001",
      _score: 0.85,
      values: [1, 0],
      fields: {
        category: "Liability",
        riskLevel: "critical",
        clausePattern: "Unlimited liability clause...",
        explanation_ar: "شرح المسؤولية",
        explanation_en: "Explanation of liability",
        whyRisky_ar: "مخاطر",
        whyRisky_en: "Risks",
        saferAlternative_ar: "بديل",
        saferAlternative_en: "Alternative",
        negotiationTips_ar: "نصائح",
        negotiationTips_en: "Tips",
        relatedLaw: "Civil Code Art. 224",
        contractTypes: ["Service Agreement"],
        frequency: "very_common",
        applicableRegions: ["Egypt"],
      },
    },
  ];

  test("should execute search and map results correctly", async () => {
    mockCallFallback.mockResolvedValueOnce({ content: "expansion terms" });
    mockSearchRecords.mockResolvedValueOnce({
      result: { hits: mockPineconeHits },
    });

    const results = await ragService.search("liability cap", {
      enableMMR: false,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: "clause_001",
      score: 0.85,
      category: "Liability",
      riskLevel: "critical",
      clausePattern: "Unlimited liability clause...",
      explanation: { ar: "شرح المسؤولية", en: "Explanation of liability" },
      whyRisky: { ar: "مخاطر", en: "Risks" },
      saferAlternative: { ar: "بديل", en: "Alternative" },
      negotiationTips: { ar: "نصائح", en: "Tips" },
      relatedLaw: "Civil Code Art. 224",
      contractTypes: ["Service Agreement"],
      frequency: "very_common",
      applicableRegions: ["Egypt"],
    });

    expect(mockSearchRecords).toHaveBeenCalledWith({
      query: {
        inputs: { text: "liability cap expansion terms" },
        topK: 5,
        includeValues: false,
      },
    });
  });

  test("should construct correct filters for category, riskLevel, and contractTypes", async () => {
    mockCallFallback.mockResolvedValueOnce({ content: "" });
    mockSearchRecords.mockResolvedValueOnce({
      result: { hits: [] },
    });

    await ragService.search("payment terms", {
      category: "payment",
      riskLevel: "high",
      contractType: "freelance",
      enableMMR: false,
    });

    expect(mockSearchRecords).toHaveBeenCalledWith({
      query: {
        inputs: { text: "payment terms " },
        topK: 5,
        includeValues: false,
        filter: {
          $and: [
            {
              $or: [
                { category: { $eq: "Payment" } },
                { category: { $eq: "payment" } },
              ],
            },
            {
              riskLevel: { $eq: "high" },
            },
            {
              $or: [
                { contractTypes: { $in: ["Freelance Contract"] } },
                { contractTypes: { $in: ["freelance contract"] } },
                { contractTypes: { $in: ["freelance"] } },
              ],
            },
          ],
        },
      },
    });
  });

  test("should handle search errors and log them", async () => {
    mockCallFallback.mockResolvedValueOnce({ content: "" });
    mockSearchRecords.mockRejectedValueOnce(new Error("Pinecone connection lost"));

    await expect(
      ragService.search("test", { enableQueryExpansion: false })
    ).rejects.toThrow("RAG search operation failed");
  });
});

describe("RAGService — searchKB", () => {
  let service: InstanceType<typeof RAGService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RAGService();
  });

  test("should return empty result for empty clause text", async () => {
    const result = await service.searchKB("");
    expect(result.hasMatch).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.matches).toHaveLength(0);
  });

  test("should return empty result for whitespace-only input", async () => {
    const result = await service.searchKB("   ");
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

    const result = await service.searchKB("unlimited liability clause");

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

    const result = await service.searchKB("some random text");

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

    const result = await service.searchKB("penalty clause");
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

    const result = await service.searchKB("some clause text");

    expect(result.hasMatch).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.matches).toHaveLength(0);
  });

  test("should handle empty hits array from Pinecone", async () => {
    mockSearchRecords.mockResolvedValueOnce({
      result: { hits: [] },
    });

    const result = await service.searchKB("clause text");

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

    const result = await service.searchKB("clause");
    expect(result.matches[0].relatedLaw).toBeFalsy();
  });
});
