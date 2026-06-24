import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// ── Mock Setup ───────────────────────────────────

const mockInvoke = jest.fn() as jest.Mock;
const mockSearchRecords = jest.fn() as jest.Mock;
const mockGetPrompt = jest.fn() as jest.Mock;

jest.unstable_mockModule("../../src/services/prompt.service.js", () => ({
  getPrompt: mockGetPrompt,
  setFallback: jest.fn(),
}));

jest.unstable_mockModule("@langchain/google-genai", () => {
  return {
    ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      invoke: mockInvoke,
    })),
  };
});

jest.unstable_mockModule("@pinecone-database/pinecone", () => {
  return {
    Pinecone: jest.fn().mockImplementation(() => ({
      index: jest.fn().mockImplementation(() => ({
        searchRecords: mockSearchRecords,
      })),
    })),
  };
});

// Import AFTER mocking
const { RiskClassifierAgent } =
  await import("../../src/agents/riskClassifier.agent.js");

jest.setTimeout(30000);

// ── Simulated LLM Responses ─────────────────────
// These simulate what the LLM would return for various clauses.

const CLASSIFICATION_RESPONSES = {
  "low-risk-en": {
    riskLevel: "low",
    confidence: 0.92,
    explanation: {
      en: "Standard clause.",
      ar: "بند قياسي.",
    },
  },
  "medium-risk-en": {
    riskLevel: "medium",
    confidence: 0.76,
    explanation: {
      en: "Requires careful review.",
      ar: "يتطلب مراجعة دقيقة.",
    },
  },
  "high-risk-en": {
    riskLevel: "high",
    confidence: 0.82,
    explanation: {
      en: "Significant potential impact.",
      ar: "تأثير محتمل كبير.",
    },
  },
  "critical-risk-en": {
    riskLevel: "critical",
    confidence: 0.95,
    explanation: {
      en: "Could lead to severe financial or legal consequences.",
      ar: "قد يؤدي إلى عواقب مالية أو قانونية وخيمة.",
    },
  },
  "low-risk-ar": {
    riskLevel: "low",
    confidence: 0.9,
    explanation: {
      en: "Standard clause.",
      ar: "بند قياسي.",
    },
  },
  "medium-risk-ar": {
    riskLevel: "medium",
    confidence: 0.78,
    explanation: {
      en: "Requires careful review.",
      ar: "يتطلب مراجعة دقيقة.",
    },
  },
  "high-risk-ar": {
    riskLevel: "high",
    confidence: 0.83,
    explanation: {
      en: "Significant potential impact.",
      ar: "تأثير محتمل كبير.",
    },
  },
  "critical-risk-ar": {
    riskLevel: "critical",
    confidence: 0.96,
    explanation: {
      en: "Could lead to severe financial or legal consequences.",
      ar: "قد يؤدي إلى عواقب مالية أو قانونية وخيمة.",
    },
  },
};

// ── Test Data ────────────────────────────────────

const testClauses = [
  // English Clauses
  {
    text: "This agreement shall be governed by the laws of the State of Delaware.",
    type: "governing-law",
    expectedRisk: "low",
    lang: "en",
    mockKey: "low-risk-en",
  },
  {
    text: "Either party may terminate this agreement with 30 days' written notice.",
    type: "termination",
    expectedRisk: "low",
    lang: "en",
    mockKey: "low-risk-en",
  },
  {
    text: "The service provider shall not be liable for any indirect or consequential damages.",
    type: "liability",
    expectedRisk: "medium",
    lang: "en",
    mockKey: "medium-risk-en",
  },
  {
    text: "The employee agrees not to compete with the company for 5 years post-termination, worldwide.",
    type: "non-compete",
    expectedRisk: "high",
    lang: "en",
    mockKey: "high-risk-en",
  },
  {
    text: "The client indemnifies the contractor against all claims, including those arising from the contractor's gross negligence.",
    type: "indemnification",
    expectedRisk: "critical",
    lang: "en",
    mockKey: "critical-risk-en",
  },
  // Arabic Clauses
  {
    text: "يخضع هذا العقد لأحكام القانون المصري.",
    type: "governing-law",
    expectedRisk: "low",
    lang: "ar",
    mockKey: "low-risk-ar",
  },
  {
    text: "يجوز لأي طرف إنهاء العقد بإشعار كتابي مدته 30 يومًا.",
    type: "termination",
    expectedRisk: "low",
    lang: "ar",
    mockKey: "low-risk-ar",
  },
  {
    text: "لا يتحمل مقدم الخدمة مسؤولية الأضرار غير المباشرة أو التبعية.",
    type: "liability",
    expectedRisk: "medium",
    lang: "ar",
    mockKey: "medium-risk-ar",
  },
  {
    text: "يتعهد الموظف بعدم المنافسة لمدة 5 سنوات بعد انتهاء العقد، على مستوى العالم.",
    type: "non-compete",
    expectedRisk: "high",
    lang: "ar",
    mockKey: "high-risk-ar",
  },
  {
    text: "يعوض العميل المقاول عن جميع المطالبات، بما في ذلك تلك الناشئة عن إهمال المقاول الجسيم.",
    type: "indemnification",
    expectedRisk: "critical",
    lang: "ar",
    mockKey: "critical-risk-ar",
  },
];

// ── Tests ────────────────────────────────────────

describe("RiskClassifierAgent — Integration Tests for Accuracy", () => {
  let agent: InstanceType<typeof RiskClassifierAgent>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPrompt.mockResolvedValue('Mock system prompt for testing');
    mockSearchRecords.mockResolvedValue({ result: { hits: [] } });
    agent = new RiskClassifierAgent();
  });

  test.each(testClauses)(
    "should correctly classify '$type' clause in $lang as $expectedRisk",
    async ({ text, type, expectedRisk, lang, mockKey }) => {
      // Mock the LLM response for this specific clause
      mockInvoke.mockResolvedValueOnce({
        content: JSON.stringify(CLASSIFICATION_RESPONSES[mockKey]),
      });

      const result = await agent.classify(text, type, lang);

      expect(result).toBeDefined();
      expect(result.riskLevel).toBe(expectedRisk);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.explanation).toBeDefined();
      expect(result.explanation.en).toBeDefined();
      expect(result.explanation.ar).toBeDefined();
      expect(typeof result.explanation.en).toBe("string");
      expect(result.explanation.en.length).toBeGreaterThan(0);
    },
  );

  test("should handle invalid JSON response from LLM gracefully", async () => {
    mockInvoke.mockResolvedValueOnce({ content: "invalid json" });
    await expect(
      agent.classify("some text", "some-type", "en"),
    ).rejects.toThrow("Failed to parse JSON from LLM response");
  });
});
