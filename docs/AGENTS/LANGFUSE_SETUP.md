# Langfuse Setup & Integration Guide

## Overview

This guide covers the complete setup and integration of Langfuse observability for the Aqdy platform backend. Langfuse provides LLM observability, tracing, and analytics for all agent executions.

## Table of Contents

1. [Langfuse Account Setup](#langfuse-account-setup)
2. [Environment Configuration](#environment-configuration)
3. [Agent Tracing](#agent-tracing)
4. [Dashboard & Monitoring](#dashboard--monitoring)
5. [Troubleshooting](#troubleshooting)

---

## Langfuse Account Setup

### 1. Create a Langfuse Account

Visit [cloud.langfuse.com](https://cloud.langfuse.com) and create a free account.

### 2. Create a Project

1. Log in to Langfuse
2. Click "Create new project"
3. Name it: `aqdy-platform` (or your preferred name)
4. Select your region (EU, US, etc.)

### 3. Generate API Keys

1. Go to **Settings** → **API Keys**
2. Click "Create new API key"
3. You'll receive:
   - **Public Key** (LANGFUSE_PUBLIC_KEY)
   - **Secret Key** (LANGFUSE_SECRET_KEY)

⚠️ **Important**: Store these securely. Never commit them to version control.

---

## Environment Configuration

### 1. Update `.env` File

Add the following variables to your `.env` file:

```env
# Langfuse Configuration (LLM Observability)
LANGFUSE_PUBLIC_KEY=pk_xxx...
LANGFUSE_SECRET_KEY=sk_xxx...
LANGFUSE_URL=https://cloud.langfuse.com
```

### 2. Verify Configuration

Test your configuration by running:

```bash
npm run dev
```

You should see in the logs:

```
✓ Langfuse client initialized
  baseUrl: https://cloud.langfuse.com
  publicKey: pk_xxx...
```

---

## Agent Tracing

### How Tracing Works

All agent executions are automatically traced to Langfuse through:

1. **LangChain Integration**: The `@langfuse/langchain` CallbackHandler automatically captures LLM calls
2. **Manual Logging**: Direct trace logging via the `logAgentExecution()` function
3. **Structured Metadata**: All traces include context like contract ID, user ID, language, and clause information

### Agent Execution Flow

The orchestrator traces the complete pipeline:

```
Contract Analysis
├─ Extractor Agent (extracts clauses)
├─ Risk Classifier Agent (classifies per clause)
└─ Redline Agent (suggests safer alternatives)
```

Each agent execution is traced with:
- **Agent name** and **version**
- **Input/output** samples
- **Duration** and **performance metrics**
- **Errors** and **retry attempts**
- **User context** and **contract metadata**

### Using the Tracing Wrapper

If you need to wrap custom agent functions:

```typescript
import { traceAgent } from "../services/langfuse.tracing.js";

const result = await traceAgent(
  () => extractorAgent.extract(text, language),
  {
    agentName: "extractor",
    contractId: "contract-123",
    userId: "user-456",
    language: "en",
  }
);

if (result.success) {
  console.log(`Extraction completed in ${result.duration}ms`);
  console.log(result.data);
} else {
  console.error(`Extraction failed: ${result.error}`);
}
```

### Pipeline Tracing

To trace an entire pipeline:

```typescript
import { tracePipeline } from "../services/langfuse.tracing.js";

const result = await tracePipeline(
  async () => {
    const extracted = await extractorAgent.extract(text, language);
    const classified = await riskClassifierAgent.classify(
      extracted.clauses[0].clauseText,
      extracted.clauses[0].clauseType,
      language
    );
    return { extracted, classified };
  },
  {
    contractId: "contract-123",
    userId: "user-456",
    language: "en",
  }
);
```

---

## Dashboard & Monitoring

### 1. Access the Langfuse Dashboard

1. Log in to [cloud.langfuse.com](https://cloud.langfuse.com)
2. Select your **aqdy-platform** project
3. You'll see the **Traces** tab with all agent executions

### 2. Key Dashboard Sections

#### **Traces View**
- Lists all agent executions with timestamps
- Filter by:
  - Agent name (extractor, classifier, redline)
  - User ID
  - Session ID (contract ID)
  - Status (success/error)
  - Duration

#### **Sessions View**
- Groups traces by session (contract analysis)
- Shows analysis progress for each contract
- Session metrics and timing

#### **Analytics**
- **LLM Cost**: Total tokens and API costs
- **Performance**: Average duration per agent
- **Errors**: Error rates and failure analysis
- **Usage Trends**: Executions over time

#### **Custom Dashboards**
Create custom dashboards to monitor:
- Agent performance by type
- Error patterns
- User activity
- Cost per contract analysis

### 3. Example Queries in Langfuse

**Find all extractors that took >5 seconds:**
```
Filter: agentName = "extractor" AND duration > 5000
```

**Find all errors for a specific contract:**
```
Filter: contractId = "contract-123" AND status = "error"
```

**Compare agent performance:**
```
Analytics: Group by agentName, Show: avg(duration), count
```

---

## Monitoring & Alerts

### 1. Set Up Performance Monitoring

In Langfuse dashboard:

1. Go to **Settings** → **Alerts**
2. Create alerts for:
   - Agent error rate > 5%
   - Average duration > 30 seconds
   - Cost spike detection

### 2. Integrate with External Monitoring

Export metrics to:
- **Datadog**: Connect via Langfuse Datadog integration
- **Grafana**: Use Langfuse API for custom metrics
- **Slack**: Set up webhook notifications

### 3. API Endpoint for Metrics

Query traces programmatically:

```typescript
import { getLangfuseClient } from "../config/langfuse.config.js";

const client = getLangfuseClient();

// Get recent traces
const traces = await client.getTraces({
  projectId: "your-project-id",
  limit: 100,
});
```

---

## Trace Data Structure

### Sample Trace Output

```json
{
  "id": "contract-123-extractor-full",
  "name": "agent-extractor",
  "userId": "user-456",
  "sessionId": "analysis-contract-123",
  "timestamp": "2024-05-28T10:15:30Z",
  "metadata": {
    "agentName": "extractor",
    "contractId": "contract-123",
    "clauseNumber": null,
    "language": "en"
  },
  "input": {
    "text": "CONTRACT AGREEMENT...",
    "length": 5432
  },
  "output": {
    "clauses": [
      {
        "clauseNumber": 1,
        "clauseText": "This agreement...",
        "clauseType": "General Terms"
      }
    ],
    "modelUsed": "gemini-1.5-pro",
    "usedFallback": false
  },
  "statusMessage": "success",
  "duration": 2850,
  "level": "default"
}
```

---

## Troubleshooting

### Issue: "Langfuse handler creation failed"

**Symptoms:** Errors in logs, tracing disabled

**Solutions:**
1. Verify API keys are correct in `.env`
2. Check network connectivity to `cloud.langfuse.com`
3. Ensure `LANGFUSE_URL` is set to `https://cloud.langfuse.com`
4. Check rate limits haven't been exceeded

### Issue: Traces not appearing in dashboard

**Symptoms:** No traces visible after running contracts

**Solutions:**
1. Verify `initializeLangfuse()` is called in `index.ts`
2. Check that `NODE_ENV` is not `"test"` (traces are skipped in test)
3. Ensure graceful shutdown flushes traces (`flushLangfuseTraces()`)
4. Wait 10-30 seconds for traces to appear (batched upload)
5. Verify project is correct in Langfuse dashboard

### Issue: High memory usage

**Symptoms:** Backend memory usage increases over time

**Solutions:**
1. Langfuse client batches traces in memory
2. Reduce `flushInterval` in `langfuse.config.ts` (currently 10s)
3. Monitor trace queue size: `logger.debug("Langfuse queue", { count: ... })`

### Issue: Timeout during shutdown

**Symptoms:** Server takes >10 seconds to shut down

**Solutions:**
1. Increase `flushInterval` tolerance in graceful shutdown
2. Reduce trace batch size if possible
3. Check for stuck network connections

---

## Performance Tuning

### Batch Upload Configuration

In `langfuse.config.ts`:

```typescript
langfuseClient = new Langfuse({
  flushInterval: 10000, // ms - flush every 10 seconds
  maxBatchSize: 100,    // max traces per batch
  timeout: 10000,       // max wait time
});
```

### Recommended Settings

| Environment | flushInterval | maxBatchSize | Notes |
|---|---|---|---|
| **Development** | 5000 | 50 | Faster feedback |
| **Staging** | 10000 | 100 | Balanced |
| **Production** | 30000 | 200 | Optimize for throughput |

---

## Cost Management

### Monitor API Usage

1. Go to Langfuse Dashboard → **Settings** → **Usage & Billing**
2. View:
   - API calls per agent
   - Tokens processed
   - Estimated monthly cost
   - Pricing breakdown

### Optimize Costs

1. **Reduce trace verbosity**: Skip logging large text samples
2. **Batch similar requests**: Group contract analyses by language/type
3. **Archive old traces**: Langfuse has retention policies
4. **Monitor token usage**: Check `gemini-1.5-pro` efficiency

---

## Next Steps

1. ✅ Create Langfuse account and project
2. ✅ Configure API keys in `.env`
3. ✅ Run backend and verify initialization logs
4. ✅ Upload test contracts
5. ✅ View traces in Langfuse dashboard
6. ✅ Create custom dashboards for your team
7. ✅ Set up alerts and monitoring

For more information:
- [Langfuse Documentation](https://docs.langfuse.com)
- [LangChain Integration](https://docs.langfuse.com/integrations/langchain)
- [Langfuse API Reference](https://api.reference.langfuse.com)
