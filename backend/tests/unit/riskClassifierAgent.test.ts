import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// ── Mock Setup ───────────────────────────────────

const mockInvoke = jest.fn() as jest.Mock;
const mockSearchRecords = jest.fn() as jest.Mock;

// Mock Gemini LLM call
jest.unstable_mockModule("@langchain/google-genai", () => {
  return {
    ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      invoke: mockInvoke,
    })),
  };
});

// Mock Pinecone searchRecords call
jest.unstable_mockModule("@pinecone-database/pinecone", () => {
  return {
    Pinecone: jest.fn().mockImplementation(() => ({
      index: jest.fn().mockImplementation(() => ({
        searchRecords: mockSearchRecords,
      })),
    })),
  };
});

// Import after mocking for ESM hoisting
const { RiskClassifierAgent } =
  await import("../../src/agents/riskClassifier.agent.js");

// ── Helpers ──────────────────────────────────────

function makeLLMResponse(data: {
  riskLevel: string;
  explanation: { ar: string; en: string };
  confidence: number;
}) {
  return JSON.stringify(data);
}

// ── Tests ────────────────────────────────────────

describe("RiskClassifierAgent", () => {
  let agent: InstanceType<typeof RiskClassifierAgent>;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new RiskClassifierAgent(0.75); // threshold 0.75
  });

  test("should throw an error for empty clause text", async () => {
    await expect(agent.classify("", "probation", "en")).rejects.toThrow(
      "Clause text is empty",
    );
    await expect(agent.classify("   ", "probation", "en")).rejects.toThrow(
      "Clause text is empty",
    );
  });

  test("should classify clause successfully with high-score KB match (RAG context)", async () => {
    // 1. Mock Pinecone search finding a high-confidence match
    mockSearchRecords.mockResolvedValueOnce({
      result: {
        hits: [
          {
            _id: "kb_match_001",
            _score: 0.9,
            fields: {
              category: "probation",
              riskLevel: "critical",
              clausePattern: "Probation shall be six months",
              explanation_ar: "فترة اختبار غير قانونية بموجب المادة ٣٢.",
              explanation_en: "Illegal probation under Article 32.",
              whyRisky_ar: "تتجاوز الحد الأقصى.",
              whyRisky_en: "Exceeds maximum limit.",
              saferAlternative_ar: "ثلاثة أشهر بحد أقصى.",
              saferAlternative_en: "Three months maximum.",
              relatedLaw: "Labor Law Article 32",
            },
          },
        ],
      },
    });

    // 2. Mock LLM response confirming critical risk
    mockInvoke.mockResolvedValueOnce({
      content: makeLLMResponse({
        riskLevel: "critical",
        explanation: {
          ar: "هذا البند غير قانوني لأن فترة الاختبار تتجاوز ٣ أشهر.",
          en: "This clause is illegal because probation exceeds 3 months.",
        },
        confidence: 0.8,
      }),
    });

    const result = await agent.classify(
      "The probation period is six months.",
      "probation",
      "en",
    );

    // 3. Assertions
    expect(mockSearchRecords).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    // Verify properties
    expect(result.riskLevel).toBe("critical");
    expect(result.sourceFromKB).toBe("kb_match_001");

    // Confidence calibration: 0.5 * 0.9 (similarity) + 0.5 * 0.8 (llm) = 0.85
    expect(result.confidence).toBe(0.85);
    expect(result.explanation.en).toContain("probation exceeds 3 months");
    expect(result.explanation.ar).toContain("فترة الاختبار تتجاوز ٣ أشهر");
  });

  test("should ignore KB match if score is below threshold", async () => {
    // 1. Mock Pinecone returning a low-confidence match (score 0.6 < 0.75)
    mockSearchRecords.mockResolvedValueOnce({
      result: {
        hits: [
          {
            _id: "kb_match_002",
            _score: 0.6,
            fields: {
              category: "payment",
              riskLevel: "medium",
            },
          },
        ],
      },
    });

    // 2. Mock LLM response
    mockInvoke.mockResolvedValueOnce({
      content: makeLLMResponse({
        riskLevel: "medium",
        explanation: {
          ar: "شرح المخاطر المتوسطة.",
          en: "Explanation of medium risk.",
        },
        confidence: 0.9,
      }),
    });

    const result = await agent.classify(
      "The salary will be paid late.",
      "payment",
      "en",
    );

    // 3. Assertions
    expect(result.riskLevel).toBe("medium");
    expect(result.sourceFromKB).toBeNull(); // below threshold, ignored

    // Calibrated confidence: 0.9 (llm) * 0.9 = 0.81
    expect(result.confidence).toBe(0.81);
  });

  test("should handle case where Pinecone returns no results", async () => {
    // 1. Mock empty matches list
    mockSearchRecords.mockResolvedValueOnce({
      result: {
        hits: [],
      },
    });

    // 2. Mock LLM response
    mockInvoke.mockResolvedValueOnce({
      content: makeLLMResponse({
        riskLevel: "low",
        explanation: {
          ar: "لا يوجد مخاطر.",
          en: "No risks found.",
        },
        confidence: 0.95,
      }),
    });

    const result = await agent.classify(
      "Standard clause text here.",
      "general",
      "en",
    );

    // 3. Assertions
    expect(result.riskLevel).toBe("low");
    expect(result.sourceFromKB).toBeNull();
    // Calibrated confidence: 0.95 * 0.9 = 0.86
    expect(result.confidence).toBe(0.86);
  });

  test("should degrade gracefully and classify without RAG if Pinecone throws an error", async () => {
    // 1. Mock Pinecone client failure
    mockSearchRecords.mockRejectedValueOnce(
      new Error("Pinecone connection lost"),
    );

    // 2. Mock LLM response
    mockInvoke.mockResolvedValueOnce({
      content: makeLLMResponse({
        riskLevel: "high",
        explanation: {
          ar: "شرح بند مرتفع المخاطر.",
          en: "Explanation of high risk.",
        },
        confidence: 0.85,
      }),
    });

    const result = await agent.classify(
      "The employee shall work 80 hours a week without overtime.",
      "overtime",
      "en",
    );

    // 3. Assertions
    expect(result.riskLevel).toBe("high");
    expect(result.sourceFromKB).toBeNull();
    // Calibrated confidence: 0.85 * 0.9 = 0.77
    expect(result.confidence).toBe(0.77);
  });

  test("should throw error if LLM returns invalid JSON", async () => {
    mockSearchRecords.mockResolvedValueOnce({ result: { hits: [] } });
    mockInvoke.mockResolvedValueOnce({ content: "Not a JSON structure" });

    await expect(
      agent.classify("Some clause", "general", "en"),
    ).rejects.toThrow();
  });
});
