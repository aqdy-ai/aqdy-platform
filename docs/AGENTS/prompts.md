# Prompt Library & Engineering Guidelines

This document details the prompt designs, structured output patterns, and bilingual instruction rules for the `aqdy-platform` multi-agent pipeline.

---

## 1. Extractor Prompt Design (`backend/src/agents/extractor.prompts.ts`)

- **Role**: Structured Clause Extractor.
- **System Instructions**:
  - Focus exclusively on identifying formal contract clauses (e.g., Termination, Liability, Payment, Confidentiality).
  - Return a clean JSON array of clause objects without any conversational text or markdown code-blocks.
- **Language Detection & Bilingual Rules**:
  - Automatically identifies whether the chunk is predominantly Arabic or English.
  - Keeps the extracted clause text in the contract's original language to preserve legal authenticity.
- **Output Schema**:
  ```json
  [
    {
      "clauseNumber": 1,
      "clauseText": "...",
      "clauseType": "..."
    }
  ]
  ```

---

## 2. Risk Classifier Prompt Design (`backend/src/agents/riskClassifier.prompts.ts`)

- **Role**: Legal Risk Analysis Assistant.
- **System Instructions**:
  - Classifies clauses into: `low`, `medium`, `high`, or `critical`.
  - Integrates RAG (Knowledge Base context) if a vector database match is provided.
  - Requires a bilingual explanation in both Arabic and English.
- **Output Schema**:
  ```json
  {
    "riskLevel": "low" | "medium" | "high" | "critical",
    "explanation": {
      "ar": "شرح باللغة العربية...",
      "en": "English explanation..."
    },
    "confidence": 0.85
  }
  ```

---

## 3. Redline Suggestion Prompt Design (`backend/src/agents/redline.prompts.ts`)

- **Role**: Contract Negotiation and Redlining Expert.
- **System Instructions**:
  - **Balanced Revisions**: Revisions must represent commercially fair compromises rather than extreme protection to remain highly negotiable.
  - **Required Disclaimer**: Every generated suggestion is strictly educational and must include the explicit bilingual disclaimer clarifying it is *not legal advice*.
  - **KB Alternative Matching**: Prioritizes the provided KB safer alternative as the drafting template.
  - **Bilingual Output Rules**:
    - `suggestedText` must be drafted in the language of the contract (Arabic clauses get Arabic redlines; English clauses get English redlines).
    - `explanation` and `talkingPoints` must always be provided in both Arabic and English.
- **Output Schema**:
  ```json
  {
    "suggestedText": "The modified clause text in the contract's language.",
    "explanation": {
      "ar": "شرح التعديلات...",
      "en": "Explanation of changes..."
    },
    "talkingPoints": {
      "ar": ["نقطة تفاوضية 1", "نقطة تفاوضية 2"],
      "en": ["Negotiation point 1", "Negotiation point 2"]
    },
    "confidence": 0.90
  }
  ```

---

## 4. Model Configurations & Fallbacks

All agent calls leverage the `llmService` which automatically routes calls to the most optimized models:
- **Primary Model**: `gemini-3.5-flash` — configured with `temperature: 0.1` (deterministic) for extraction and classification, and `temperature: 0.2` for redlining.
- **Fallback Model**: `gemini-3.1-flash-lite` — triggered transparently if the primary model encounters rate limits or service disruptions.
