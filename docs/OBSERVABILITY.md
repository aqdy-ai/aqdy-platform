# Aqdy AI Observability

This document details the observability systems in place for the Aqdy AI platform, focusing on our integration with Langfuse for tracing, monitoring, and debugging LLM applications.

## Langfuse Integration

Langfuse is the core observability platform for Aqdy AI. It provides deep visibility into the execution of LLM-based workflows by tracing requests, measuring performance metrics, and logging metadata for every step of our pipelines.

Our application integrates with Langfuse via the `@langfuse/node` SDK in the backend service. Tracing is initialized at the start of complex operations (like agent orchestrations or RAG pipelines) to capture the full lifecycle of a user request.

### Traced Components

Langfuse tracing is instrumented across several key components of the Aqdy platform:

1. **LLM Calls (Generations):** Every request to an underlying LLM (e.g., OpenAI, Anthropic, or local models) is traced as a generation. We capture the prompt sent, the response received, model parameters (temperature, max tokens), and system prompts.
2. **RAG Retrievals:** The document retrieval process is traced to monitor search queries, the chunks retrieved from the vector database, and the similarity scores. This helps debug context relevancy issues.
3. **Agent Orchestration Steps:** Complex multi-step agent workflows are traced as spans within a larger trace. This includes planning, routing decisions, and condition evaluations.
4. **Tool Calls:** Execution of external tools or APIs by the agent is logged, including the input arguments provided to the tool and the resulting output or error.

### Logged Metadata

To enable powerful filtering, cost analysis, and correlation with user behavior, we enrich traces with the following metadata:

- **`userId`**: The unique identifier of the user making the request. Used to track user-specific usage and debug user-reported issues.
- **`model`**: The specific LLM model used for a generation (e.g., `gpt-4o`, `claude-3-opus-20240229`).
- **`tokens`**: Token usage breakdown (prompt tokens, completion tokens, total tokens) for each generation.
- **`latency`**: Execution time in milliseconds for each span and generation, as well as the overall request latency.
- **`hosting cost`**: Automatically calculated cost per generation based on token usage and the configured model pricing.
- **`contractId`**: The identifier for the specific legal contract or document being processed, allowing us to trace all operations related to a single document.

## Accessing and Using Langfuse Dashboards

Langfuse provides a web UI to explore the observability data.

1. **Accessing the Dashboard**: Log in to the Langfuse cloud or self-hosted instance using your team credentials.
2. **Traces View**: The core view where you can see all top-level requests. You can filter by `userId`, `contractId` (using metadata filters), date, or latency.
3. **Generations View**: Focuses specifically on LLM calls, useful for analyzing token usage, costs, and model latency across the platform.
4. **Analytics**: High-level dashboards showing cost trends, token usage over time, and average latencies.
5. **Prompt Management**: (If enabled) View and manage the prompt templates used in the application.

## Runbook: Tracing a Request and Correlate with Evaluation

Follow these steps to trace a specific user request and correlate it with its evaluation scores:

### Step 1: Identify the Trace
1. Obtain the `userId` or `contractId` associated with the problematic request.
2. Open the Langfuse dashboard and navigate to the **Traces** page.
3. Add a filter for `User ID = <userId>` or `Metadata.contractId = <contractId>`.
4. Locate the specific trace corresponding to the timestamp of the request.

### Step 2: Analyze the Trace
1. Click on the trace to view the detailed waterfall execution.
2. **Check Agent Routing:** Ensure the orchestrator selected the correct agent/tool path.
3. **Inspect RAG Retrieval:** Look at the "Retrieval" span. Did the search query make sense? Were the retrieved chunks relevant to the user's query?
4. **Analyze LLM Generation:** Look at the actual prompt sent to the LLM and its response. Was the context sufficient? Did the LLM hallucinate?

### Step 3: Correlate with Evaluation Scores
1. Within the same trace view in Langfuse, scroll to the **Scores** section (usually at the top or side of the trace details).
2. Look for automated metric scores (e.g., `context_precision`, `faithfulness`) attached to the trace or specific generations.
3. Look for human feedback scores (e.g., `user_feedback` = 1 or 0) indicating if the user thumbs-upped or thumbs-downed the response.
4. **Actionable Insight:** If `context_precision` is low, the retrieval step in the trace will likely show irrelevant chunks. If `faithfulness` is low but retrieval is good, the LLM prompt may need tuning to prevent hallucinations.
