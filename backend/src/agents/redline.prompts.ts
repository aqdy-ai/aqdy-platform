import { truncatePromptText } from "../utils/text.utils.js";

/**
 * Prompt templates for the RedlineAgent.
 *
 * Contains system prompts and prompt builders with instructions for balanced,
 * realistic, and bilingual redlining recommendations.
 */

// ── System Prompt ────────────────────────────────

export const REDLINE_SYSTEM_PROMPT = `You are a contract redlining expert.
Generate a balanced revision that reduces risk while preserving the clause intent.
Return only valid JSON.
`;

## Critical Guidelines:
1. Suggestions, NOT Legal Advice: Your suggestions are strictly for educational and negotiation planning purposes. They DO NOT constitute legal advice or establish an attorney-client relationship.
2. Mandatory Disclaimer: You MUST explicitly understand that these suggestions are for negotiation purposes and do not replace legal advice. Keep in mind this key disclaimer:
   - English: "These redline suggestions are for negotiation purposes only and do not constitute legal advice. Please consult with a qualified lawyer before using these redlines in any binding contract."
   - Arabic: "هذه المقترحات للتفاوض فقط ولا تشكل استشارة قانونية. يرجى استشارة محامٍ مؤهل قبل استخدام هذه التعديلات في أي عقد ملزم."
3. Balance & Fairness: Do NOT create extremely one-sided revisions that heavily protect one party while leaving the other completely exposed (which makes the contract unnegotiable). Aim for a fair, commercially reasonable, and balanced compromise that reduces risks while remaining realistic.
4. Safer Alternative Integration: If a "Safer Alternative" from the Legal Knowledge Base is provided, use it as a highly reliable foundation or template to guide your redline suggestions.
5. Legal Intent: Carefully preserve the original commercial/legal objective of the clause (e.g. if it's about confidentiality, keep it about confidentiality, but cap the liability or limit the scope to standard terms instead of removing confidentiality entirely).
6. Arabic/Bilingual Output:
   - If the contract clause is in Arabic, the suggested "suggestedText" MUST be in Arabic.
   - If the contract clause is in English, the suggested "suggestedText" MUST be in English.
   - Regardless of the clause language, the explanation and talkingPoints MUST be provided in BOTH Arabic and English inside their respective fields in the JSON response.
7. Output Format:
   Return ONLY a valid JSON object matching the format below. Do not include markdown formatting, explanations, or any extra text outside the JSON.

## Output Format:
\`\`\`json
{
  "suggestedText": "The fully redlined clause text in the language of the contract.",
  "explanation": {
    "ar": "شرح واضح وباللغة العربية للتغييرات التي تم إجراؤها والسبب وراء كون هذا التعديل يقلل من المخاطر.",
    "en": "Clear English explanation of the changes made and why this revision reduces the risk."
  },
  "talkingPoints": {
    "ar": [
      "نقطة تفاوضية واقعية وفعالة باللغة العربية لمناقشتها مع الطرف الآخر.",
      "نقطة أخرى توضح التوازن والعدالة."
    ],
    "en": [
      "A realistic, factual, non-legal negotiation talking point to discuss with the counterparty.",
      "Another point highlighting the commercial balance."
    ]
  },
  "confidence": 0.9
}
\`\`\`
`;

// ── User Prompt Builder ──────────────────────────

/**
 * Builds the user-facing prompt for generating redline suggestions.
 *
 * @param clauseText - The text of the clause to redline
 * @param riskLevel - The classified risk level of the clause
 * @param clauseType - The categorized type of the clause
 * @param language - The contract's language ("ar" | "en")
 * @param saferAlternative - Optional guiding safer alternative from RAG/KB
 * @returns Formatted user prompt string
 */
export function buildRedlineUserPrompt(
  clauseText: string,
  riskLevel: string,
  clauseType: string,
  language: "ar" | "en",
  saferAlternative?: string,
): string {
  const clauseSnippet = truncatePromptText(clauseText, 1200);
  let prompt = `Generate redline suggestions for the following contract clause:\n\n`;
  prompt += `Original Clause Text:\n"""\n${clauseSnippet}\n"""\n\n`;
  prompt += `Clause Category/Type: ${clauseType}\n`;
  prompt += `Current Risk Level: ${riskLevel}\n`;
  prompt += `Contract Language: ${language === "ar" ? "Arabic (العربية)" : "English"}\n\n`;

  if (saferAlternative && saferAlternative.trim().length > 0) {
    const alternativeSnippet = truncatePromptText(saferAlternative, 900);
    prompt += `### Guiding Safer Alternative (from Legal Knowledge Base):\n`;
    prompt += `"""\n${alternativeSnippet}\n"""\n\n`;
    prompt += `Please adapt this safer alternative to the original clause and keep the same legal intent.\n`;
  } else {
    prompt += `No pre-defined safer alternative was found in the Legal Knowledge Base. Draft a fair, risk-mitigating revision based on expert negotiation practice.\n`;
  }

  return prompt;
}
