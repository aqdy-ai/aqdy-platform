# Model Selection Rationale

> Foundation model choices, fallback strategy, and cost trade-offs.

## Primary Model: OpenAI GPT-4o

- **Used for**: All three agent calls (extraction, classification, redline generation) and the LLM-as-a-Judge evaluation.
- **Rationale**: Best-in-class instruction following, structured JSON output reliability, and strong bilingual (EN/AR) performance.
- **Configuration**: `temperature: 0.1` (agents), `temperature: 0` (judge), `maxTokens: 4096` (default), `maxRetries: 0` (manual retry handling).
- **API**: `@langchain/openai` via `ChatOpenAI`.

## Fallback Model: Google Gemini 3.1 Flash Lite

- **Used for**: Automatic fallback when GPT-4o exhausts all 3 retries or hits quota errors. Also used directly for RAG query expansion.
- **Rationale**: 1M token context window, extremely low cost, good Arabic support, and no quota coupling with OpenAI.
- **Configuration**: `temperature: 0.1`, `maxOutputTokens: 4096`.
- **API**: `@langchain/google-genai` via `ChatGoogleGenerativeAI`.

## Direct Gemini Wrapper (`gemini.wrapper.ts`)

- Uses `gemini-1.5-pro` via direct REST call (not through llmService) for specific fallback scenarios in RAG query expansion.

## Fallback Chain (`llm.service.ts`)

```
call()
  → GPT-4o (up to 3 retries with 1s exponential backoff)
  → if all fail → Gemini 3.1 Flash Lite (up to 3 retries)
  → if all fail → throw "All LLM providers failed"
```

- Quota errors on GPT-4o trigger **immediate** fallback to Gemini (skip remaining retries).
- Separate methods: `callPrimary()` (GPT-4o only, no fallback) and `callFallback()` (Gemini only, no fallback chain).

## Cost Per-Token Analysis

Model pricing from `metrics.service.ts`:

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------:|-----------------------:|
| gpt-4o | $2.50 | $10.00 |
| gemini-3.5-flash | $0.075 | $0.30 |
| gemini-3.1-flash-lite | $0.0375 | $0.15 |

- GPT-4o is ~33x more expensive for input and ~33x for output than Gemini 3.1 Flash Lite.
- The fallback strategy ensures cost control during peak usage. In practice, >95% of calls use GPT-4o.
- Token estimation uses a simple heuristic: `input = text.length / 4`, `output = text.length / 8`.
- Cost is tracked per analysis in the `MetricsService` and sent to Langfuse.

## Why Not Open-Source Alternatives

- **Latency**: Self-hosted models (LLaMA, Mistral, Qwen) require GPU infrastructure and add cold-start latency unacceptable for a real-time API.
- **Quality**: Our benchmarks showed open-weight models struggle with structured JSON output, Arabic legal nuance, and few-shot compliance compared to GPT-4o.
- **Operational overhead**: Managed APIs (OpenAI, Gemini) eliminate GPU scaling, model versioning, and PII compliance burdens.
- **Arabic bilingual strength**: GPT-4o and Gemini 3.1 Flash Lite both demonstrate strong Arabic legal text handling, which smaller open models lack.
