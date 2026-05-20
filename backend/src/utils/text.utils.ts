/**
 * Text processing utilities for the Aqdy contract analysis platform.
 *
 * Handles Arabic text normalization, language detection, contract chunking,
 * and safe JSON parsing from LLM responses.
 */

// ── Constants ────────────────────────────────────

/** Default max chunk size in characters (~80K chars ≈ safe for 256K token window) */
export const MAX_CHUNK_SIZE = 80_000;

/** Arabic Unicode block ranges (basic + supplement + extended) */
const ARABIC_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

/** Arabic-Indic numerals: ٠١٢٣٤٥٦٧٨٩ */
const ARABIC_INDIC_DIGITS: Record<string, string> = {
  "\u0660": "0",
  "\u0661": "1",
  "\u0662": "2",
  "\u0663": "3",
  "\u0664": "4",
  "\u0665": "5",
  "\u0666": "6",
  "\u0667": "7",
  "\u0668": "8",
  "\u0669": "9",
};

/** Extended Arabic-Indic numerals (Persian/Urdu): ۰۱۲۳۴۵۶۷۸۹ */
const EXTENDED_ARABIC_INDIC_DIGITS: Record<string, string> = {
  "\u06F0": "0",
  "\u06F1": "1",
  "\u06F2": "2",
  "\u06F3": "3",
  "\u06F4": "4",
  "\u06F5": "5",
  "\u06F6": "6",
  "\u06F7": "7",
  "\u06F8": "8",
  "\u06F9": "9",
};

// ── Language Detection ───────────────────────────

/**
 * Detects the dominant language of the given text.
 * Uses a simple heuristic: counts Arabic Unicode characters vs total alphabetic chars.
 *
 * @param text - The text to analyze
 * @returns "ar" if Arabic content exceeds 30% of alphabetic characters, "en" otherwise
 */
export function detectLanguage(text: string): "ar" | "en" {
  if (!text || text.trim().length === 0) {
    return "en";
  }

  const arabicMatches = text.match(ARABIC_REGEX);
  const arabicCount = arabicMatches ? arabicMatches.length : 0;

  // Count total alphabetic characters (Latin + Arabic)
  const latinMatches = text.match(/[a-zA-Z]/g);
  const latinCount = latinMatches ? latinMatches.length : 0;

  const totalAlpha = arabicCount + latinCount;
  if (totalAlpha === 0) return "en";

  // If Arabic chars are > 30% of all alphabetic chars, classify as Arabic
  return arabicCount / totalAlpha > 0.3 ? "ar" : "en";
}

// ── Arabic Text Normalization ────────────────────

/**
 * Normalizes Arabic text for consistent processing.
 *
 * - Applies Unicode NFKC normalization
 * - Normalizes Alef variants (أ إ آ ٱ → ا)
 * - Normalizes Teh Marbuta (ة → ه) — optional, kept for search consistency
 * - Removes Arabic diacritics/tashkeel (فتحة، كسرة، ضمة، شدة، سكون، تنوين)
 * - Normalizes whitespace
 *
 * @param text - Raw Arabic text
 * @returns Normalized text
 */
export function normalizeArabicText(text: string): string {
  if (!text) return "";

  let normalized = text;

  // Unicode NFKC normalization
  normalized = normalized.normalize("NFKC");

  // Normalize Alef variants → ا
  normalized = normalized.replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627");

  // Remove Arabic diacritics (tashkeel)
  // U+064B-U+065F: Fathatan through Wavy Hamza Below
  // U+0670: Superscript Alef
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, "");

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

// ── Arabic Numeral Conversion ────────────────────

/**
 * Converts Arabic-Indic and Extended Arabic-Indic numerals to Western digits.
 *
 * ٠١٢٣٤٥٦٧٨٩ → 0123456789
 * ۰۱۲۳۴۵۶۷۸۹ → 0123456789
 *
 * @param text - Text possibly containing Arabic-Indic numerals
 * @returns Text with Western (ASCII) digits
 */
export function convertArabicNumerals(text: string): string {
  if (!text) return "";

  return text.replace(
    /[\u0660-\u0669\u06F0-\u06F9]/g,
    (match) =>
      ARABIC_INDIC_DIGITS[match] ??
      EXTENDED_ARABIC_INDIC_DIGITS[match] ??
      match,
  );
}

