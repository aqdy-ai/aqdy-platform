import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// ── Mock Setup ───────────────────────────────────

const mockInvoke = jest.fn() as jest.Mock;

jest.unstable_mockModule("@langchain/google-genai", () => {
  return {
    ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      invoke: mockInvoke,
    })),
  };
});

// Import AFTER mocking (required for ESM mock hoisting)
const { ExtractorAgent } = await import(
  "../../src/agents/extractor.agent.js"
);

// ── Helpers ──────────────────────────────────────

/** Creates a valid JSON response string for a set of clauses */
function makeLLMResponse(clauses: Array<{ clauseNumber: number; clauseText: string; clauseType: string }>) {
  return JSON.stringify(clauses);
}

/** Standard 3-clause English response */
const ENGLISH_CLAUSES = [
  {
    clauseNumber: 1,
    clauseText: "The Employee shall be subject to a probation period of three (3) months.",
    clauseType: "probation",
  },
  {
    clauseNumber: 2,
    clauseText: "The Employer shall pay the Employee a monthly salary of EGP 25,000.",
    clauseType: "payment",
  },
  {
    clauseNumber: 3,
    clauseText: "Either party may terminate this Agreement by providing sixty (60) days' written notice.",
    clauseType: "termination",
  },
];

/** Standard 2-clause Arabic response */
const ARABIC_CLAUSES = [
  {
    clauseNumber: 1,
    clauseText: "يخضع الموظف لفترة اختبار مدتها ثلاثة أشهر من تاريخ مباشرة العمل.",
    clauseType: "probation",
  },
  {
    clauseNumber: 2,
    clauseText: "يلتزم صاحب العمل بدفع راتب شهري قدره ٢٠,٠٠٠ جنيه مصري.",
    clauseType: "payment",
  },
];

// ── Tests ────────────────────────────────────────

