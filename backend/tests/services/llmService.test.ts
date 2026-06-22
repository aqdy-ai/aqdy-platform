import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";

// ── Mock Setup ───────────────────────────────────
const mockOpenAIInvoke = jest.fn() as jest.Mock;
const mockGeminiInvoke = jest.fn() as jest.Mock;

jest.unstable_mockModule("@langchain/openai", () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: mockOpenAIInvoke,
  })),
}));

jest.unstable_mockModule("@langchain/google-genai", () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    invoke: mockGeminiInvoke,
  })),
}));

// Import AFTER mocking (required for ESM mock hoisting)
const { llmService } = await import("../../src/services/llm.service.js");

const PRIMARY_MODEL = "gpt-4o";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";

// ── Tests ────────────────────────────────────────

describe("LLM Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("call() — Primary model success", () => {
    test("should return content from the primary model on first attempt", async () => {
      mockOpenAIInvoke.mockResolvedValueOnce({ content: "Primary result" });

      const responsePromise = llmService.call("Analyze this contract");
      await jest.runAllTimersAsync();
      const response = await responsePromise;

      expect(response.content).toBe("Primary result");
      expect(response.model).toBe(PRIMARY_MODEL);
      expect(response.usedFallback).toBe(false);
      expect(mockOpenAIInvoke).toHaveBeenCalledTimes(1);
      expect(mockGeminiInvoke).not.toHaveBeenCalled();
    });
  });

  describe("call() — Retry logic", () => {
    test("should retry and succeed on 2nd attempt without fallback", async () => {
      mockOpenAIInvoke
        .mockRejectedValueOnce(new Error("Transient error"))
        .mockResolvedValueOnce({ content: "Recovered" });

      const responsePromise = llmService.call("Retry test");
      await jest.runAllTimersAsync();
      const response = await responsePromise;

      expect(response.content).toBe("Recovered");
      expect(response.model).toBe(PRIMARY_MODEL);
      expect(response.usedFallback).toBe(false);
      expect(mockOpenAIInvoke).toHaveBeenCalledTimes(2);
    });

    test("should retry and succeed on 3rd attempt without fallback", async () => {
      mockOpenAIInvoke
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce({ content: "Third try" });

      const responsePromise = llmService.call("Retry test 2");
      await jest.runAllTimersAsync();
      const response = await responsePromise;

      expect(response.content).toBe("Third try");
      expect(response.model).toBe(PRIMARY_MODEL);
      expect(response.usedFallback).toBe(false);
      expect(mockOpenAIInvoke).toHaveBeenCalledTimes(3);
    });
  });

  describe("call() — Fallback chain", () => {
    test("should fallback to the fallback model if primary exhausts all retries", async () => {
      mockOpenAIInvoke
        .mockRejectedValueOnce(new Error("Primary Down"))
        .mockRejectedValueOnce(new Error("Primary Down"))
        .mockRejectedValueOnce(new Error("Primary Down"));
      mockGeminiInvoke.mockResolvedValueOnce({ content: "Fallback Result" });

      const responsePromise = llmService.call("Test contract text");
      await jest.runAllTimersAsync();
      const response = await responsePromise;

      expect(response.usedFallback).toBe(true);
      expect(response.model).toBe(FALLBACK_MODEL);
      expect(response.content).toBe("Fallback Result");
    });

    test("should succeed on fallback retry after fallback initial failure", async () => {
      mockOpenAIInvoke
        .mockRejectedValueOnce(new Error("Primary 1"))
        .mockRejectedValueOnce(new Error("Primary 2"))
        .mockRejectedValueOnce(new Error("Primary 3"));
      mockGeminiInvoke
        .mockRejectedValueOnce(new Error("Fallback transient"))
        .mockResolvedValueOnce({ content: "Fallback recovered" });

      const responsePromise = llmService.call("Fallback retry test");
      await jest.runAllTimersAsync();
      const response = await responsePromise;

      expect(response.usedFallback).toBe(true);
      expect(response.content).toBe("Fallback recovered");
    });
  });

  describe("call() — Total failure", () => {
    test("should throw when both primary and fallback exhaust all retries", async () => {
      mockOpenAIInvoke
        .mockRejectedValueOnce(new Error("Service unavailable"))
        .mockRejectedValueOnce(new Error("Service unavailable"))
        .mockRejectedValueOnce(new Error("Service unavailable"));
      mockGeminiInvoke
        .mockRejectedValueOnce(new Error("Service unavailable"))
        .mockRejectedValueOnce(new Error("Service unavailable"))
        .mockRejectedValueOnce(new Error("Service unavailable"));

      const responsePromise = llmService.call("Doomed prompt");
      const assertion = expect(responsePromise).rejects.toThrow(
        "All LLM providers failed",
      );
      await jest.runAllTimersAsync();
      await assertion;
      expect(mockOpenAIInvoke).toHaveBeenCalledTimes(3);
      expect(mockGeminiInvoke).toHaveBeenCalledTimes(3);
    });
  });

  describe("callPrimary()", () => {
    test("should return content directly from the primary model", async () => {
      mockOpenAIInvoke.mockResolvedValueOnce({ content: "Primary only" });

      const responsePromise = llmService.callPrimary("Direct primary");
      await jest.runAllTimersAsync();
      const response = await responsePromise;

      expect(response.content).toBe("Primary only");
      expect(response.model).toBe(PRIMARY_MODEL);
      expect(response.usedFallback).toBe(false);
    });

    test("should throw without falling back when primary fails all retries", async () => {
      mockOpenAIInvoke
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockRejectedValueOnce(new Error("Fail 3"));

      const responsePromise = llmService.callPrimary("No fallback");
      const assertion = expect(responsePromise).rejects.toThrow();
      await jest.runAllTimersAsync();
      await assertion;
      expect(mockOpenAIInvoke).toHaveBeenCalledTimes(3);
      expect(mockGeminiInvoke).not.toHaveBeenCalled();
    });
  });

  describe("callFallback()", () => {
    test("should return content from the fallback model directly", async () => {
      mockGeminiInvoke.mockResolvedValueOnce({ content: "Fallback direct" });

      const responsePromise = llmService.callFallback("Direct fallback");
      await jest.runAllTimersAsync();
      const response = await responsePromise;

      expect(response.content).toBe("Fallback direct");
      expect(response.model).toBe(FALLBACK_MODEL);
      expect(mockOpenAIInvoke).not.toHaveBeenCalled();
    });

    test("should throw when fallback fails all retries", async () => {
      mockGeminiInvoke
        .mockRejectedValueOnce(new Error("F1"))
        .mockRejectedValueOnce(new Error("F2"))
        .mockRejectedValueOnce(new Error("F3"));

      const responsePromise = llmService.callFallback("Failing fallback");
      const assertion = expect(responsePromise).rejects.toThrow();
      await jest.runAllTimersAsync();
      await assertion;
      expect(mockGeminiInvoke).toHaveBeenCalledTimes(3);
    });
  });

  describe("Options forwarding", () => {
    test("should pass system prompt to message builder", async () => {
      mockOpenAIInvoke.mockResolvedValueOnce({ content: "With system prompt" });

      const responsePromise = llmService.call("User prompt", {
        systemPrompt: "You are a legal assistant",
      });
      await jest.runAllTimersAsync();
      const response = await responsePromise;

      expect(response.content).toBe("With system prompt");
      const invokedMessages = mockOpenAIInvoke.mock.calls[0][0];
      expect(invokedMessages).toHaveLength(2);
    });

    test("should work without system prompt (only HumanMessage)", async () => {
      mockOpenAIInvoke.mockResolvedValueOnce({ content: "No system" });

      const responsePromise = llmService.call("Just user prompt");
      await jest.runAllTimersAsync();
      const response = await responsePromise;

      expect(response.content).toBe("No system");
      const invokedMessages = mockOpenAIInvoke.mock.calls[0][0];
      expect(invokedMessages).toHaveLength(1);
    });
  });

  describe("Non-string response handling", () => {
    test("should throw when LLM returns non-string content", async () => {
      mockOpenAIInvoke
        .mockResolvedValueOnce({ content: ["not", "a", "string"] })
        .mockResolvedValueOnce({ content: ["not", "a", "string"] })
        .mockResolvedValueOnce({ content: ["not", "a", "string"] });
      mockGeminiInvoke
        .mockResolvedValueOnce({ content: ["not", "a", "string"] })
        .mockResolvedValueOnce({ content: ["not", "a", "string"] })
        .mockResolvedValueOnce({ content: ["not", "a", "string"] });

      const responsePromise = llmService.call("Array response");
      const assertion = expect(responsePromise).rejects.toThrow(
        "All LLM providers failed",
      );
      await jest.runAllTimersAsync();
      await assertion;
    });
  });
});
