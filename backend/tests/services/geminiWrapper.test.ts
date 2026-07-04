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
const { geminiWrapper } = await import("../../src/services/gemini.wrapper.js");

// ── Tests ────────────────────────────────────────

describe("Gemini Wrapper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────
  // Successful call
  // ────────────────────────────────────────────────

  describe("call() — success", () => {
    test("should return string content from Gemini", async () => {
      mockInvoke.mockResolvedValueOnce({ content: "Gemini says hello" });

      const result = await geminiWrapper.call("Hello Gemini");

      expect(result).toBe("Gemini says hello");
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────
  // Options forwarding
  // ────────────────────────────────────────────────

  describe("call() — options forwarding", () => {
    test("should include SystemMessage when systemPrompt is provided", async () => {
      mockInvoke.mockResolvedValueOnce({ content: "With system" });

      await geminiWrapper.call("User input", {
        systemPrompt: "You are a legal expert",
      });

      // Messages array should have 2 entries: SystemMessage + HumanMessage
      const messages = mockInvoke.mock.calls[0][0];
      expect(messages).toHaveLength(2);
    });

    test("should only include HumanMessage when no systemPrompt", async () => {
      mockInvoke.mockResolvedValueOnce({ content: "No system" });

      await geminiWrapper.call("User input only");

      const messages = mockInvoke.mock.calls[0][0];
      expect(messages).toHaveLength(1);
    });
  });

  // ────────────────────────────────────────────────
  // Error handling
  // ────────────────────────────────────────────────

  describe("call() — error handling", () => {
    test("should throw on non-string response", async () => {
      mockInvoke.mockResolvedValueOnce({ content: 12345 });

      await expect(geminiWrapper.call("Numeric response")).rejects.toThrow(
        "Unexpected non-string response from Gemini",
      );
    });

    test("should propagate errors from the underlying client", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("API quota exceeded"));

      await expect(geminiWrapper.call("Over quota")).rejects.toThrow(
        "API quota exceeded",
      );
    });
  });
});
