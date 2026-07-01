# Langfuse Integration Guide 📊

This document details the configuration and SDK hooks used to integrate the Aqdy backend with **Langfuse** for end-to-end trace collection and cost monitoring.

---

## ⚙️ Configuration & Credentials

The backend application integrates with Langfuse via the `@langfuse/node` SDK. 

### 1. Environment Variables
Add the following keys to your local `backend/.env` file:
```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...      # Your project public key
LANGFUSE_SECRET_KEY=sk-lf-...      # Your project secret key
LANGFUSE_URL=https://cloud.langfuse.com
```

### 2. Global Initialization
The client is initialized in `backend/src/config/langfuse.config.ts`:
*   Validates the existence of credentials.
*   Instantiates the global `Langfuse` client.
*   Exposes a helper to construct LangChain callback handlers (`CallbackHandler`) to automatically trace agent loops.

---

## 🎯 Instrumenting Traces

### A. Wrapping Native Agent Spans
For custom operations (like parsing or text chunking), wrapper blocks are initialized using trace objects.

```typescript
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse();

async function traceChunking(text: string, contractId: string) {
  const trace = langfuse.trace({
    name: 'contract-chunking',
    metadata: { contractId }
  });
  
  const span = trace.span({ name: 'text-splitting' });
  try {
    // Perform text splitting logic here
    span.end({ output: 'Successfully split into 12 chunks' });
  } catch (error) {
    span.end({ output: error.message, level: 'ERROR' });
  }
}
```

### B. Binding LangChain Callbacks
For LangChain pipelines (such as our `ChatGoogleGenerativeAI` wrapper), the Langfuse `CallbackHandler` is passed directly in the option params:

```typescript
import { CallbackHandler } from 'langfuse-langchain';

const handler = new CallbackHandler({
  userId: userId,
  traceName: 'contract-analysis',
  metadata: { contractId }
});

const response = await model.invoke(prompt, { callbacks: [handler] });
```

---

## 🏷️ Standard Telemetry Fields

Every trace pushed to Langfuse includes these standard metadata properties to allow for easy filtering and audit capabilities:

*   **`userId`**: Matches the user ID in the MongoDB `users` collection.
*   **`contractId`**: Matches the ID of the contract object in MongoDB, making it easy to audit all traces for a specific document.
*   **`model`**: Captures the exact LLM version string used (e.g. `gemini-1.5-flash` or `gemini-1.5-pro`).
*   **`tokens`**: Captures prompt, completion, and total token count values returned by the model provider.
*   **`latency`**: Measured elapsed millisecond duration between the query start and target API response return.
*   **`cost`**: Calculated by Langfuse automatically using the token usage and the configured model cost schedules.
