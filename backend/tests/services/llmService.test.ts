import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// أبسط mock بدون أي types مشاكل
const mockInvoke = jest.fn() as jest.Mock;

// mock module FIRST
jest.unstable_mockModule("@langchain/google-genai", () => {
  return {
    ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      invoke: mockInvoke,
    })),
  };
});

// import AFTER mocking
const { llmService } = await import("../../src/services/llm.service.js");

describe("LLM Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should fallback to Gemini if primary fails", async () => {
    mockInvoke
      .mockRejectedValueOnce(new Error("Primary Down"))
      .mockRejectedValueOnce(new Error("Primary Down"))
      .mockRejectedValueOnce(new Error("Primary Down"))
      .mockResolvedValueOnce({ content: "Fallback Result" });

    const response = await llmService.call("Test contract text");

    expect(response.usedFallback).toBe(true);
    expect(response.content).toBe("Fallback Result");
  });
});