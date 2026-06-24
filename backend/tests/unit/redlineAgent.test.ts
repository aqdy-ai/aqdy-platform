import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import * as promptService from "../../src/services/prompt.service.js";

// ── Mock Setup ───────────────────────────────────

const mockInvoke = jest.fn() as jest.Mock;

// Mock Gemini LLM call
jest.unstable_mockModule("@langchain/google-genai", () => {
  return {
    ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      invoke: mockInvoke,
    })),
  };
});

// Import after mocking for ESM hoisting
const { RedlineAgent } = await import("../../src/agents/redline.agent.js");

// ── Helpers ──────────────────────────────────────

function makeLLMResponse(data: {
  suggestedText: string;
  explanation: { ar: string; en: string };
  talkingPoints: { ar: string[]; en: string[] };
  confidence: number;
}) {
  return JSON.stringify(data);
}

// ── Tests ────────────────────────────────────────

describe("RedlineAgent", () => {
  let agent: InstanceType<typeof RedlineAgent>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(promptService, 'getPrompt').mockResolvedValue('Mock system prompt for testing');
    agent = new RedlineAgent();
  });

  test("should throw an error for empty clause text", async () => {
    await expect(
      agent.generate("", "high", "limitation-of-liability", "en"),
    ).rejects.toThrow("Clause text is empty");

    await expect(
      agent.generate("   ", "high", "limitation-of-liability", "en"),
    ).rejects.toThrow("Clause text is empty");
  });

  test("should generate redline suggestions successfully (without safer alternative)", async () => {
    // 1. Mock LLM response
    mockInvoke.mockResolvedValueOnce({
      content: makeLLMResponse({
        suggestedText: "Liability shall be capped at 12 months fees.",
        explanation: {
          ar: "تم تحديد المسؤولية لتقليل المخاطر.",
          en: "Capped liability to minimize high risk exposure.",
        },
        talkingPoints: {
          ar: ["الحد من المسؤولية معيار تجاري عادل."],
          en: ["Limiting liability is a fair commercial standard."],
        },
        confidence: 0.9,
      }),
    });

    const result = await agent.generate(
      "Liability shall be unlimited.",
      "high",
      "limitation-of-liability",
      "en",
    );

    // 2. Assertions
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(result.suggestedText).toBe(
      "Liability shall be capped at 12 months fees.",
    );
    expect(result.explanation.en).toContain("minimize high risk exposure");
    expect(result.talkingPoints.ar[0]).toBe(
      "الحد من المسؤولية معيار تجاري عادل.",
    );

    // Confidence calibration: 0.9 * 0.95 = 0.86
    expect(result.confidence).toBe(0.86);
  });

  test("should boost confidence score when safer alternative is provided", async () => {
    // 1. Mock LLM response
    mockInvoke.mockResolvedValueOnce({
      content: makeLLMResponse({
        suggestedText: "Capped liability at 100k USD.",
        explanation: {
          ar: "تحديد المسؤولية بموجب البديل الآمن.",
          en: "Capped liability based on safer alternative.",
        },
        talkingPoints: {
          ar: ["الطرف الآخر يفضل حداً مالياً ثابتاً."],
          en: ["The counterparty prefers a fixed cap."],
        },
        confidence: 0.8,
      }),
    });

    const result = await agent.generate(
      "Liability shall be unlimited.",
      "critical",
      "limitation-of-liability",
      "en",
      "Liability capped at 100k USD.",
    );

    // 2. Assertions
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(result.suggestedText).toBe("Capped liability at 100k USD.");

    // Confidence calibration: 0.8 * 1.05 = 0.84
    expect(result.confidence).toBe(0.84);
  });

  test("should throw error if LLM returns invalid JSON", async () => {
    mockInvoke.mockResolvedValueOnce({ content: "Malicious non-JSON content" });

    await expect(
      agent.generate("Clause text", "medium", "confidentiality", "en"),
    ).rejects.toThrow();
  });

  test("should throw error if LLM returns valid JSON but missing required fields", async () => {
    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify({
        suggestedText: "Capped liability",
        // missing explanation and talkingPoints
        confidence: 0.95,
      }),
    });

    await expect(
      agent.generate("Clause text", "medium", "confidentiality", "en"),
    ).rejects.toThrow();
  });
});
