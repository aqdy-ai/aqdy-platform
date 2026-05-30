/**
 * ExtractorAgent — Contract clause extraction agent using LangChain.
 *
 * Extracts structured clauses from contract text with:
 * - Automatic language detection (Arabic/English)
 * - Long contract chunking with intelligent merging
 * - Arabic text normalization
 * - Retry + fallback via llmService
 * - Zod-validated output
 */

import { z } from "zod";
import { llmService, LLMResponse } from "../services/llm.service.js";
import { logger } from "../utils/logger.js";
import {
  detectLanguage,
  normalizeArabicText,
  convertArabicNumerals,
  chunkContract,
  safeParseJSON,
  mergeExtractionResults,
  MAX_CHUNK_SIZE,
} from "../utils/text.utils.js";
import {
  EXTRACTOR_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
} from "./extractor.prompts.js";

// ── Output Schema ────────────────────────────────

/**
 * Zod schema for a single extracted clause.
 * Validates LLM output structure.
 */
export const ExtractedClauseSchema = z.object({
  clauseNumber: z.number().int().positive(),
  clauseText: z.string().min(1),
  clauseType: z.string().min(1),
});

export type ExtractedClause = z.infer<typeof ExtractedClauseSchema>;

/**
 * Schema for the full extraction output array.
 */
export const ExtractionOutputSchema = z.array(ExtractedClauseSchema);

/**
 * Full extraction result with metadata.
 */
export interface ExtractionResult {
  clauses: ExtractedClause[];
  language: "ar" | "en";
  modelUsed: string;
  usedFallback: boolean;
  chunkCount: number;
  durationMs: number;
}

// ── ExtractorAgent Class ─────────────────────────

export class ExtractorAgent {
  private readonly maxChunkSize: number;

  /**
   * @param maxChunkSize - Max characters per chunk for long contract splitting.
   *                       Defaults to MAX_CHUNK_SIZE (80,000 chars).
   */
  constructor(maxChunkSize: number = MAX_CHUNK_SIZE) {
    this.maxChunkSize = maxChunkSize;
  }

  /**
   * Extracts all clauses from a contract.
   *
   * @param contractText - The raw contract text
   * @param language - Optional language override. If omitted, auto-detected.
   * @returns ExtractionResult with typed clauses and metadata
   * @throws Error if LLM fails or output is unparseable after all retries
   */
  async extract(
    contractText: string,
    language?: "ar" | "en",
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    // Validate input
    if (!contractText || contractText.trim().length === 0) {
      throw new Error("Contract text is empty — nothing to extract.");
    }

    // Detect language if not provided
    const detectedLang = language ?? detectLanguage(contractText);
    logger.info("ExtractorAgent: starting extraction", {
      language: detectedLang,
      textLength: contractText.length,
    });

    // Preprocess Arabic text
    let processedText = contractText;
    if (detectedLang === "ar") {
      processedText = normalizeArabicText(contractText);
      processedText = convertArabicNumerals(processedText);
    }

    // Chunk if necessary
    const chunks = chunkContract(processedText, this.maxChunkSize);
    logger.info("ExtractorAgent: chunking result", {
      chunkCount: chunks.length,
      chunkSizes: chunks.map((c) => c.length),
    });

    // Extract from each chunk
    const allChunkResults: ExtractedClause[][] = [];
    let lastLLMResponse: LLMResponse | null = null;

    for (let i = 0; i < chunks.length; i++) {
      const userPrompt = buildExtractionUserPrompt(
        chunks[i],
        detectedLang,
        i,
        chunks.length,
      );

      const llmResponse = await this.callLLM(userPrompt);
      lastLLMResponse = llmResponse;

      const parsed = this.parseAndValidate(llmResponse.content);
      allChunkResults.push(parsed);

      logger.info(`ExtractorAgent: chunk ${i + 1}/${chunks.length} extracted`, {
        clauseCount: parsed.length,
      });
    }

    // Merge results from all chunks
    const mergedClauses =
      chunks.length > 1
        ? mergeExtractionResults(allChunkResults)
        : (allChunkResults[0] ?? []);

    const durationMs = Date.now() - startTime;

    logger.info("ExtractorAgent: extraction complete", {
      totalClauses: mergedClauses.length,
      durationMs,
      model: lastLLMResponse?.model,
    });

    return {
      clauses: mergedClauses,
      language: detectedLang,
      modelUsed: lastLLMResponse?.model ?? "unknown",
      usedFallback: lastLLMResponse?.usedFallback ?? false,
      chunkCount: chunks.length,
      durationMs,
    };
  }

  /**
   * Calls the LLM service with the extraction system prompt.
   */
  private async callLLM(userPrompt: string): Promise<LLMResponse> {
    return llmService.call(userPrompt, {
      systemPrompt: EXTRACTOR_SYSTEM_PROMPT,
      temperature: 0.1,
      maxTokens: 8192,
    });
  }

  /**
   * Parses and validates the LLM's JSON output.
   *
   * @param rawContent - Raw string from LLM
   * @returns Validated array of ExtractedClause
   * @throws Error if JSON is invalid or doesn't match schema
   */
  private parseAndValidate(rawContent: string): ExtractedClause[] {
    // Parse JSON from potentially messy LLM output
    const parsed = safeParseJSON<unknown[]>(rawContent);

    // Validate with Zod
    const result = ExtractionOutputSchema.safeParse(parsed);

    if (!result.success) {
      logger.warn("ExtractorAgent: Zod validation failed, attempting repair", {
        errors: result.error.flatten().fieldErrors,
      });

      // Attempt to repair: coerce each item individually
      return this.repairClauses(parsed);
    }

    return result.data;
  }

  /**
   * Attempts to repair partially valid clause data.
   * Keeps clauses that have at least clauseText, fills in defaults for the rest.
   */
  private repairClauses(rawArray: unknown[]): ExtractedClause[] {
    const repaired: ExtractedClause[] = [];

    for (let i = 0; i < rawArray.length; i++) {
      const item = rawArray[i] as Record<string, unknown>;
      if (!item || typeof item !== "object") continue;

      const clauseText =
        typeof item.clauseText === "string" ? item.clauseText : null;
      if (!clauseText || clauseText.trim().length === 0) continue;

      repaired.push({
        clauseNumber:
          typeof item.clauseNumber === "number" ? item.clauseNumber : i + 1,
        clauseText: clauseText.trim(),
        clauseType:
          typeof item.clauseType === "string" ? item.clauseType : "other",
      });
    }

    if (repaired.length === 0) {
      throw new Error(
        "ExtractorAgent: Could not extract any valid clauses from LLM output",
      );
    }

    logger.info(`ExtractorAgent: repaired ${repaired.length} clauses`);
    return repaired;
  }
}

// ── Default Instance ─────────────────────────────

export const extractorAgent = new ExtractorAgent();
