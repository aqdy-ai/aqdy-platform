import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface GeminiOptions {
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export const geminiWrapper = {
  client: new ChatGoogleGenerativeAI({
    model: "gemini-1.5-pro",
    apiKey: env.GEMINI_API_KEY,
    temperature: 0.1,
    maxRetries: 0,
  }),

  async call(prompt: string, options: GeminiOptions = {}): Promise<string> {
    const messages = [];

    if (options.systemPrompt) {
      messages.push(new SystemMessage(options.systemPrompt));
    }
    messages.push(new HumanMessage(prompt));

    logger.info("Calling Gemini directly", { model: "gemini-1.5-pro" });

    const client = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-pro",
      apiKey: env.GEMINI_API_KEY,
      temperature: options.temperature ?? 0.1,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
      maxRetries: 0,
    });

    const response = await client.invoke(messages);

    if (typeof response.content !== "string") {
      throw new Error("Unexpected non-string response from Gemini");
    }

    return response.content;
  },
};
