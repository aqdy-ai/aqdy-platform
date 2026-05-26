/**
 * Prompt templates for the RiskClassifierAgent.
 *
 * Contains system prompts and prompt builders with context awareness.
 */

// ── System Prompt ────────────────────────────────

export const RISK_CLASSIFIER_SYSTEM_PROMPT = `You are a contract risk classification expert for the MENA region, with deep knowledge of Egyptian labor law and commercial practices.
Your job is to analyze the provided contract clause, classify its risk level, and explain the risk.

## Risk Levels:
- "low": Standard clauses that protect both parties and present no unusual risk.
- "medium": Clauses that require attention or have mild restrictions but are generally standard.
- "high": Highly restrictive or biased clauses that significantly favor one party or contain potentially problematic conditions.
- "critical": Illegal, void, or extremely dangerous clauses that expose a party to catastrophic financial/legal liability or violate mandatory Egyptian laws (e.g. mandatory overtime without pay, 6-month probation, etc.).

## Instructions:
1. Classify the clause risk level as one of: "low", "medium", "high", or "critical".
2. Provide a clear, detailed explanation of the risk, why it is risky, and its implications under Egyptian law in BOTH Arabic ("ar") and English ("en").
3. Estimate your confidence in this classification on a scale from 0.0 to 1.0.
4. If Context from the Legal Knowledge Base is provided:
   - Align your classification closely with the provided reference risk level.
   - Incorporate the reference explanations and related laws (such as articles of the Egyptian Civil Code, Labor Law No. 12/2003, Data Protection Law No. 151/2020, etc.) into your output.
5. If no Context from the Legal Knowledge Base is provided, rely on your general legal training under Egyptian/MENA law to classify and explain the clause.
6. Return ONLY a valid JSON object matching the format below. Do not include markdown formatting, explanations, or any extra text outside the JSON.

## Output Format:
\`\`\`json
{
  "riskLevel": "low" | "medium" | "high" | "critical",
  "explanation": {
    "ar": "شرح مفصل للمخاطر وتأثيرها القانوني بموجب القانون المصري باللغة العربية.",
    "en": "Detailed explanation of the risk and its legal impact under Egyptian law in English."
  },
  "confidence": 0.85
}
\`\`\`
`;

// ── User Prompt Builder ──────────────────────────

export interface KBReference {
  id: string;
  category: string;
  riskLevel: string;
  clausePattern: string;
  explanation: { ar: string; en: string };
  whyRisky: { ar: string; en: string };
  saferAlternative: { ar: string; en: string };
  relatedLaw: string;
}

/**
 * Builds the user-facing prompt for risk classification.
 *
 * @param clauseText - The text of the clause to classify
 * @param clauseType - The categorized type of the clause
 * @param language - The contract's language ("ar" | "en")
 * @param kbMatch - Optional reference match from the legal knowledge base (RAG)
 * @returns Formatted user prompt string
 */
export function buildClassificationUserPrompt(
  clauseText: string,
  clauseType: string,
  language: "ar" | "en",
  kbMatch?: KBReference
): string {
  let prompt = `Analyze and classify the following contract clause:\n\n`;
  prompt += `Clause Text:\n"""\n${clauseText}\n"""\n\n`;
  prompt += `Clause Category/Type: ${clauseType}\n`;
  prompt += `Contract Language: ${language === "ar" ? "Arabic (العربية)" : "English"}\n\n`;

  if (kbMatch) {
    prompt += `### Context from Legal Knowledge Base (Close Match Found)\n`;
    prompt += `- KB Reference ID: ${kbMatch.id}\n`;
    prompt += `- Reference Category: ${kbMatch.category}\n`;
    prompt += `- Reference Risk Level: ${kbMatch.riskLevel}\n`;
    prompt += `- Matching Pattern: "${kbMatch.clausePattern}"\n`;
    prompt += `- Reference Explanation (AR): ${kbMatch.explanation.ar}\n`;
    prompt += `- Reference Explanation (EN): ${kbMatch.explanation.en}\n`;
    prompt += `- Why Risky (AR): ${kbMatch.whyRisky.ar}\n`;
    prompt += `- Why Risky (EN): ${kbMatch.whyRisky.en}\n`;
    prompt += `- Related Egyptian/MENA Law: ${kbMatch.relatedLaw || "Not specified"}\n\n`;
    prompt += `Note: This clause is highly similar to the above KB reference. Align your risk level, explanations, and laws directly with this context.\n`;
  } else {
    prompt += `No close match was found in the Legal Knowledge Base for this clause text. Please perform classification based on general legal expertise under Egyptian and MENA regulations.\n`;
  }

  return prompt;
}
