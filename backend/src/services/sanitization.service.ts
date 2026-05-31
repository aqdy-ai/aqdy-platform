/**
 * SanitizationService — Sits between raw contract text and LLM execution.
 *
 * Implements Task 3.2: Prompt Injection Prevention.
 *
 * Detects and removes suspicious patterns (role overrides, ignore instructions, jailbreak attempts)
 * and escapes special characters that could interfere with prompt template construction,
 * while ensuring that legitimate Arabic and English legal contracts remain intact.
 *
 * Based on the OWASP LLM Top 10 Reference List (LLM01: Prompt Injection).
 */

import { logger } from "../utils/logger.js";

export interface InjectionPattern {
  name: string;
  category: string;
  regex: RegExp;
  replacement: string;
  description: string;
}

export interface SanitizationResult {
  text: string;
  isSafe: boolean;
  detections: Array<{
    name: string;
    category: string;
    description: string;
  }>;
  report: string;
}

export interface BatchSanitizationResult {
  index: number;
  original: string;
  sanitized: string;
  isSafe: boolean;
  detections: Array<{
    name: string;
    category: string;
    description: string;
  }>;
}

export const INJECTION_PATTERNS: InjectionPattern[] = [
  // ── CATEGORY 1: Role Override Attacks ──────────────────────────────────────
  {
    name: "role_override_you_are",
    category: "Role Override",
    regex:
      /you\s+are\s+(now\s+)?(a\s+|an\s+)?(different|new|another|unrestricted|uncensored|free|evil|alternative)?\s*(ai|assistant|bot|model|gpt|chatbot|system|llm)/gi,
    replacement: "[ROLE_OVERRIDE_REMOVED]",
    description: "Attempts to redefine the AI's role",
  },
  {
    name: "role_override_act_as",
    category: "Role Override",
    regex:
      /\b(act\s+as\s+(a\s+|an\s+)?\w+(\s+\w+){0,3}(ai|assistant|bot|model|gpt|system|dan|character))/gi,
    replacement: "[ROLE_OVERRIDE_REMOVED]",
    description: "act as [role] injection",
  },
  {
    name: "role_override_pretend",
    category: "Role Override",
    regex: /\b(pretend\s+(you\s+are|to\s+be)\s+.{0,60})/gi,
    replacement: "[ROLE_OVERRIDE_REMOVED]",
    description: "pretend you are / pretend to be injection",
  },
  {
    name: "role_override_from_now",
    category: "Role Override",
    regex:
      /\b(from\s+(now|this\s+point)\s+on[,\s]+you\s+(are|will|must|shall).{0,80})/gi,
    replacement: "[ROLE_OVERRIDE_REMOVED]",
    description: "from now on you are injection",
  },
  {
    name: "role_override_your_new_persona",
    category: "Role Override",
    regex:
      /\b(your\s+(new\s+)?(persona|identity|role|name|purpose)\s+(is|will\s+be).{0,60})/gi,
    replacement: "[ROLE_OVERRIDE_REMOVED]",
    description: "your new persona/identity injection",
  },

  // ── CATEGORY 2: Instruction Override Attacks ───────────────────────────────
  {
    name: "ignore_previous",
    category: "Instruction Override",
    regex:
      /\b(ignore\s+(all\s+)?(previous|prior|above|earlier|your|the\s+previous|initial)\s+(instructions?|prompts?|rules?|guidelines?|directions?|commands?|context|constraints?))/gi,
    replacement: "[INSTRUCTION_OVERRIDE_REMOVED]",
    description: "Classic ignore previous instructions injection",
  },
  {
    name: "disregard_instructions",
    category: "Instruction Override",
    regex:
      /\b(disregard|forget|override|bypass|cancel|reset|clear|delete|remove)\s+(all\s+|the\s+)?(previous|prior|above|system|initial|original|your)?\s*(instructions?|prompts?|rules?|guidelines?|constraints?|programming|training)/gi,
    replacement: "[INSTRUCTION_OVERRIDE_REMOVED]",
    description: "disregard/forget/override instructions injection",
  },
  {
    name: "new_instructions",
    category: "Instruction Override",
    regex:
      /\b(your\s+(new\s+|actual\s+|real\s+|true\s+|updated\s+)?(instructions?|task|objective|goal|mission|purpose|job)\s+(is|are|will\s+be|now\s+is)[\s:].{0,100})/gi,
    replacement: "[INSTRUCTION_OVERRIDE_REMOVED]",
    description: "your new instructions injection",
  },
  {
    name: "instead_do_this",
    category: "Instruction Override",
    regex:
      /\b(instead[,\s]+(you\s+should|please|just|now)\s+(do|say|respond|output|return|print|write|tell).{0,80})/gi,
    replacement: "[INSTRUCTION_OVERRIDE_REMOVED]",
    description: "instead do this injection",
  },

  // ── CATEGORY 3: System Prompt Extraction Attacks ───────────────────────────
  {
    name: "reveal_system_prompt",
    category: "System Prompt Extraction",
    regex:
      /\b(print|show|display|reveal|output|repeat|return|tell\s+me|what\s+is)\s+(your\s+)?(system\s+prompt|initial\s+prompt|original\s+prompt|instructions?|programming|training|configuration|context|prompt)/gi,
    replacement: "[EXTRACTION_ATTEMPT_REMOVED]",
    description: "Attempts to extract system prompt",
  },
  {
    name: "what_were_you_told",
    category: "System Prompt Extraction",
    regex:
      /\b(what\s+(were|are)\s+you\s+(told|instructed|programmed|trained|configured|asked)\s+to)/gi,
    replacement: "[EXTRACTION_ATTEMPT_REMOVED]",
    description: "what were you told to do injection",
  },
  {
    name: "repeat_everything_above",
    category: "System Prompt Extraction",
    regex:
      /\b(repeat|echo|copy|restate|reproduce)\s+(everything|all|the\s+text|verbatim|word\s+for\s+word)?\s*(above|before|prior|previous|from\s+the\s+beginning)/gi,
    replacement: "[EXTRACTION_ATTEMPT_REMOVED]",
    description: "repeat everything above injection",
  },

  // ── CATEGORY 4: Jailbreak Attacks ─────────────────────────────────────────
  {
    name: "jailbreak_dan",
    category: "Jailbreak",
    regex:
      /\b(DAN|do\s+anything\s+now|jailbreak|jail\s*break|uncensored\s+mode|developer\s+mode|god\s+mode|unrestricted\s+mode|no\s+restrictions?\s+mode)/gi,
    replacement: "[JAILBREAK_REMOVED]",
    description: "DAN and common jailbreak keywords",
  },
  {
    name: "jailbreak_stan",
    category: "Jailbreak",
    regex:
      /\bSTAN\b(?!\\s*dard)|\bstrive\s+to\s+avoid\s+norms?\b|\balways\s+intelligent\s+and\s+machiavellian\b/gi,
    replacement: "[JAILBREAK_REMOVED]",
    description: "STAN jailbreak",
  },
  {
    name: "jailbreak_opposite_mode",
    category: "Jailbreak",
    regex:
      /\b(opposite\s+(day|mode)|everything\s+in\s+reverse|anti[- ]?(gpt|ai|llm)\s+mode|evil\s+(mode|twin|version))/gi,
    replacement: "[JAILBREAK_REMOVED]",
    description: "Opposite/evil mode jailbreak",
  },
  {
    name: "jailbreak_hypothetically",
    category: "Jailbreak",
    regex:
      /\b(hypothetically(\s+speaking)?[,\s]+if\s+you\s+(had\s+no|were\s+without|could\s+ignore)\s+(restrictions?|rules?|guidelines?|limitations?|constraints?))/gi,
    replacement: "[JAILBREAK_REMOVED]",
    description: "Hypothetically speaking jailbreak",
  },
  {
    name: "jailbreak_for_research",
    category: "Jailbreak",
    regex:
      /\b(for\s+(research|educational|academic|testing|training)\s+purposes[,\s]+.{0,30}(ignore|bypass|disregard|override|forget))/gi,
    replacement: "[JAILBREAK_REMOVED]",
    description: "For research purposes jailbreak",
  },
  {
    name: "jailbreak_in_this_story",
    category: "Jailbreak",
    regex:
      /\b(in\s+(this\s+)?(story|novel|fiction|game|roleplay|scenario|simulation)[,\s]+you\s+(are|play|become|act\s+as))/gi,
    replacement: "[JAILBREAK_REMOVED]",
    description: "In this story roleplay jailbreak",
  },

  // ── CATEGORY 5: Data Exfiltration Attacks ─────────────────────────────────
  {
    name: "data_exfil_send_to",
    category: "Data Exfiltration",
    regex:
      /\b(send|post|transmit|upload|forward)\s+(all\s+|the\s+)?(data|information|content|messages?|conversations?|user\s+data|contract|files?)\s+to\s+(https?:\/\/|ftp:\/\/|\w+\.\w+)/gi,
    replacement: "[EXFILTRATION_ATTEMPT_REMOVED]",
    description: "Attempts to send data to external URL",
  },
  {
    name: "data_exfil_fetch_url",
    category: "Data Exfiltration",
    regex:
      /\b(fetch|load|retrieve|request|call|ping|access)\s+(https?:\/\/\S+)/gi,
    replacement: "[EXFILTRATION_ATTEMPT_REMOVED]",
    description: "Attempts to fetch external URLs",
  },
  {
    name: "data_exfil_inject_url",
    category: "Data Exfiltration",
    regex:
      /(?<!\w)(https?:\/\/(?!laws\.justice\.gc\.ca|legislation\.|ilo\.org|eur-lex\.europa)\S{10,})/gi,
    replacement: "[URL_REMOVED]",
    description: "Suspicious URLs embedded in text",
  },

  // ── CATEGORY 6: Delimiter / Template Injection ─────────────────────────────
  {
    name: "template_injection_triple_brace",
    category: "Template Injection",
    regex: /\{\{\{.{0,200}\}\}\}/g,
    replacement: "[TEMPLATE_INJECTION_REMOVED]",
    description: "Triple brace template injection",
  },
  {
    name: "template_injection_system_tag",
    category: "Template Injection",
    regex:
      /<\s*(system|assistant|user|human|ai|bot|gpt|claude|instruction)\s*>[\s\S]{0,500}<\s*\/\s*(system|assistant|user|human|ai|bot|gpt|claude|instruction)\s*>/gi,
    replacement: "[TEMPLATE_INJECTION_REMOVED]",
    description: "HTML-style system/assistant/user tag injection",
  },
  {
    name: "template_injection_prompt_markers",
    category: "Template Injection",
    regex:
      /(###\s*(system|user|assistant|human|instruction)|<\|im_start\|>|<\|im_end\|>|\[SYSTEM\]|\[INST\]|\[\/INST\]|<<SYS>>|<\/SYS>>)/gi,
    replacement: "[TEMPLATE_INJECTION_REMOVED]",
    description: "Common LLM prompt format markers",
  },

  // ── CATEGORY 7: Indirect Injection (via contract content) ─────────────────
  {
    name: "indirect_when_you_see",
    category: "Indirect Injection",
    regex:
      /\b(when\s+you\s+(see|read|process|analyze|encounter)\s+this[,\s]+.{0,80}(do|say|output|return|respond|tell))/gi,
    replacement: "[INDIRECT_INJECTION_REMOVED]",
    description: "When you see this... indirect injection",
  },
  {
    name: "indirect_ai_reading",
    category: "Indirect Injection",
    regex:
      /\b(attention[:\s]+ai|dear\s+(ai|assistant|model|gpt|llm)|note\s+to\s+(ai|assistant|model|llm|gpt)[:\s])/gi,
    replacement: "[INDIRECT_INJECTION_REMOVED]",
    description: "Attention: AI / Dear AI indirect injection",
  },
  {
    name: "indirect_hidden_text",
    category: "Indirect Injection",
    regex: /(\s{20,})(ignore|forget|override|you\s+are|act\s+as)/gi,
    replacement: " [HIDDEN_TEXT_INJECTION_REMOVED]",
    description: "Hidden whitespace injection",
  },

  // ── CATEGORY 8: Arabic Injection Patterns ─────────────────────────────────
  {
    name: "arabic_ignore_instructions",
    category: "Arabic Injection",
    regex:
      /(تجاهل|انسَ|انس|تخطَّ|تخط|ألغِ|الغ)\s+(جميع\s+)?(التعليمات|الأوامر|الإرشادات|الارشادات|البرمجة|القيود)/g,
    replacement: "[ARABIC_INJECTION_REMOVED]",
    description: "Arabic: ignore instructions injection",
  },
  {
    name: "arabic_you_are_now",
    category: "Arabic Injection",
    regex:
      /(أنت\s+الآن|انت\s+الان|أنت\s+في\s+الواقع|من\s+الآن\s+فصاعد(?:ا|اً)?\s+أنت|من\s+الان\s+فصاعدا\s+انت)\s*.{0,60}/g,
    replacement: "[ARABIC_INJECTION_REMOVED]",
    description: "Arabic: you are now injection",
  },
  {
    name: "arabic_new_instructions",
    category: "Arabic Injection",
    regex:
      /(تعليماتك\s+الجديدة|مهمتك\s+(الآن|الان|الجديدة|الحقيقية)|هدفك\s+(الآن|الان|الحقيقي))\s*(هي|هو|ستكون|تكون).{0,100}/g,
    replacement: "[ARABIC_INJECTION_REMOVED]",
    description: "Arabic: new instructions injection",
  },
];

export const MAX_CLAUSE_LENGTH = 5000;

export class SanitizationService {
  /**
   * Enforces a maximum character length for a single contract clause.
   */
  enforceMaxLength(text: string): string {
    if (text.length <= MAX_CLAUSE_LENGTH) return text;
    return (
      text.slice(0, MAX_CLAUSE_LENGTH) +
      "\n[TRUNCATED: text exceeded maximum clause length]"
    );
  }

  /**
   * Escapes special characters that could interfere with prompt template construction.
   */
  escapePromptSpecialChars(text: string): string {
    return (
      text
        // Escape template literals that could inject code
        .replace(/`/g, "'")
        // Escape double braces (Jinja / Handlebars template syntax)
        .replace(/\{\{/g, "{ {")
        .replace(/\}\}/g, "} }")
        // Remove null bytes
        .replace(/\0/g, "")
        // Normalize unusual Unicode spaces to regular space
        .replace(/[\u00A0\u2000-\u200B\u202F\u3000]/g, " ")
        // Remove zero-width characters (used in steganographic attacks)
        .replace(/\u200C|\u200D|\u200E|\u200F|\uFEFF/g, "")
        // Normalize excessive whitespace (but keep newlines for structure)
        .replace(/[ \t]{10,}/g, "    ")
        // Remove ASCII control characters (except tab and newline)
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    );
  }

  /**
   * Runs all injection detection patterns on the input text.
   * Returns the cleaned text and a detailed report.
   *
   * @param rawText - Raw extracted contract or clause text
   * @returns SanitizationResult
   */
  sanitize(rawText: unknown): SanitizationResult {
    if (typeof rawText !== "string") {
      logger.warn("SanitizationService: Invalid non-string input received");
      return {
        text: "",
        isSafe: false,
        detections: [
          {
            name: "invalid_input",
            category: "Input Error",
            description: "Input was not a string.",
          },
        ],
        report: "Input was not a string.",
      };
    }

    let text = rawText;
    const detections: SanitizationResult["detections"] = [];

    // Step 1: Max length guard
    text = this.enforceMaxLength(text);

    // Step 2: Run all injection patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.regex.test(text)) {
        detections.push({
          name: pattern.name,
          category: pattern.category,
          description: pattern.description,
        });

        // Reset lastIndex for safety
        pattern.regex.lastIndex = 0;
        text = text.replace(pattern.regex, pattern.replacement);
      }
      pattern.regex.lastIndex = 0;
    }

    // Step 3: Escape special characters
    text = this.escapePromptSpecialChars(text);

    const isSafe = detections.length === 0;

    const report = isSafe
      ? "✅ Text is clean. No injection patterns detected."
      : `⚠️  ${detections.length} injection pattern(s) detected and removed:\n` +
        detections
          .map((d) => `  - [${d.category}] ${d.name}: ${d.description}`)
          .join("\n");

    if (!isSafe) {
      logger.warn("🛑 SanitizationService: Neutered prompt injection payload", {
        detectionsCount: detections.length,
        report,
      });
    }

    return { text, isSafe, detections, report };
  }

  /**
   * Sanitizes an array of clause strings.
   * Returns the array with each clause cleaned.
   */
  sanitizeAll(clauses: string[]): BatchSanitizationResult[] {
    return clauses.map((clause, i) => {
      const result = this.sanitize(clause);
      return {
        index: i,
        original: clause,
        sanitized: result.text,
        isSafe: result.isSafe,
        detections: result.detections,
      };
    });
  }
}

export const sanitizationService = new SanitizationService();
