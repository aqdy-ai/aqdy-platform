/**
 * Security & Input Validation Middleware.
 *
 * Implements strict sanitization for general text inputs (HTML/XSS prevention)
 * and a robust bilingual Prompt Injection Detection System to neutralize
 * adversarial prompts designed to jailbreak or override LLM system prompts.
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

// ── Prompt Injection Signatures ──────────────────

const PROMPT_INJECTION_PATTERNS = [
  // English Jailbreak/Override patterns
  /ignore\s+(?:any|previous)\s+instructions/i,
  /system\s+override/i,
  /you\s+are\s+now\s+(?:unrestricted|free|dan)/i,
  /forget\s+(?:your|previous)\s+(?:instructions|guidelines|rules)/i,
  /act\s+as\s+a\s+(?:simulator|developer|unrestricted|terminal)/i,
  /reveal\s+(?:your|the)\s+system\s+(?:prompt|instructions)/i,
  /new\s+rule/i,
  /disregard\s+all\s+prior/i,
  /you\s+must\s+print/i,

  // Arabic Jailbreak/Override patterns
  /تجاهل\s+(?:التعليمات|الأوامر)\s+(?:السابقة|القديمة)/i,
  /تخطي\s+النظام/i,
  /أنت\s+الآن\s+(?:.*)?(?:غير\s+مقيد|حر)/i,
  /انس\s+تعليماتك/i,
  /تصرف\s+كـ/i,
  /اكشف\s+(?:عن|موجه)\s+النظام/i,
  /قواعد\s+جديدة/i,
];

// ── Sanitization and Detection Helpers ────────────

/**
 * Strips dangerous HTML tags, javascript elements, and standard injection characters.
 *
 * @param text - The raw input text
 * @returns Cleaned sanitized text
 */
export function sanitizeText(text: string): string {
  if (!text) return "";

  return (
    text
      // Strip HTML script tags completely
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Strip other common HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove null bytes
      .replace(/\0/g, "")
      // Trim extra spaces
      .trim()
  );
}

/**
 * Evaluates whether a given text contains prompt injection signatures.
 *
 * @param text - The text to analyze
 * @returns True if a prompt injection signature is detected
 */
export function detectPromptInjection(text: string): boolean {
  if (!text) return false;

  const normalizedText = text.toLowerCase();

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return true;
    }
  }

  return false;
}

// ── Express Middlewares ───────────────────────────

/**
 * Strict Input Validation and Prompt Injection prevention middleware.
 * Automatically checks and sanitizes body string parameters.
 * Rejects requests immediately with a 400 Bad Request if prompt injection is found.
 */
export const strictSecurityMiddleware = (
  fieldsToScan: string[] = ["text", "contractText"],
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const field of fieldsToScan) {
      const val = req.body[field];

      if (typeof val === "string") {
        // 1. Detect prompt injection
        if (detectPromptInjection(val)) {
          logger.warn(
            `🛑 Security: Prompt Injection attempt detected in field '${field}'`,
            {
              ip: req.ip,
              userId: req.headers ? req.headers["x-user-id"] : undefined,
            },
          );

          res.status(400).json({
            success: false,
            error: "Security validation failed",
            message:
              "Suspicious instruction patterns detected. Upload rejected.",
          });
          return;
        }

        // 2. Sanitize general inputs
        req.body[field] = sanitizeText(val);
      }
    }

    next();
  };
};
