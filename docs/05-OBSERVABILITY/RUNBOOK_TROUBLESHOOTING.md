# Runbook & Troubleshooting Guide 📊

This document provides a step-by-step developer runbook to trace requests, debug slow/failed operations, and analyze LLM outputs using the **Langfuse** dashboard.

---

## 🔍 Step-by-Step Request Tracing

When a user reports a slow request, a failed analysis, or a bad chat response, use these steps to isolate the issue:

### Step 1: Locate the Trace
1.  Obtain the `userId` or `contractId` associated with the problematic request (usually found in the developer tools network log or frontend console).
2.  Open the [Langfuse Dashboard](https://cloud.langfuse.com).
3.  Navigate to the **Traces** tab on the left sidebar.
4.  Apply a metadata filter:
    *   `User ID = <userId>`
    *   `Metadata.contractId = <contractId>`
5.  Match the timestamp of the event to select the correct trace from the list.

### Step 2: Analyze the Waterfall
Click on the trace to view the full waterfall structure:
*   **Root Span**: Inspect the overall latency of the request.
*   **RAG Retrieval (Pinecone)**: Look at the retrieval step. Verify the query text and check the similarity score of returned clauses. If scores are under `0.70`, the retriever might have failed to locate the correct context.
*   **Agent Routing**: Check the orchestrator spans. Verify whether the request was correctly routed to the correct agent (e.g. `ExtractorAgent`, `RiskClassifierAgent`, or `RedlineAgent`).
*   **LLM Generation**: Select the Generation node to view:
    *   The exact system instruction and user prompts passed.
    *   The raw JSON string returned by the model.
    *   Token consumption counts and cost details.

---

## 📈 Correlating with Evaluations & Feedback

We track model quality using automated metrics and manual user reactions.

### 1. Automated Quality Metrics
Within the trace or span detail panel, check the **Scores** section:
*   **Faithfulness (Groundedness)**: Assesses if the LLM output is supported strictly by the vector context. A low score suggests hallucination.
*   **Context Precision**: Assesses if the retrieved document chunks are relevant to the query. A low score suggests search issues.

### 2. User Feedback Loops
When users click the Thumbs Up or Thumbs Down icons on risk analyses or chats:
*   An event is pushed to Langfuse via the SDK, registering as a score (e.g., `user_feedback = 1` or `user_feedback = 0`).
*   **Filtering**: Filter the traces table by `user_feedback = 0` to discover and analyze bad responses.

---

## 🛠️ Common Errors & Troubleshooting

### 1. Missing Traces in Dashboard
*   **Symptom**: Requests complete successfully locally, but no data appears in the Langfuse dashboard.
*   **Solution**:
    1.  Verify that `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are correct in `backend/.env`.
    2.  Check startup logs for: `✓ Langfuse client initialized`.
    3.  Confirm the host machine can reach `https://cloud.langfuse.com` (check firewall/DNS restrictions).

### 2. High Latency or Timeouts
*   **Symptom**: The contract analysis step exceeds 10 seconds or fails with gateway timeouts.
*   **Solution**:
    1.  Open the trace waterfall and find the longest span.
    2.  If the delay is in **RAG Retrieval**, check Pinecone index status and connection latency.
    3.  If the delay is in **LLM Generation**, check for rate limits or model latency spikes on the Google AI Studio console. Consider using fallback models.
