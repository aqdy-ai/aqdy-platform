import { describe, test, expect } from "@jest/globals";
import {
  detectLanguage,
  normalizeArabicText,
  convertArabicNumerals,
  chunkContract,
  safeParseJSON,
  mergeExtractionResults,
} from "../../src/utils/text.utils.js";

// ── detectLanguage ───────────────────────────────

describe("detectLanguage", () => {
  test("should return 'en' for empty text", () => {
    expect(detectLanguage("")).toBe("en");
    expect(detectLanguage("   ")).toBe("en");
  });

  test("should return 'en' for English text", () => {
    expect(
      detectLanguage("This is a standard English employment contract."),
    ).toBe("en");
  });

  test("should return 'ar' for Arabic text", () => {
    expect(
      detectLanguage("هذا عقد عمل باللغة العربية ويحتوي على بنود متعددة."),
    ).toBe("ar");
  });

  test("should return 'ar' for mixed text with majority Arabic", () => {
    expect(
      detectLanguage(
        "عقد عمل بين شركة TechCorp وبين الموظف أحمد حسن في القاهرة",
      ),
    ).toBe("ar");
  });

  test("should return 'en' for mixed text with majority English", () => {
    expect(
      detectLanguage(
        "This contract is between TechCorp and Ahmed Hassan, located in القاهرة.",
      ),
    ).toBe("en");
  });

  test("should return 'en' for text with no alphabetic characters", () => {
    expect(detectLanguage("12345 !@#$%")).toBe("en");
  });
});

// ── normalizeArabicText ──────────────────────────

describe("normalizeArabicText", () => {
  test("should return empty string for empty input", () => {
    expect(normalizeArabicText("")).toBe("");
  });

  test("should normalize Alef variants to plain Alef", () => {
    // أحمد → احمد, إبراهيم → ابراهيم, آخر → اخر
    const input = "أحمد إبراهيم آخر";
    const normalized = normalizeArabicText(input);
    expect(normalized).not.toContain("\u0623"); // Alef with Hamza Above
    expect(normalized).not.toContain("\u0625"); // Alef with Hamza Below
    expect(normalized).not.toContain("\u0622"); // Alef with Madda
    expect(normalized).toContain("\u0627"); // Plain Alef
  });

  test("should remove Arabic diacritics (tashkeel)", () => {
    // يُعيَّن → يعين
    const input = "يُعيَّن الطَّرَف";
    const result = normalizeArabicText(input);
    expect(result).not.toMatch(/[\u064B-\u065F\u0670]/);
  });

  test("should normalize whitespace", () => {
    const input = "عقد   عمل    بين   الطرفين";
    expect(normalizeArabicText(input)).toBe("عقد عمل بين الطرفين");
  });

  test("should handle mixed Arabic and English", () => {
    const input = "شركة TechCorp  للتكنولوجيا";
    expect(normalizeArabicText(input)).toBe("شركة TechCorp للتكنولوجيا");
  });
});

// ── convertArabicNumerals ────────────────────────

