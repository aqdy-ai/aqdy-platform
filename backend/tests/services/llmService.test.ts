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
const { llmService } = await import("../../src/services/llm.service.js");

// ── Tests ────────────────────────────────────────

describe("LLM Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────
  // llmService.call() — Primary success
  // ────────────────────────────────────────────────

  describe("call() — Primary model success", () => {
    test("should return content from the primary model on first attempt", async () => {
      mockInvoke.mockResolvedValueOnce({ content: "Primary result" });

      const response = await llmService.call("Analyze this contract");

      expect(response.content).toBe("Primary result");
      expect(response.model).toBe("gemma-4-31b-it");
      expect(response.usedFallback).toBe(false);
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────
  // llmService.call() — Retry logic
  // ────────────────────────────────────────────────

  describe("call() — Retry logic", () => {
    test("should retry and succeed on 2nd attempt without fallback", async () => {
      mockInvoke
        .mockRejectedValueOnce(new Error("Transient error"))
        .mockResolvedValueOnce({ content: "Recovered" });

      const response = await llmService.call("Retry test");

      expect(response.content).toBe("Recovered");
      expect(response.model).toBe("gemma-4-31b-it");
      expect(response.usedFallback).toBe(false);
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    test("should retry and succeed on 3rd attempt without fallback", async () => {
      mockInvoke
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce({ content: "Third try" });

      const response = await llmService.call("Retry test 2");

      expect(response.content).toBe("Third try");
      expect(response.model).toBe("gemma-4-31b-it");
      expect(response.usedFallback).toBe(false);
      expect(mockInvoke).toHaveBeenCalledTimes(3);
    });
  });

  // ────────────────────────────────────────────────
  // llmService.call() — Fallback chain
  // ────────────────────────────────────────────────

  describe("call() — Fallback chain", () => {
    test("should fallback to the MoE model if primary exhausts all retries", async () => {
      // Primary fails 3 times, fallback succeeds on first try
      mockInvoke
        .mockRejectedValueOnce(new Error("Primary Down"))
        .mockRejectedValueOnce(new Error("Primary Down"))
        .mockRejectedValueOnce(new Error("Primary Down"))
        .mockResolvedValueOnce({ content: "Fallback Result" });

      const response = await llmService.call("Test contract text");

      expect(response.usedFallback).toBe(true);
      expect(response.model).toBe("gemma-4-26b-a4b-it");
      expect(response.content).toBe("Fallback Result");
    }, 15000);

    test("should succeed on fallback retry after fallback initial failure", async () => {
      // Primary fails 3 times, fallback fails 1 time then succeeds
      mockInvoke
        .mockRejectedValueOnce(new Error("Primary 1"))
        .mockRejectedValueOnce(new Error("Primary 2"))
        .mockRejectedValueOnce(new Error("Primary 3"))
        .mockRejectedValueOnce(new Error("Fallback transient"))
        .mockResolvedValueOnce({ content: "Fallback recovered" });

      const response = await llmService.call("Fallback retry test");

      expect(response.usedFallback).toBe(true);
      expect(response.content).toBe("Fallback recovered");
    }, 15000);
  });

  // ────────────────────────────────────────────────
  // llmService.call() — Total failure
  // ────────────────────────────────────────────────

  describe("call() — Total failure", () => {
    test("should throw when both primary and fallback exhaust all retries", async () => {
      mockInvoke
        .mockRejectedValueOnce(new Error("Service unavailable"))
        .mockRejectedValueOnce(new Error("Service unavailable"))
        .mockRejectedValueOnce(new Error("Service unavailable"))
        .mockRejectedValueOnce(new Error("Service unavailable"))
        .mockRejectedValueOnce(new Error("Service unavailable"))
        .mockRejectedValueOnce(new Error("Service unavailable"));

      await expect(llmService.call("Doomed prompt")).rejects.toThrow(
        "All LLM providers failed",
      );

      // 3 primary retries + 3 fallback retries = 6 total calls
      expect(mockInvoke).toHaveBeenCalledTimes(6);
    }, 15000);
  });

  // ────────────────────────────────────────────────
  // llmService.callPrimary()
  // ────────────────────────────────────────────────

  describe("callPrimary()", () => {
    test("should return content directly from the primary model", async () => {
      mockInvoke.mockResolvedValueOnce({ content: "Primary only" });

      const response = await llmService.callPrimary("Direct primary");

      expect(response.content).toBe("Primary only");
      expect(response.model).toBe("gemma-4-31b-it");
      expect(response.usedFallback).toBe(false);
    });

    test("should throw without falling back when primary fails all retries", async () => {
      mockInvoke
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockRejectedValueOnce(new Error("Fail 3"));

      await expect(llmService.callPrimary("No fallback")).rejects.toThrow();

      // Only 3 calls — no fallback
      expect(mockInvoke).toHaveBeenCalledTimes(3);
    }, 15000);
  });

  // ────────────────────────────────────────────────
  // llmService.callFallback()
  // ────────────────────────────────────────────────

  describe("callFallback()", () => {
    test("should return content from the fallback model directly", async () => {
      mockInvoke.mockResolvedValueOnce({ content: "Fallback direct" });

      const response = await llmService.callFallback("Direct fallback");

      expect(response.content).toBe("Fallback direct");
      expect(response.model).toBe("gemma-4-26b-a4b-it");
    });

    test("should throw when fallback fails all retries", async () => {
      mockInvoke
        .mockRejectedValueOnce(new Error("F1"))
        .mockRejectedValueOnce(new Error("F2"))
        .mockRejectedValueOnce(new Error("F3"));

      await expect(llmService.callFallback("Failing fallback")).rejects.toThrow();

      expect(mockInvoke).toHaveBeenCalledTimes(3);
    }, 15000);
  });

  // ────────────────────────────────────────────────
  // Options forwarding
  // ────────────────────────────────────────────────

  describe("Options forwarding", () => {
    test("should pass system prompt to message builder", async () => {
      mockInvoke.mockResolvedValueOnce({ content: "With system prompt" });

      const response = await llmService.call("User prompt", {
        systemPrompt: "You are a legal assistant",
      });

      expect(response.content).toBe("With system prompt");
      // The invoke should have been called with an array that includes a SystemMessage
      const invokedMessages = mockInvoke.mock.calls[0][0];
      expect(invokedMessages).toHaveLength(2); // SystemMessage + HumanMessage
    });

    test("should work without system prompt (only HumanMessage)", async () => {
      mockInvoke.mockResolvedValueOnce({ content: "No system" });

      const response = await llmService.call("Just user prompt");

      expect(response.content).toBe("No system");
      const invokedMessages = mockInvoke.mock.calls[0][0];
      expect(invokedMessages).toHaveLength(1); // HumanMessage only
    });
  });

  // ────────────────────────────────────────────────
  // Non-string response handling
  // ────────────────────────────────────────────────

  describe("Non-string response handling", () => {
    test("should throw when LLM returns non-string content", async () => {
      // Non-string response causes an error → triggers retries on both models
      mockInvoke
        .mockResolvedValueOnce({ content: ["not", "a", "string"] })
        .mockResolvedValueOnce({ content: ["not", "a", "string"] })
        .mockResolvedValueOnce({ content: ["not", "a", "string"] })
        .mockResolvedValueOnce({ content: ["not", "a", "string"] })
        .mockResolvedValueOnce({ content: ["not", "a", "string"] })
        .mockResolvedValueOnce({ content: ["not", "a", "string"] });

      await expect(llmService.call("Array response")).rejects.toThrow(
        "All LLM providers failed",
      );
    }, 15000);
  });
});