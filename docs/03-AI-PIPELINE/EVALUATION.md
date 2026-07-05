# AI Evaluation

> Quality metrics, LLM-as-a-Judge, and human feedback loops.

## Four Quality Metrics

Each scored on a **1–5 scale** (5 = best) by an LLM judge:

| Metric | Definition | What It Measures |
|--------|-----------|------------------|
| **Faithfulness** | Is the risk assessment grounded in the clause text? | Hallucination detection |
| **Answer Relevancy** | Does the redline suggestion address the identified risk? | Redline quality |
| **Context Precision** | Did the RAG retrieval return relevant KB matches? | RAG relevance |
| **Context Recall** | Did the retrieval capture all relevant KB content? | RAG completeness |

**Judge rubrics** (`backend/src/services/judgePrompt.ts`):
- Each metric has a detailed 5-level rubric.
- The judge also outputs `reasoning` strings justifying each score.

## Automated Evaluation Pipeline (LLM-as-a-Judge)

**Triggered**: Fire-and-forget after each analysis completes (in `analysis.worker.ts`).

**Flow**:
1. Analysis result saved to MongoDB → `judgeService.evaluateAnalysis()` called.
2. Judge constructs prompts with:
   - **Question**: "Evaluate the quality of this contract analysis."
   - **Answer**: Executive summary (overall risk, clause counts).
   - **Context**: All clause analyses (type, risk level, confidence, KB source, text, redline).
3. LLM (GPT-4o with Gemini fallback, `temperature: 0`) scores 4 metrics and returns JSON.
4. Scores and reasoning stored in MongoDB `Evaluation` collection.
5. Scores also sent to **Langfuse** as custom named scores (`faithfulness`, `relevancy`, `precision`, `recall`) for dashboarding.

**Location**: `backend/src/services/judge.service.ts` (132 lines), `backend/src/services/judgePrompt.ts` (59 lines).

## Score Storage in Langfuse

- Each evaluation creates a Langfuse trace with:
  - Trace name: `Analysis Evaluation <analysisId>`
  - Metadata: `analysisId`, `overallRisk`, `totalClauses`.
  - 4 custom scores per trace linked to the evaluation.
- LangChain `CallbackHandler` (from `@langfuse/langchain`) automatically captures LLM call metrics (duration, model, token estimates, cost).
- Additional manual traces via `langfuse.tracing.ts` for agent-level spans.
- Flush interval: 10s; skipped in test environment.

## Dashboard for Tracking Metric Trends

**Admin API endpoints** (`backend/src/controllers/evaluation.controller.ts`):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/evaluation/stats` | GET | Aggregated daily averages for all 4 metrics (last 30 days default) |
| `/evaluation/low-scores` | GET | Retrieves evaluations where any metric < 3 |
| `/evaluation/re-evaluate/:analysisId` | POST | Triggers re-evaluation of a specific analysis |
| `/evaluation/backfill` | POST | Evaluates all analyses that don't yet have evaluations |

**Metrics dashboard** (`backend/src/services/metrics.service.ts`):
- In-memory history of last 1000 analyses with token usage, cost, latency.
- **Anomaly detection**:
  - Token spikes > 3x rolling average.
  - Latency > 5 seconds.
  - Error rate > 5% in 5-minute window.
- Summary endpoint returning analyses count (today/week/month), avg latency, total tokens & cost, alert thresholds.

**Admin endpoints** are role-protected (requires admin role).

## Human Feedback (Thumbs Up/Down, Report Issue)

Human feedback is tracked at the analysis level in the database. The `RiskAnalysis` model records:
- `riskLevel`, `clauseAnalysis`, `version`, `diffSummary`.

Users can re-upload a contract to trigger a new analysis version, enabling diff comparison. A versioning system (`contractId + version` unique index) supports tracking improvements over time.

Low-scoring evaluations (`< 3` on any metric) are surfaced via the `/evaluation/low-scores` admin endpoint for manual review and model/prompt iteration.

## Evaluation Data Model (`backend/src/models/evaluation.model.ts`)

```typescript
{
  analysisId: ObjectId,       // ref → RiskAnalysis
  traceId: string,            // Langfuse trace ID
  faithfulness: number,       // 1-5
  relevancy: number,          // 1-5
  precision: number,          // 1-5
  recall: number,             // 1-5
  reasoning: {
    faithfulness?: string,
    relevancy?: string,
    precision?: string,
    recall?: string,
    overall?: string
  },
  createdAt: Date
}
```