describe("convertArabicNumerals", () => {
  test("should return empty string for empty input", () => {
    expect(convertArabicNumerals("")).toBe("");
  });

  test("should convert Arabic-Indic numerals to Western digits", () => {
    expect(convertArabicNumerals("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  test("should convert Extended Arabic-Indic numerals", () => {
    expect(convertArabicNumerals("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
  });

  test("should handle mixed text with Arabic-Indic numerals", () => {
    expect(convertArabicNumerals("المادة ٣: فترة الاختبار")).toBe(
      "المادة 3: فترة الاختبار",
    );
  });

  test("should leave Western digits unchanged", () => {
    expect(convertArabicNumerals("Article 3: Probation")).toBe(
      "Article 3: Probation",
    );
  });

  test("should handle mixed numeral systems", () => {
    expect(convertArabicNumerals("١٢ months or 12 months")).toBe(
      "12 months or 12 months",
    );
  });
});

// ── chunkContract ────────────────────────────────

describe("chunkContract", () => {
  test("should return empty array for empty text", () => {
    expect(chunkContract("")).toEqual([]);
    expect(chunkContract("   ")).toEqual([]);
  });

  test("should return single chunk for short text", () => {
    const text = "This is a short contract.";
    const chunks = chunkContract(text, 1000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  test("should split text at paragraph boundaries", () => {
    const para1 = "A".repeat(50);
    const para2 = "B".repeat(50);
    const para3 = "C".repeat(50);
    const text = `${para1}\n\n${para2}\n\n${para3}`;

    // Max size that fits two paragraphs but not three
    const chunks = chunkContract(text, 105);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  test("should not split mid-paragraph when possible", () => {
    const para1 = "First paragraph with some text.";
    const para2 = "Second paragraph with different text.";
    const text = `${para1}\n\n${para2}`;

    const chunks = chunkContract(text, 40);
    expect(chunks[0]).toBe(para1);
    expect(chunks[1]).toBe(para2);
  });

  test("should handle text without paragraph breaks", () => {
    // A single long paragraph → falls back to sentence splitting
    const longParagraph =
      "Sentence one. Sentence two. Sentence three. Sentence four. Sentence five.";
    const chunks = chunkContract(longParagraph, 40);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  test("should handle large contract with many paragraphs", () => {
    // 50 paragraphs of 100 chars each = 5000 chars total
    const paragraphs = Array.from(
      { length: 50 },
      (_, i) => `Paragraph ${i + 1}: ${"x".repeat(80)}`,
    );
    const text = paragraphs.join("\n\n");

    const chunks = chunkContract(text, 500);
    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk should be under the limit
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(500);
    }
  });
});

// ── safeParseJSON ────────────────────────────────

describe("safeParseJSON", () => {
  test("should parse clean JSON", () => {
    const json =
      '[{"clauseNumber": 1, "clauseText": "test", "clauseType": "other"}]';
    const result = safeParseJSON(json);
    expect(result).toEqual([
      { clauseNumber: 1, clauseText: "test", clauseType: "other" },
    ]);
  });

  test("should parse JSON wrapped in markdown fences", () => {
    const raw =
      '```json\n[{"clauseNumber": 1, "clauseText": "test", "clauseType": "other"}]\n```';
    const result = safeParseJSON(raw);
    expect(result).toEqual([
      { clauseNumber: 1, clauseText: "test", clauseType: "other" },
    ]);
  });

  test("should parse JSON wrapped in plain markdown fences", () => {
    const raw = '```\n[{"clauseNumber": 1}]\n```';
    const result = safeParseJSON(raw);
    expect(result).toEqual([{ clauseNumber: 1 }]);
  });

  test("should extract JSON from surrounding text", () => {
    const raw =
      'Here is the result:\n[{"clauseNumber": 1, "clauseText": "test", "clauseType": "other"}]\nDone.';
    const result = safeParseJSON(raw);
    expect(result).toEqual([
      { clauseNumber: 1, clauseText: "test", clauseType: "other" },
    ]);
  });

  test("should throw for empty input", () => {
    expect(() => safeParseJSON("")).toThrow("Empty response");
  });

  test("should throw for completely invalid content", () => {
    expect(() => safeParseJSON("This is not JSON at all")).toThrow(
      "Failed to parse JSON",
    );
  });

  test("should parse JSON object (not just arrays)", () => {
    const raw = '{"key": "value"}';
    expect(safeParseJSON(raw)).toEqual({ key: "value" });
  });
});

// ── mergeExtractionResults ───────────────────────

describe("mergeExtractionResults", () => {
  test("should merge results from multiple chunks", () => {
    const chunk1 = [
      { clauseNumber: 1, clauseText: "Clause A" },
      { clauseNumber: 2, clauseText: "Clause B" },
    ];
    const chunk2 = [
      { clauseNumber: 1, clauseText: "Clause C" },
      { clauseNumber: 2, clauseText: "Clause D" },
    ];

    const merged = mergeExtractionResults([chunk1, chunk2]);
    expect(merged).toHaveLength(4);
    // Verify sequential renumbering
    expect(merged[0].clauseNumber).toBe(1);
    expect(merged[1].clauseNumber).toBe(2);
    expect(merged[2].clauseNumber).toBe(3);
    expect(merged[3].clauseNumber).toBe(4);
  });

  test("should deduplicate identical clauses across chunks", () => {
    const chunk1 = [
      { clauseNumber: 1, clauseText: "Same clause text" },
      { clauseNumber: 2, clauseText: "Unique to chunk 1" },
    ];
    const chunk2 = [
      { clauseNumber: 1, clauseText: "Same clause text" }, // duplicate
      { clauseNumber: 2, clauseText: "Unique to chunk 2" },
    ];

    const merged = mergeExtractionResults([chunk1, chunk2]);
    expect(merged).toHaveLength(3);
  });

  test("should handle case-insensitive and whitespace-insensitive dedup", () => {
    const chunk1 = [
      { clauseNumber: 1, clauseText: "The employee  SHALL comply" },
    ];
    const chunk2 = [
      { clauseNumber: 1, clauseText: "the employee shall comply" },
    ];

    const merged = mergeExtractionResults([chunk1, chunk2]);
    expect(merged).toHaveLength(1);
  });

  test("should handle empty chunks", () => {
    const merged = mergeExtractionResults([[], []]);
    expect(merged).toHaveLength(0);
  });

  test("should handle single chunk", () => {
    const chunk = [{ clauseNumber: 1, clauseText: "Only clause" }];
    const merged = mergeExtractionResults([chunk]);
    expect(merged).toHaveLength(1);
    expect(merged[0].clauseNumber).toBe(1);
  });
});
