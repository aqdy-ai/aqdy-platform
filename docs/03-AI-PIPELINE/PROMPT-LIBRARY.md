# Prompt Library

> Catalog of all production prompts with versioning and rationale.

## Prompt Catalog

| Name | Agent | File | Lines | Purpose |
|------|-------|------|-------|---------|
| `EXTRACTOR_SYSTEM_PROMPT` | ExtractorAgent | `agents/extractor.prompts.ts` | 147 | Extract structured clauses from contract text; includes 19-type taxonomy, 2 few-shot examples (EN/AR), OCR artifact handling |
| `RISK_CLASSIFIER_SYSTEM_PROMPT` | RiskClassifierAgent | `agents/riskClassifier.prompts.ts` | 42 | Classify clause risk level with bilingual explanation; references Egyptian law context |
| `REDLINE_SYSTEM_PROMPT` | RedlineAgent | `agents/redline.prompts.ts` | 52 | Generate balanced redline suggestions with mandatory bilingual disclaimer |
| `JUDGE_SYSTEM_PROMPT` | Judge | `services/judgePrompt.ts` | 52 | Score analysis on 4 metrics with detailed 5-level rubric |
| `JUDGE_USER_PROMPT` | Judge | `services/judgePrompt.ts` | 5 | Template injecting question, answer, and context for evaluation |

## System Prompts Detail

### ExtractorAgent System Prompt (147 lines)
- **Clause type taxonomy**: 19 types (termination, payment, liability, confidentiality, non-compete, force-majeure, governing-law, indemnification, warranty, intellectual-property, dispute-resolution, employment-terms, probation, benefits, obligations, penalties, renewal, notice, other).
- **Few-shot examples**: English employment contract (3 clauses) + Arabic employment contract (3 clauses).
- **OCR Artifact Handling**: 6 rules for detecting and correcting scattered letters, split words, broken sentence boundaries, garbled punctuation, with the principle to preserve as-is when uncertain.
- Instructions to extract EXACT clause text, not summarize.

### RiskClassifierAgent System Prompt (42 lines)
- **Risk level definitions**: low (standard), medium (requires attention), high (highly restrictive), critical (illegal/void).
- **Bilingual output** required (AR + EN explanations).
- References **Egyptian Civil Code, Labor Law No. 12/2003, Data Protection Law No. 151/2020**.
- KB context integration instructions: align with reference risk level when available, rely on general MENA law training otherwise.

### RedlineAgent System Prompt (52 lines)
- **Mandatory bilingual disclaimer**: "These redline suggestions are for negotiation purposes only and do not constitute legal advice."
- **Balance & fairness** emphasis — avoid one-sided revisions.
- **Safer alternative integration**: When KB match is found, use it as template.
- **Bilingual output rules**: `suggestedText` matches contract language, `explanation` and `talkingPoints` in both AR and EN.

### Judge System Prompt (52 lines)
- **Rubric**: Each of the 4 metrics has a 5-level scoring guide.
- **Output schema**: JSON with `faithfulness`, `relevancy`, `precision`, `recall` (numbers 1-5) + `reasoning` object with per-metric strings.

## User Prompt Templates

| Template | Function | Builds Prompt With |
|----------|----------|-------------------|
| `buildExtractionUserPrompt()` | `extractor.prompts.ts:159` | Chunk context, language label, contract text |
| `buildClassificationUserPrompt()` | `riskClassifier.prompts.ts:66` | Clause text, type, language, optional KB reference + context |
| `buildRedlineUserPrompt()` | `redline.prompts.ts:66` | Clause text, type, risk level, language, optional safer alternative |
| `JUDGE_USER_PROMPT()` | `judgePrompt.ts:54` | Question, answer (exec summary), context (clause analyses) |

## Versioning Workflow

Prompts are managed through a **dual-source system** (`backend/src/services/prompt.service.ts`):

1. **Database (primary)**: MongoDB `AgentPrompt` collection stores the active prompt per agent. Fetched at runtime with a **60-second TTL cache**.
2. **Compiled-in fallbacks**: `.prompts.ts` constants (e.g., `EXTRACTOR_SYSTEM_PROMPT`) serve as defaults when the DB is unavailable or no override is set.

**Versioning flow**:
- Prompts are **Git-tracked** in the `.prompts.ts` files — every code review changes the compiled default.
- A **seed script** (`scripts/seedAgentPrompts.ts`) populates/updates the DB collection from the compiled defaults.
- To A/B test, update the DB record directly (via MongoDB or an admin endpoint). The cache expires in 60s.
- To roll back, restore the previous DB record or redeploy the previous Git version.

**DB schema** (`models/agentPrompt.model.ts`):
```typescript
{
  agent: "extractor" | "riskClassifier" | "redline",
  prompt: string,     // Full system prompt text
  updatedAt: Date     // Auto-managed
}
```

## Legacy Prompts (`backend/src/config/langchain.config.ts`)

An earlier iteration stored simpler prompts directly in the config file:
- `CONTRACT_ANALYSIS_SYSTEM_PROMPT`
- `EXTRACTION_SYSTEM_PROMPT`
- `RISK_CLASSIFICATION_SYSTEM_PROMPT`
- `REDLINE_SYSTEM_PROMPT`

These have been superseded by the prompts in `agents/*.prompts.ts` and the DB-driven `PromptService`. They remain in the config for reference but are no longer actively used by the pipeline.
