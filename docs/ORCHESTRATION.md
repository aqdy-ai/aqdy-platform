# AI Orchestration Architecture

## Overview

Aqdy uses a **Sequential Multi-Agent Pipeline** built with LangChain and a custom
orchestration layer. The pipeline chains three specialized agents to analyze contracts.

---

## Pipeline Architecture


User Upload (PDF/DOCX)

│

▼

┌─────────────────┐

│  Document       │

│  Parser         │  pdf.service.ts / docx.service.ts

│  (PDF/DOCX)     │

└────────┬────────┘

│ Raw Text

▼

┌─────────────────┐

│  Sanitization   │  security.middleware.ts

│  & PII Filter   │  piiFiltering.ts

└────────┬────────┘

│ Clean Text

▼

┌─────────────────────────────────────────────────────┐

│              OrchestratorService                     │

│         pipeline/orchestrator.service.ts             │

│                                                      │

│  ┌──────────────────────────────────────────────┐   │

│  │  Step 1: ExtractorAgent                      │   │

│  │  agents/extractor.agent.ts                   │   │

│  │                                              │   │

│  │  LangChain → Gemini 3.5 Flash               │   │

│  │  Input:  Raw contract text                   │   │

│  │  Output: [{clauseNumber, clauseText,         │   │

│  │            clauseType, confidence}]          │   │

│  └──────────────┬───────────────────────────────┘   │

│                 │ Extracted Clauses                  │

│                 ▼                                    │

│  ┌──────────────────────────────────────────────┐   │

│  │  Step 2: RiskClassifierAgent (per clause)    │   │

│  │  agents/riskClassifier.agent.ts              │   │

│  │                                              │   │

│  │  ┌─────────────────────────────────────┐    │   │

│  │  │  RAG Search (ragService)            │    │   │

│  │  │  services/rag.service.ts            │    │   │

│  │  │                                     │    │   │

│  │  │  1. Embed clause text               │    │   │

│  │  │  2. Search Pinecone vector DB       │    │   │

│  │  │  3. MMR Reranking                   │    │   │

│  │  │  4. Return top KB matches           │    │   │

│  │  └──────────────┬──────────────────────┘    │   │

│  │                 │ KB Context                 │   │

│  │                 ▼                            │   │

│  │  LangChain → Gemini 3.5 Flash               │   │

│  │  Input:  Clause + KB context                 │   │

│  │  Output: {riskLevel, explanation,            │   │

│  │           confidence, sourceFromKB}          │   │

│  └──────────────┬───────────────────────────────┘   │

│                 │ Risk Classifications               │

│                 ▼                                    │

│  ┌──────────────────────────────────────────────┐   │

│  │  Step 3: RedlineAgent (high-risk only)       │   │

│  │  agents/redline.agent.ts                     │   │

│  │                                              │   │

│  │  LangChain → Gemini 3.5 Flash               │   │

│  │  Input:  Risky clause + KB safer alternative │   │

│  │  Output: {suggestedText, explanation,        │   │

│  │           talkingPoints, confidence}         │   │

│  └──────────────┬───────────────────────────────┘   │

│                 │ Redlines                           │

└─────────────────┼───────────────────────────────────┘

│

▼

┌─────────────────────────────────────────────────────┐

│              AnalysisService                         │

│         services/analysis.service.ts                 │

│                                                      │

│  - Saves results to MongoDB (RiskAnalysis model)     │

│  - Writes ANALYSIS_COMPLETED audit log               │

│  - Updates Langfuse traces                           │

└─────────────────────────────────────────────────────┘

---

## LangChain Integration

### Models Used
| Agent | Primary Model | Fallback |
|-------|--------------|---------|
| Extractor | `gemini-3.5-flash` | `gemini-3.1-flash-lite` |
| RiskClassifier | `gemini-3.5-flash` | `gemini-3.1-flash-lite` |
| Redline | `gemini-3.5-flash` | `gemini-3.1-flash-lite` |

### LangChain Components
- **`@langchain/google-genai`** — Gemini model integration
- **`@langchain/core`** — BaseMessage, HumanMessage, SystemMessage
- **`@langfuse/langchain`** — Observability callbacks

### RAG Pipeline
- **Vector DB:** Pinecone
- **Embeddings:** OpenAI `text-embedding-3-small`
- **Retrieval:** Semantic search + MMR reranking
- **Knowledge Base:** `backend/src/data/legalKB.json`

---

## Error Handling & Resilience

- **Per-clause isolation:** One clause failing does NOT block others
- **Retry logic:** 3 attempts with exponential backoff (1s → 2s → 4s)
- **Model fallback:** Auto-switches to `gemini-3.1-flash-lite` if primary fails
- **Queue:** `AgentExecutionService` handles background job retry

---

## Observability

- **Langfuse** traces every LLM call with userId, contractId, token counts
- **Metrics service** tracks cost per analysis, latency, token usage
- **Anomaly detection:** Alerts on token spikes (>3x rolling avg) and latency (>5s)
