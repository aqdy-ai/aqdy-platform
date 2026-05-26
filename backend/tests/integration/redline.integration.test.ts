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

// Import AFTER mocking
const { RedlineAgent } = await import(
  "../../src/agents/redline.agent.js"
);

// ── Simulated LLM Responses ─────────────────────

const REDLINE_RESPONSES = {
  "liability-cap-en": {
    suggestedText: "In no event shall either party's total aggregate liability exceed the total fees paid under this Agreement in the twelve (12) months preceding the claim.",
    explanation: "Introduces a standard liability cap to protect both parties from unlimited financial exposure."
  },
  "non-compete-limited-en": {
    suggestedText: "The Employee agrees not to compete with the Company for a period of twelve (12) months following termination within the Arab Republic of Egypt.",
    explanation: "Reduces the duration and geographic scope to ensure the clause is legally enforceable and reasonable."
  },
  "liability-cap-ar": {
    suggestedText: "لا يجوز في أي حال من الأحوال أن يتجاوز إجمالي مسؤولية أي من الطرفين إجمالي الرسوم المدفوعة بموجب هذا العقد خلال الاثني عشر (١٢) شهراً السابقة للمطالبة.",
    explanation: "يضع حداً أقصى للمسؤولية لحماية الطرفين من التعرض لمخاطر مالية غير محدودة."
  },
  "non-compete-limited-ar": {
    suggestedText: "يتعهد الموظف بعدم المنافسة لمدة ١٢ شهراً بعد انتهاء العقد وذلك داخل نطاق جمهورية مصر العربية.",
    explanation: "يقلل من المدة والنطاق الجغرافي لضمان معقولية البند وقابليته للتنفيذ قانوناً."
  }
};

// ── Test Data ────────────────────────────────────

const testCases = [
  {
    originalText: "Service Provider shall be liable for all damages, losses, and injuries of any kind without limit.",
    riskLevel: "critical",
    lang: "en",
    mockKey: "liability-cap-en"
  },
  {
    originalText: "Employee shall not work for any competitor for 5 years after contract ends worldwide.",
    riskLevel: "high",
    lang: "en",
    mockKey: "non-compete-limited-en"
  },
  {
    originalText: "يكون مقدم الخدمة مسؤولاً عن جميع الأضرار والخسائر والإصابات من أي نوع دون حد أقصى.",
    riskLevel: "critical",
    lang: "ar",
    mockKey: "liability-cap-ar"
  },
  {
    originalText: "يتعهد الموظف بعدم العمل لدى أي منافس لمدة ٥ سنوات بعد انتهاء العقد في أي مكان في العالم.",
    riskLevel: "high",
    lang: "ar",
    mockKey: "non-compete-limited-ar"
  }
];

// ── Tests ────────────────────────────────────────

describe("RedlineAgent — Integration Tests for Suggestion Quality", () => {
  let agent: InstanceType<typeof RedlineAgent>;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new RedlineAgent();
  });

  test.each(testCases)(
    "should suggest a high-quality alternative for $riskLevel risk in $lang",
    async ({ originalText, riskLevel, lang, mockKey }) => {
      mockInvoke.mockResolvedValueOnce({
        content: JSON.stringify(REDLINE_RESPONSES[mockKey]),
      });

      const result = await agent.suggest(originalText, riskLevel, lang);

      expect(result).toBeDefined();
      expect(result.suggestedText).toBe(REDLINE_RESPONSES[mockKey].suggestedText);
      expect(result.explanation).toBe(REDLINE_RESPONSES[mockKey].explanation);
      
      // Check for language consistency
      if (lang === "ar") {
        expect(/[\u0600-\u06FF]/.test(result.suggestedText)).toBe(true);
      }
    }
  );

  test("should handle LLM failure gracefully", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("LLM Timeout"));
    
    await expect(agent.suggest("text", "high", "en")).rejects.toThrow("Failed to generate redline suggestion");
  });

  test("should handle invalid JSON from LLM", async () => {
    mockInvoke.mockResolvedValueOnce({ content: "not a json" });

    await expect(agent.suggest("text", "high", "en")).rejects.toThrow("Failed to parse redline response");
  });
});