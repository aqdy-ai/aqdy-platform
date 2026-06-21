# Agent Catalog

This catalog documents the active agents in the Aqdy contract analysis pipeline, their core capabilities, models, and verified features.

---

## 1. ExtractorAgent

- **File**: [`backend/src/agents/extractor.agent.ts`](file:///d:/iti/0%20Final%20Project/aqdy/aqdy-platform/backend/src/agents/extractor.agent.ts)
- **Role**: Parses raw contract document text into categorized and structured clauses.
- **Core Technology**: `gpt-4o` (Primary) / `gemini-3.1-flash-lite` (Fallback) + Zod-validated schemas.
- **Bilingual Capabilities**: Arabic & English support, automatic language detection.
- **OCR Resilience (Confirmed Capability)**:
  - **Artifact Correction**: Automatically detects and repairs common OCR anomalies in scanned text (e.g., scattered letters, split words, broken lines, garbled punctuation) using contextual inference.
  - **High Confidence Rule**: Rectifies OCR artifacts only when the context permits high-confidence inference. Does not introduce speculative/assumed legal text.
  - **Meaning Preservation**: Strictly preserves clean, undamaged contract text exactly as written. Never rewrites, paraphrases, modernizes, or "improves" correct legal content.

---

## 2. RiskClassifierAgent

- **File**: [`backend/src/agents/riskClassifier.agent.ts`](file:///d:/iti/0%20Final%20Project/aqdy/aqdy-platform/backend/src/agents/riskClassifier.agent.ts)
- **Role**: Evaluates extracted clauses for compliance risks.
- **Core Technology**: `gpt-4o` / Pinecone Multilingual RAG.
- **Risk Levels**: `low`, `medium`, `high`, `critical`.
- **Output**: Bilingual justifications referencing relevant Egyptian/MENA legal codes.

---

## 3. RedlineAgent

- **File**: [`backend/src/agents/redline.agent.ts`](file:///d:/iti/0%20Final%20Project/aqdy/aqdy-platform/backend/src/agents/redline.agent.ts)
- **Role**: Recommends commercially fair and negotiable alternative clause text.
- **Core Technology**: `gpt-4o`.
- **Output**: Fully redlined clause in original language, plus bilingual talking points and legal disclaimer.
