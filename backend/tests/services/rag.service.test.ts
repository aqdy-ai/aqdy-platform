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
const { ragService } = await import("../../src/services/rag.service.js");

// ── Tests ────────────────────────────────────────

describe("RAG Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("expandQuery()", () => {
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

  describe("applyMMR()", () => {
    test("should return all hits if topK is greater than hits length", () => {
      const hits = [{ id: "1" }, { id: "2" }];
      const result = ragService.applyMMR(hits, 5);
      expect(result).toEqual(hits);
    });

    test("should perform MMR selection based on similarity and diversity", () => {
      // Setup vectors of size 2
      // Query is represented by highest score being first in hits
      const hits = [
        { id: "A", _score: 0.9, values: [1.0, 0.0] },
        { id: "B", _score: 0.8, values: [0.95, 0.05] }, // Highly similar to A
        { id: "C", _score: 0.65, values: [0.1, 0.9] },   // Distinct from A (diverse)
      ];

      // With lambda = 0.5:
      // First selected: A
      // Candidate B MMR score: 0.5 * 0.8 - 0.5 * cosSim(B, A) = 0.4 - 0.5 * 0.95 = 0.4 - 0.475 = -0.075
      // Candidate C MMR score: 0.5 * 0.65 - 0.5 * cosSim(C, A) = 0.325 - 0.5 * 0.1 = 0.325 - 0.05 = 0.275
      // C should be selected before B because it's much more diverse!
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

  describe("search()", () => {
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
});
