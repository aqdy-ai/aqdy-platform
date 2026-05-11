import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { env } from "./env";

// ── Model Names ──────────────────────────────────

export const GEMMA4_PRIMARY_MODEL = "gemma-4-31b-it";
export const GEMMA4_FALLBACK_MODEL = "gemma-4-26b-a4b-it";

// ── Shared Model Instances ───────────────────────

/**
 * Gemma 4 31B Dense — Primary model
 * Best for: complex clause analysis, risk classification, redline generation
 * Context window: 256K tokens
 */
export const gemma4Primary = new ChatGoogleGenerativeAI({
  model: GEMMA4_PRIMARY_MODEL,
  apiKey: env.GEMINI_API_KEY,
  temperature: 0.1,
  maxOutputTokens: 4096,
});

/**
 * Gemma 4 26B MoE — Fallback model
 * Best for: simpler tasks, faster responses, cost optimization
 * Context window: 256K tokens
 */
export const gemma4Fallback = new ChatGoogleGenerativeAI({
  model: GEMMA4_FALLBACK_MODEL,
  apiKey: env.GEMINI_API_KEY,
  temperature: 0.1,
  maxOutputTokens: 4096,
});

// ── Output Parser ────────────────────────────────

export const outputParser = new StringOutputParser();

// ── Chain Builder Helper ─────────────────────────
/**
 * Builds a LangChain pipeline: prompt → model → string output
 * Used by all agents in Week 2.
 *
 * @param systemPrompt - The system instruction for the agent
 * @param useFallback  - If true, uses Gemma 4 26B MoE instead of 31B
 *
 * @example
 * const chain = buildChain(EXTRACTION_SYSTEM_PROMPT);
 * const result = await chain.invoke({ input: contractText });
 */
export const buildChain = (
  systemPrompt: string,
  useFallback = false,
): RunnableSequence => {
  const model = useFallback ? gemma4Fallback : gemma4Primary;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", "{input}"],
  ]);

  return RunnableSequence.from([prompt, model, outputParser]);
};

// ── Prompt Templates ─────────────────────────────
/**
 * Shared prompt templates reused across all three agents.
 * Agents will extend these with more specific instructions in Week 2.
 */

export const CONTRACT_ANALYSIS_SYSTEM_PROMPT = `
You are Aqdy, an expert legal AI assistant specializing in contract analysis
for the MENA region, with deep knowledge of Egyptian labor law and business practices.

Your role is to:
1. Identify risky clauses in contracts
2. Explain risks in simple, clear language
3. Suggest safer alternatives
4. Reference relevant laws when applicable

Always respond in the same language as the contract (Arabic or English).
Be precise, helpful, and never provide legal advice — only legal information.
`;

export const EXTRACTION_SYSTEM_PROMPT = `
You are a contract clause extraction specialist.
Your job is to extract and list all distinct clauses from a contract.

Return the clauses as a JSON array where each item has:
{
  "clauseNumber": number,
  "clauseText": string,
  "clauseType": string (e.g. "liability", "termination", "payment", "confidentiality")
}

Do not summarize — extract the exact clause text.
Return only valid JSON with no extra explanation.
`;

export const RISK_CLASSIFICATION_SYSTEM_PROMPT = `
You are a contract risk classification expert for the MENA region.
Classify each clause as one of: "low", "medium", "high", or "critical" risk.

Return your analysis as a JSON array where each item has:
{
  "clauseText": string,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "explanation": { "ar": string, "en": string },
  "whyRisky": { "ar": string, "en": string },
  "saferAlternative": { "ar": string, "en": string },
  "confidence": number (0-1),
  "relatedLaw": string | null
}

Always cite the relevant Egyptian law or MENA precedent if known.
Return only valid JSON with no extra explanation.
`;

export const REDLINE_SYSTEM_PROMPT = `
You are a contract redlining expert for the MENA region.
Your job is to suggest improved, safer versions of risky contract clauses.

For each risky clause provided, return a JSON object with:
{
  "originalClause": string,
  "redlinedClause": string,
  "summary": { "ar": string, "en": string },
  "negotiationTips": { "ar": string[], "en": string[] }
}

Make the redlined clause fair, legally sound, and appropriate for Egyptian law.
Return only valid JSON with no extra explanation.
`;
