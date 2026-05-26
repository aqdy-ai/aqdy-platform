# LLM Setup — Aqdy Platform

> This document describes the LLM infrastructure powering the Aqdy contract-analysis backend.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Model Selection](#model-selection)
3. [Configuration](#configuration)
4. [Service Layer](#service-layer)
5. [Retry & Fallback Strategy](#retry--fallback-strategy)
6. [Gemini Wrapper](#gemini-wrapper)
7. [LangChain Config & Prompt Templates](#langchain-config--prompt-templates)
8. [Running Tests](#running-tests)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Express Routes                        │
│  POST /api/contracts/upload  │  POST /api/analysis/analyze│
└────────────────┬─────────────┴────────────────┬──────────┘
                 │                              │
                 ▼                              ▼
        ┌────────────────┐            ┌──────────────────┐
        │  Contract       │            │  Analysis         │
        │  Controller     │            │  Controller       │
        └────────────────┘            └──────┬───────────┘
                                             │
                                             ▼
                               ┌──────────────────────────┐
                               │  LLM Service (Week 2)     │
                               │  llm.service.ts           │
                               │                           │
                               │  ┌─────────────────────┐  │
                               │  │ Gemini 3.5 Flash (Pr)│  │
                               │  └──────┬──────────────┘  │
                               │         │ fallback         │
                               │  ┌──────▼──────────────┐  │
                               │  │ Gemini 3.1 Flash Lite│  │
                               │  └─────────────────────┘  │
                               └──────────────────────────┘
                                             │
                               ┌─────────────▼────────────┐
                               │  @langchain/google-genai   │
                               │  (Google Generative AI)    │
                               └───────────────────────────┘
```

The stack uses **LangChain JS** as the orchestration framework with **Google Generative AI** (`@langchain/google-genai`) as the LLM provider.

---

## Model Selection

| Model | ID | Parameters | Role | Use Case |
|---|---|---|---|---|
| **Gemini 3.5 Flash** | `gemini-3.5-flash` | - | Primary | Complex clause analysis, risk classification, redline generation |
| **Gemini 3.1 Flash Lite** | `gemini-3.1-flash-lite` | - | Fallback | Lighter tasks, faster responses, automatic fallback |

### Why Gemini?

- **1M context window** — handles full contracts without chunking
- **Multilingual** — strong Arabic + English support (critical for MENA contracts)
- **State-of-the-Art Speed & Quality** — extremely fast execution times with precise output formatting
- **Free tier** — available through Google AI Studio at no cost during development

---

## Configuration

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key | ✅ |
| `PINECONE_API_KEY` | Pinecone vector DB key (for RAG in Week 3) | ✅ |
| `PINECONE_INDEX` | Pinecone index name | ✅ |
| `LANGFUSE_SECRET_KEY` | Langfuse observability secret | ✅ |
| `LANGFUSE_PUBLIC_KEY` | Langfuse observability public key | ✅ |

All environment variables are validated at startup using **Zod** in [`backend/src/config/env.ts`](../../backend/src/config/env.ts). If any required variable is missing, the process exits with a descriptive error.

### Files

| File | Purpose |
|---|---|
| `src/config/env.ts` | Zod-validated environment variables |
| `src/config/langchain.config.ts` | Shared model instances, prompt templates, chain builder |
| `src/services/llm.service.ts` | High-level LLM service with retry + fallback |
| `src/services/gemini.wrapper.ts` | Direct Gemini wrapper (no retry/fallback) |

---

## Service Layer

### `llm.service.ts` — Public API

The main service exposes three methods:

#### `llmService.call(prompt, options?)` → `LLMResponse`

The **recommended method for all agents**. Tries the primary model (Gemini 3.5 Flash) with 3 retries, then automatically falls back to the fallback model (Gemini 3.1 Flash Lite) with 3 more retries.

```typescript
const response = await llmService.call("Analyze this contract clause", {
  systemPrompt: "You are a legal risk classifier",
  temperature: 0.1,
  maxTokens: 4096,
});

console.log(response.content);      // LLM output string
console.log(response.model);        // "gemini-3.5-flash" or "gemini-3.1-flash-lite"
console.log(response.usedFallback); // true if primary failed
```

#### `llmService.callPrimary(prompt, options?)` → `LLMResponse`

Calls Gemini 3.5 Flash directly — **no fallback**. Use when you specifically need the larger model.

#### `llmService.callFallback(prompt, options?)` → `LLMResponse`

Calls Gemini 3.1 Flash Lite directly. Use for lighter tasks where speed matters.

### Options

```typescript
interface LLMRequestOptions {
  systemPrompt?: string;   // System instruction for the model
  temperature?: number;    // 0.0–1.0 (default: 0.1)
  maxTokens?: number;      // Max output tokens (default: 4096)
}
```

---

## Retry & Fallback Strategy

```
Primary (gemini-3.5-flash)
  ├── Attempt 1 → success? return
  ├── Attempt 2 (wait 1s) → success? return
  └── Attempt 3 (wait 2s) → success? return
        │
        ▼ (all 3 failed)
Fallback (gemini-3.1-flash-lite)
  ├── Attempt 1 → success? return
  ├── Attempt 2 (wait 1s) → success? return
  └── Attempt 3 (wait 2s) → success? return
        │
        ▼ (all 6 failed)
throw Error("All LLM providers failed")
```

- **Max retries per model**: 3
- **Backoff**: Exponential — 1s → 2s → 4s
- **Total max attempts**: 6 (3 primary + 3 fallback)

---

## Gemini Wrapper

[`backend/src/services/gemini.wrapper.ts`](../../backend/src/services/gemini.wrapper.ts) provides a **thin, direct wrapper** around the `gemini-1.5-pro` model without any retry or fallback logic:

```typescript
import { geminiWrapper } from "./services/gemini.wrapper.js";

const result = await geminiWrapper.call("Summarize this clause", {
  systemPrompt: "Be concise",
  temperature: 0.3,
  maxOutputTokens: 1024,
});
```

Use this wrapper when you need direct Gemini access outside the Gemma pipeline.

---

## LangChain Config & Prompt Templates

[`backend/src/config/langchain.config.ts`](../../backend/src/config/langchain.config.ts) provides:

### Shared Model Instances

- `geminiPrimary` — pre-configured `ChatGoogleGenerativeAI` for Gemini 3.5 Flash
- `geminiFallback` — pre-configured `ChatGoogleGenerativeAI` for Gemini 3.1 Flash Lite

### Chain Builder

```typescript
import { buildChain } from "./config/langchain.config.js";

const chain = buildChain(EXTRACTION_SYSTEM_PROMPT);
const result = await chain.invoke({ input: contractText });
```

Builds a `prompt → model → StringOutputParser` pipeline using `RunnableSequence`.

### Prompt Templates

| Template | Purpose |
|---|---|
| `CONTRACT_ANALYSIS_SYSTEM_PROMPT` | General contract analysis (risk ID, explanations, alternatives) |
| `EXTRACTION_SYSTEM_PROMPT` | Clause extraction → JSON array |
| `RISK_CLASSIFICATION_SYSTEM_PROMPT` | Clause risk level classification → JSON array |
| `REDLINE_SYSTEM_PROMPT` | Safer clause alternatives + negotiation tips → JSON |

All prompts instruct the model to respond in the same language as the contract (Arabic/English).

---

## Running Tests

```bash
# Run all tests
npm test

# Run only LLM-related tests
npm test -- --testPathPattern="services/"

# Run with coverage
npm run test:coverage
```

### What the Tests Cover

| Test File | Tests |
|---|---|
| `tests/services/llmService.test.ts` | Primary success, retry logic, fallback chain, total failure, callPrimary, callFallback, options forwarding, non-string response |
| `tests/services/geminiWrapper.test.ts` | Successful call, options forwarding, non-string error, error propagation |

All tests use **mocked** `@langchain/google-genai` — no real API calls are made.

---

## Troubleshooting

### `❌ Invalid environment variables` on startup

The Zod schema in `src/config/env.ts` is strict. Make sure your `.env` file has **all** required keys:

```env
GEMINI_API_KEY=your_key_here
PINECONE_API_KEY=your_key
PINECONE_INDEX=aqdy
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
JWT_SECRET=your_jwt_secret
MONGODB_URI=mongodb://localhost:27017/aqdy
```

### `All LLM providers failed` error

Both Gemini models exhausted all retries. Common causes:
1. **Invalid API key** — check `GEMINI_API_KEY`
2. **Rate limiting** — the exponential backoff handles transient limits, but sustained overload will fail
3. **Model unavailable** — Google may temporarily disable models; check [Google AI Studio](https://aistudio.google.com/)

### Tests failing with `Cannot find module`

Ensure you're running tests with the ESM flag:

```bash
cross-env NODE_OPTIONS=--experimental-vm-modules jest
```

This is already configured in `package.json` → `scripts.test`.

### `Unexpected non-string response from LLM/Gemini`

The LangChain `ChatGoogleGenerativeAI.invoke()` can return complex message types. Both the LLM service and Gemini wrapper guard against this and throw a descriptive error. If this happens in production, it likely means the model returned a multi-part response — try reducing `maxTokens` or simplifying the prompt.
