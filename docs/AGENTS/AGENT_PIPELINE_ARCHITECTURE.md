# Backend Agent Pipeline Architecture

This document describes the backend contract analysis pipeline and how agents are orchestrated in `backend/src`.

## Overview

The backend analysis pipeline is designed as a resilient, queue-based workflow that separates request handling from long-running contract processing. It uses a lightweight execution queue to manage analysis jobs and a sequential orchestrator to chain specialized agents.

## Key components

- `backend/src/routes/upload.route.ts`
  - Receives contract upload requests.
  - Persists the uploaded contract.
  - Triggers async analysis with `analysisService.triggerAnalysis()`.

- `backend/src/services/analysis.service.ts`
  - Provides `triggerAnalysis()` for fire-and-forget analysis.
  - Uses `AgentExecutionService` to queue execution jobs.
  - Saves final analysis and audit logs when processing completes.

- `backend/src/pipeline/agentExecution.service.ts`
  - Implements an in-memory job queue.
  - Handles retries and retry delays.
  - Emits logging events for queued, completed, failed, and retried jobs.
  - Calls a final failure hook if a job exhausts retries.

- `backend/src/pipeline/orchestrator.service.ts`
  - Chains the agent steps for each contract analysis:
    1. `extractorAgent.extract()`
    2. `riskClassifierAgent.classify()`
    3. `redlineAgent.generate()`
  - Produces executive summary and clause-level analysis.
  - Keeps persistence separate from orchestration.

- `backend/src/agents/extractor.agent.ts`
  - Extracts structured clauses from raw contract text.
  - Supports Arabic and English text normalization.
  - Splits long contracts into chunks and merges clause outputs.
  - Uses `llmService` to call the LLM for extraction.

- `backend/src/agents/riskClassifier.agent.ts`
  - Classifies each clause risk level (`low`, `medium`, `high`, `critical`).
  - Optionally enriches classification with RAG context from `ragService.searchKB()`.
  - Uses `llmService` to call the LLM for classification.

- `backend/src/agents/redline.agent.ts`
  - Generates redline suggestions for risky clauses.
  - Uses LLM-generated output to recommend safer contract language.

- `backend/src/services/rag.service.ts`
  - Executes semantic search against the legal knowledge base.
  - Supports Pinecone integrated inference + MMR reranking.
  - Returns match metadata and confidence scores.

- `backend/src/services/llm.service.ts`
  - Wraps Gemini calls with retry and fallback logic.
  - Primary model: `gemini-3.5-flash`.
  - Fallback model: `gemini-3.1-flash-lite`.

## Data flow

1. User uploads a contract via `/api/upload`.
2. The upload route persists the contract and calls `analysisService.triggerAnalysis()`.
3. `AgentExecutionService.enqueue()` queues the analysis job.
4. The queue processes jobs sequentially and invokes `analysisService.executeAnalysisAttempt()`.
5. `OrchestratorService.run()` executes the agent pipeline:
   - `ExtractorAgent` extracts clauses.
   - For each clause, `RiskClassifierAgent` classifies risk.
   - Risky clauses also pass through `RedlineAgent`.
6. The analysis result is saved to MongoDB and audit logs are created.

## Resilience and observability

- The pipeline is built for fault tolerance:
  - the queue retries transient failures,
  - a final failure hook logs unrecoverable errors,
  - individual clause failures do not abort the full analysis.

- Timing and telemetry are available in logs and metrics:
  - response-time middleware logs HTTP performance,
  - agent-level duration metrics are exposed via the metrics system.

## Extension points

- Add new agents by importing them into `OrchestratorService` and extending the step sequence.
- Enhance RAG behavior by updating `ragService.searchKB()`.
- Add persistence of additional clause metadata in `riskAnalysis.model.ts`.

## File map

- `backend/src/routes/upload.route.ts`
- `backend/src/services/analysis.service.ts`
- `backend/src/pipeline/agentExecution.service.ts`
- `backend/src/pipeline/orchestrator.service.ts`
- `backend/src/agents/extractor.agent.ts`
- `backend/src/agents/riskClassifier.agent.ts`
- `backend/src/agents/redline.agent.ts`
- `backend/src/services/rag.service.ts`
- `backend/src/services/llm.service.ts`
- `backend/src/models/riskAnalysis.model.ts`
- `backend/src/utils/metrics.ts`
