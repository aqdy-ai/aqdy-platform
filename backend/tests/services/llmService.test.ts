import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { llmService } from '../../src/services/llm.service.js';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

jest.mock("@langchain/google-genai");

describe('LLM Service Logic', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fallback to Gemini if primary fails', async () => {

    const mockInvoke = jest.fn<() => Promise<{ content: string }>>()
      .mockRejectedValueOnce(new Error('Primary Down'))
      .mockRejectedValueOnce(new Error('Primary Down'))
      .mockRejectedValueOnce(new Error('Primary Down'))
      .mockResolvedValueOnce({ content: 'Fallback Result' });

    (ChatGoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => ({
      invoke: mockInvoke,
    }));

    const response = await llmService.call('Test contract text');

    expect(response.usedFallback).toBe(true);
    expect(response.content).toBe('Fallback Result');
    expect(response.model).toBe('gemma-4-26b-a4b-it');
  });

});