describe("ExtractorAgent", () => {
  let agent: InstanceType<typeof ExtractorAgent>;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new ExtractorAgent();
  });

  // ────────────────────────────────────────────────
  // Basic extraction
  // ────────────────────────────────────────────────

  describe("extract() — Basic English contract", () => {
    test("should extract clauses from an English contract", async () => {
      mockInvoke.mockResolvedValueOnce({
        content: makeLLMResponse(ENGLISH_CLAUSES),
      });

      const result = await agent.extract(
        "Article 1: Probation\nThe Employee shall be subject to a probation period...\n\nArticle 2: Compensation\nThe Employer shall pay...",
        "en",
      );

      expect(result.clauses).toHaveLength(3);
      expect(result.language).toBe("en");
      expect(result.chunkCount).toBe(1);
      expect(result.clauses[0].clauseType).toBe("probation");
      expect(result.clauses[1].clauseType).toBe("payment");
      expect(result.clauses[2].clauseType).toBe("termination");
    });
  });

  describe("extract() — Basic Arabic contract", () => {
    test("should extract clauses from an Arabic contract", async () => {
      mockInvoke.mockResolvedValueOnce({
        content: makeLLMResponse(ARABIC_CLAUSES),
      });

      const result = await agent.extract(
        "المادة الأولى: فترة الاختبار\nيخضع الموظف لفترة اختبار...\n\nالمادة الثانية: الراتب\nيلتزم صاحب العمل بدفع...",
        "ar",
      );

      expect(result.clauses).toHaveLength(2);
      expect(result.language).toBe("ar");
      expect(result.clauses[0].clauseType).toBe("probation");
      expect(result.clauses[1].clauseType).toBe("payment");
    });
  });

  // ────────────────────────────────────────────────
  // Language auto-detection
  // ────────────────────────────────────────────────

  describe("extract() — Language auto-detection", () => {
    test("should auto-detect English language", async () => {
      mockInvoke.mockResolvedValueOnce({
        content: makeLLMResponse(ENGLISH_CLAUSES),
      });

      const result = await agent.extract(
        "This Employment Agreement is entered into between TechCorp and the Employee.",
      );

      expect(result.language).toBe("en");
    });

    test("should auto-detect Arabic language", async () => {
      mockInvoke.mockResolvedValueOnce({
        content: makeLLMResponse(ARABIC_CLAUSES),
      });

      const result = await agent.extract(
        "عقد عمل بين شركة النيل للتكنولوجيا والموظف أحمد حسن محمود.",
      );

      expect(result.language).toBe("ar");
    });
  });

  // ────────────────────────────────────────────────
  // JSON parsing edge cases
  // ────────────────────────────────────────────────

  describe("extract() — JSON parsing", () => {
    test("should handle JSON wrapped in markdown fences", async () => {
      const fencedJSON = "```json\n" + makeLLMResponse(ENGLISH_CLAUSES) + "\n```";
      mockInvoke.mockResolvedValueOnce({ content: fencedJSON });

      const result = await agent.extract("Some contract text", "en");

      expect(result.clauses).toHaveLength(3);
    });

    test("should handle JSON with surrounding text", async () => {
      const messyResponse =
        "Here are the extracted clauses:\n" +
        makeLLMResponse(ENGLISH_CLAUSES) +
        "\n\nI found 3 clauses.";
      mockInvoke.mockResolvedValueOnce({ content: messyResponse });

      const result = await agent.extract("Some contract text", "en");

      expect(result.clauses).toHaveLength(3);
    });
  });

  // ────────────────────────────────────────────────
  // Invalid JSON / LLM failure
  // ────────────────────────────────────────────────

  describe("extract() — Error handling", () => {
    test("should throw for empty contract text", async () => {
      await expect(agent.extract("")).rejects.toThrow("Contract text is empty");
      await expect(agent.extract("   ")).rejects.toThrow("Contract text is empty");
    });

    test("should throw when LLM returns completely invalid JSON", async () => {
      // The LLM call succeeds, but parsing fails
      mockInvoke.mockResolvedValueOnce({ content: "This is not JSON at all" });

      // The first successful LLM call returns invalid JSON,
      // safeParseJSON will throw, and the whole extract() call will fail
      await expect(
        agent.extract("Some contract", "en"),
      ).rejects.toThrow();
    });
  });

  // ────────────────────────────────────────────────
  // Clause repair
  // ────────────────────────────────────────────────

  describe("extract() — Clause repair", () => {
    test("should repair clauses with missing clauseNumber", async () => {
      const partial = [
        { clauseText: "First clause text", clauseType: "payment" },
        { clauseText: "Second clause text", clauseType: "termination" },
      ];
      mockInvoke.mockResolvedValueOnce({
        content: JSON.stringify(partial),
      });

      const result = await agent.extract("Contract text here", "en");

      expect(result.clauses).toHaveLength(2);
      expect(result.clauses[0].clauseNumber).toBe(1);
      expect(result.clauses[1].clauseNumber).toBe(2);
    });

    test("should skip clauses with empty clauseText", async () => {
      const partial = [
        { clauseNumber: 1, clauseText: "Valid clause", clauseType: "payment" },
        { clauseNumber: 2, clauseText: "", clauseType: "other" }, // invalid
        { clauseNumber: 3, clauseText: "Another valid", clauseType: "termination" },
      ];
      mockInvoke.mockResolvedValueOnce({
        content: JSON.stringify(partial),
      });

      const result = await agent.extract("Contract text", "en");

      expect(result.clauses).toHaveLength(2);
    });

    test("should default clauseType to 'other' when missing", async () => {
      const partial = [
        { clauseNumber: 1, clauseText: "Some clause" },
      ];
      mockInvoke.mockResolvedValueOnce({
        content: JSON.stringify(partial),
      });

      const result = await agent.extract("Contract text", "en");

      expect(result.clauses[0].clauseType).toBe("other");
    });
  });

  // ────────────────────────────────────────────────
  // Long contract chunking
  // ────────────────────────────────────────────────

  describe("extract() — Long contract chunking", () => {
    test("should chunk and merge long contracts", async () => {
      // Create an agent with a very small chunk size for testing
      const smallChunkAgent = new ExtractorAgent(200);

      // Create a contract that exceeds 200 chars with distinct paragraphs
      const longContract =
        "Article 1: Payment\n" +
        "A".repeat(100) +
        "\n\n" +
        "Article 2: Termination\n" +
        "B".repeat(100) +
        "\n\n" +
        "Article 3: Liability\n" +
        "C".repeat(100);

      const chunk1Clauses = [
        { clauseNumber: 1, clauseText: "Clause from chunk 1", clauseType: "payment" },
      ];
      const chunk2Clauses = [
        { clauseNumber: 1, clauseText: "Clause from chunk 2", clauseType: "termination" },
      ];
      const chunk3Clauses = [
        { clauseNumber: 1, clauseText: "Clause from chunk 3", clauseType: "liability" },
      ];

      mockInvoke
        .mockResolvedValueOnce({ content: makeLLMResponse(chunk1Clauses) })
        .mockResolvedValueOnce({ content: makeLLMResponse(chunk2Clauses) })
        .mockResolvedValueOnce({ content: makeLLMResponse(chunk3Clauses) });

      const result = await smallChunkAgent.extract(longContract, "en");

      expect(result.chunkCount).toBeGreaterThan(1);
      expect(result.clauses).toHaveLength(3);
      // Verify renumbering
      expect(result.clauses[0].clauseNumber).toBe(1);
      expect(result.clauses[1].clauseNumber).toBe(2);
      expect(result.clauses[2].clauseNumber).toBe(3);
    });

    test("should deduplicate clauses across chunks", async () => {
      const smallChunkAgent = new ExtractorAgent(200);

      const longContract =
        "A".repeat(150) + "\n\n" + "B".repeat(150);

      // Simulate overlapping clause extraction from two chunks
      const chunk1 = [
        { clauseNumber: 1, clauseText: "Shared clause text", clauseType: "payment" },
        { clauseNumber: 2, clauseText: "Unique to chunk 1", clauseType: "other" },
      ];
      const chunk2 = [
        { clauseNumber: 1, clauseText: "Shared clause text", clauseType: "payment" },
        { clauseNumber: 2, clauseText: "Unique to chunk 2", clauseType: "other" },
      ];

      mockInvoke
        .mockResolvedValueOnce({ content: makeLLMResponse(chunk1) })
        .mockResolvedValueOnce({ content: makeLLMResponse(chunk2) });

      const result = await smallChunkAgent.extract(longContract, "en");

      // "Shared clause text" should appear only once
      expect(result.clauses).toHaveLength(3);
    });
  });

  // ────────────────────────────────────────────────
  // Metadata in result
  // ────────────────────────────────────────────────

  describe("extract() — Result metadata", () => {
    test("should include model info and timing", async () => {
      mockInvoke.mockResolvedValueOnce({
        content: makeLLMResponse(ENGLISH_CLAUSES),
      });

      const result = await agent.extract("Some contract", "en");

      expect(result.modelUsed).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.usedFallback).toBe("boolean");
    });
  });

  // ────────────────────────────────────────────────
  // Zod schema validation
  // ────────────────────────────────────────────────

  describe("extract() — Output validation", () => {
    test("should return properly typed clauses", async () => {
      mockInvoke.mockResolvedValueOnce({
        content: makeLLMResponse(ENGLISH_CLAUSES),
      });

      const result = await agent.extract("Contract text", "en");

      for (const clause of result.clauses) {
        expect(typeof clause.clauseNumber).toBe("number");
        expect(typeof clause.clauseText).toBe("string");
        expect(typeof clause.clauseType).toBe("string");
        expect(clause.clauseText.length).toBeGreaterThan(0);
        expect(clause.clauseNumber).toBeGreaterThan(0);
      }
    });
  });

  // ────────────────────────────────────────────────
  // OCR Artifacts & Meaning Preservation
  // ────────────────────────────────────────────────

  describe("extract() — OCR Artifacts & Meaning Preservation", () => {
    test("should contain OCR handling instructions in the system prompt", () => {
      const { EXTRACTOR_SYSTEM_PROMPT } = require("../../src/agents/extractor.prompts.js");
      expect(EXTRACTOR_SYSTEM_PROMPT).toContain("OCR Artifact Handling");
      expect(EXTRACTOR_SYSTEM_PROMPT).toContain("HIGH CONFIDENCE RULE");
      expect(EXTRACTOR_SYSTEM_PROMPT).toContain("MEANING PRESERVATION RULE");
    });

    test("should mock processing of English OCR-damaged contract text", async () => {
      const ocrDamagedText = "T h e   E m p l o y e e shall be subject to a pro-bation period of three (3) months.";
      const cleanedClauses = [
        {
          clauseNumber: 1,
          clauseText: "The Employee shall be subject to a probation period of three (3) months.",
          clauseType: "probation",
        },
      ];

      mockInvoke.mockResolvedValueOnce({
        content: makeLLMResponse(cleanedClauses),
      });

      const result = await agent.extract(ocrDamagedText, "en");
      expect(result.clauses[0].clauseText).toBe("The Employee shall be subject to a probation period of three (3) months.");
      expect(result.clauses[0].clauseType).toBe("probation");
    });

    test("should mock processing of Arabic OCR-damaged contract text", async () => {
      const ocrDamagedText = "يخـ ضع ال موظف لفترة اخـ تبار مدتها ثلاثة أشهر من تاريـ خ مباشرة العمل.";
      const cleanedClauses = [
        {
          clauseNumber: 1,
          clauseText: "يخضع الموظف لفترة اختبار مدتها ثلاثة أشهر من تاريخ مباشرة العمل.",
          clauseType: "probation",
        },
      ];

      mockInvoke.mockResolvedValueOnce({
        content: makeLLMResponse(cleanedClauses),
      });

      const result = await agent.extract(ocrDamagedText, "ar");
      expect(result.clauses[0].clauseText).toBe("يخضع الموظف لفترة اختبار مدتها ثلاثة أشهر من تاريخ مباشرة العمل.");
    });

    test("should mock processing of Mixed Arabic/English OCR-damaged contract text", async () => {
      const ocrDamagedText = "Article 1: P r e m i s e s / العين المؤجـ رة\nThe Landlord leases to the T e n a n t...";
      const cleanedClauses = [
        {
          clauseNumber: 1,
          clauseText: "The Landlord leases to the Tenant...",
          clauseType: "other",
        },
      ];

      mockInvoke.mockResolvedValueOnce({
        content: makeLLMResponse(cleanedClauses),
      });

      const result = await agent.extract(ocrDamagedText, "ar");
      expect(result.clauses[0].clauseText).toBe("The Landlord leases to the Tenant...");
    });

    test("should mock preservation of clean contract text exactly without improvements", async () => {
      const cleanText = "The Employer shall pay the Employee a monthly salary of EGP 25,000.";
      const preservedClauses = [
        {
          clauseNumber: 1,
          clauseText: "The Employer shall pay the Employee a monthly salary of EGP 25,000.",
          clauseType: "payment",
        },
      ];

      mockInvoke.mockResolvedValueOnce({
        content: makeLLMResponse(preservedClauses),
      });

      const result = await agent.extract(cleanText, "en");
      expect(result.clauses[0].clauseText).toBe("The Employer shall pay the Employee a monthly salary of EGP 25,000.");
    });
  });
});