// ── Contract Chunking ────────────────────────────

/**
 * Splits a long contract into manageable chunks for LLM processing.
 *
 * Strategy:
 * 1. If text is shorter than maxSize, return as-is
 * 2. Split by double-newlines (paragraph boundaries)
 * 3. Group paragraphs into chunks that stay under maxSize
 * 4. Never split mid-paragraph; if a single paragraph exceeds maxSize,
 *    fall back to sentence-level splitting
 *
 * @param text - Full contract text
 * @param maxSize - Maximum characters per chunk (default: MAX_CHUNK_SIZE)
 * @returns Array of text chunks
 */
export function chunkContract(
  text: string,
  maxSize: number = MAX_CHUNK_SIZE,
): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  if (text.length <= maxSize) {
    return [text];
  }

  // Split by paragraph boundaries (double newline)
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    // If a single paragraph exceeds maxSize, split by sentences
    if (trimmed.length > maxSize) {
      // Flush current chunk first
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // Split the oversized paragraph by sentence boundaries
      const sentences = splitBySentences(trimmed);
      let sentenceChunk = "";

      for (const sentence of sentences) {
        if (
          sentenceChunk.length + sentence.length + 1 > maxSize &&
          sentenceChunk.trim()
        ) {
          chunks.push(sentenceChunk.trim());
          sentenceChunk = "";
        }
        sentenceChunk += (sentenceChunk ? " " : "") + sentence;
      }

      if (sentenceChunk.trim()) {
        chunks.push(sentenceChunk.trim());
      }
      continue;
    }

    // Check if adding this paragraph would exceed the limit
    const potentialLength =
      currentChunk.length + (currentChunk ? 2 : 0) + trimmed.length;

    if (potentialLength > maxSize && currentChunk.trim()) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmed;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    }
  }

  // Flush remaining
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Splits text by sentence boundaries (period, Arabic period, question mark, etc.)
 */
function splitBySentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace
  // Handles English (.), Arabic (۔), question marks, exclamation marks
  const sentences = text.split(/(?<=[.!?؟۔])\s+/);
  return sentences.filter((s) => s.trim().length > 0);
}

// ── Safe JSON Parsing ────────────────────────────

/**
 * Safely parses JSON from LLM responses.
 *
 * LLMs often wrap JSON in markdown code fences or include trailing text.
 * This function handles common patterns:
 * - ```json ... ```
 * - ``` ... ```
 * - Leading/trailing whitespace and text
 * - Extracts the first JSON array or object found
 *
 * @param raw - Raw LLM response string
 * @returns Parsed JSON value
 * @throws Error if no valid JSON can be extracted
 */
export function safeParseJSON<T = unknown>(raw: string): T {
  if (!raw || raw.trim().length === 0) {
    throw new Error("Empty response — cannot parse JSON");
  }

  let cleaned = raw.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Continue to fallback strategies
  }

  // Try to extract the first JSON array [...] or object {...}
  const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]) as T;
    } catch {
      // Continue
    }
  }

  throw new Error(
    `Failed to parse JSON from LLM response. Raw output (first 200 chars): ${raw.substring(0, 200)}`,
  );
}

// ── Merge Extraction Results ─────────────────────

/**
 * Merges extraction results from multiple chunks into a single result.
 * De-duplicates clauses by comparing normalized clause text.
 *
 * @param results - Array of extracted clause arrays from each chunk
 * @returns Merged and deduplicated clause array with renumbered clause numbers
 */
export function mergeExtractionResults<
  T extends { clauseNumber: number; clauseText: string },
>(results: T[][]): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const chunkResult of results) {
    for (const clause of chunkResult) {
      // Normalize for dedup: trim, lowercase, collapse whitespace
      const key = clause.clauseText.trim().toLowerCase().replace(/\s+/g, " ");

      if (!seen.has(key)) {
        seen.add(key);
        merged.push(clause);
      }
    }
  }

  // Renumber clauses sequentially
  return merged.map((clause, idx) => ({
    ...clause,
    clauseNumber: idx + 1,
  }));
}
