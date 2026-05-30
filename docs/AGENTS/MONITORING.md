# Monitoring Setup Guide

This guide explains how to set up monitoring and observability for the Aqdy backend agent pipeline. It focuses on the existing Langfuse tracing integration, runtime health checks, and recommended dashboards/alerts for production readiness.

## 1. Monitoring Goals

- Track agent execution health across the contract analysis pipeline.
- Monitor performance and latency for extraction, classification, and redline generation.
- Detect failures, retries, and degraded model or vector retrieval behavior.
- Correlate contract analysis requests with user/session metadata.
- Use alerting for high error rates, slow pipelines, or abnormal request volume.

## 2. Architecture Overview

### Key components

- `backend/src/index.ts`
  - Application entrypoint
  - Initializes services and observability integrations

- `backend/src/services/langfuse.tracing.ts`
  - Wraps agent execution with trace metadata
  - Captures durations, errors, and structured payloads

- `backend/src/pipeline/orchestrator.service.ts`
  - Coordinates the multi-agent pipeline
  - Emits pipeline-level metrics and status

- `backend/src/services/agentExecution.service.ts`
  - Manages execution and retries for agent workflows
  - Records audit and metrics events

### Observability flow

1. Request enters the backend via API.
2. `OrchestratorService` runs the `ExtractorAgent`, `RiskClassifierAgent`, and `RedlineAgent`.
3. Each agent execution is wrapped by `traceAgent()`.
4. Langfuse receives traces with:
   - agent name
   - contract ID
   - user ID
   - clause metadata
   - execution duration
   - success/failure state
5. Runtime logs and Langfuse traces provide the monitoring foundation.

## 3. Required Environment Configuration

Create or update `backend/.env` with the following monitoring-related variables:

- `LANGFUSE_URL` — Langfuse ingest endpoint
- `LANGFUSE_PUBLIC_KEY` — Langfuse public API key
- `LANGFUSE_SECRET_KEY` — Langfuse secret key
- `NODE_ENV` — `development`, `production`, or `test`

If you are using Docker or Docker Compose, ensure these values are mapped into the `backend` container environment.

## 4. Langfuse Setup Steps

### 4.1 Create a Langfuse account

- Sign up at the Langfuse console.
- Create a new workspace for the Aqdy platform.
- Generate a public key and a secret key.

### 4.2 Configure the backend

- Place keys in `backend/.env`.
- Restart the backend server.
- Verify that the backend starts without environment validation errors.

### 4.3 Confirm trace delivery

- Trigger a contract analysis request from the frontend or API.
- Check Langfuse for newly arriving traces.
- Verify trace fields such as:
  - `agentName`
  - `contractId`
  - `userId`
  - `language`
  - `durationMs`
  - `status`

## 5. Recommended Monitoring Dashboards

Create dashboards that cover the following areas:

### 5.1 Agent Health Overview

- Total agent calls over time
- Success vs failure count
- Error percentage per agent
- Top failing agent names

### 5.2 Performance & Latency

- Average duration by agent
- 95th percentile latency for `ExtractorAgent`, `RiskClassifierAgent`, and `RedlineAgent`
- Total pipeline duration per request
- Response time distribution for contract analysis endpoints

### 5.3 Throughput and Load

- Contract analysis request rate
- Concurrent active sessions / requests
- Vector DB retrieval counts and latencies
- LLM request counts

### 5.4 Error and Retry Monitoring

- Failed contract analyses
- Retry events and retry count distribution
- Frequent error messages or exception classes
- Alerts on spike in `ANALYSIS_FAILED` or agent failure rates

## 6. Alerting Recommendations

Configure alerts for critical production conditions:

- **Pipeline failure rate > 2%** over 5 minutes
- **Average contract analysis latency > 10s**
- **Agent execution error count spike** for any agent
- **Langfuse trace ingestion failure** or missing traces for a sustained period
- **Vector retrieval latency > expected threshold** (if available)

## 7. Local Validation and Troubleshooting

### 7.1 Local validation

- Run `npm run dev` in `backend/`.
- Execute API requests against `http://localhost:5000`.
- Confirm that trace data appears in Langfuse.
- Use application logs to verify successful agent execution and trace flush.

### 7.2 Troubleshooting

- If traces do not appear:
  - Verify `LANGFUSE_URL`, `LANGFUSE_PUBLIC_KEY`, and `LANGFUSE_SECRET_KEY` are correct.
  - Confirm network access to the Langfuse endpoint.
  - Check backend logs for trace upload or client initialization errors.

- If agent failures are high:
  - Review the `OrchestratorService` error handling path.
  - Inspect `traceAgent()` payloads for invalid model responses.
  - Validate that the LLM provider key (`GEMINI_API_KEY`) and vector DB settings are healthy.

## 8. Next Steps

- Add custom dashboards tuned to your contract workload.
- Use Langfuse queries to filter by contract, user, or clause type.
- Correlate monitoring data with frontend user actions and upload request metadata.
- Expand monitoring to include database, host, and API-level metrics if you add infrastructure observability.
