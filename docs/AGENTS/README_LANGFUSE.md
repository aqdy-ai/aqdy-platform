# Langfuse Observability & Tracing

> Complete LLM observability, tracing, and analytics for all Aqdy platform agent executions.

## What is Langfuse?

Langfuse is an open-source LLM observability platform that provides:
- **Automatic LLM Tracing**: Capture every LLM call, prompt, and response
- **Agent Monitoring**: Track agent execution flows, performance, and errors
- **Cost Analytics**: Monitor API usage and compute costs in real-time
- **Quality Insights**: Understand model behavior and performance trends
- **Team Collaboration**: Share dashboards and alerts with your team

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Aqdy Backend (Node.js)                  │
│                                                         │
│  ┌─────────────┬──────────────┬──────────────┐        │
│  │ Extractor   │ Risk Class.  │ Redline      │        │
│  │ Agent       │ Agent        │ Agent        │        │
│  └─────────────┴──────────────┴──────────────┘        │
│                      ↓                                  │
│  ┌──────────────────────────────────────────────┐     │
│  │ Langfuse Tracing Wrapper (langfuse.tracing)  │     │
│  │ - Automatic duration tracking                │     │
│  │ - Metadata collection                        │     │
│  │ - Error logging                              │     │
│  └──────────────────────────────────────────────┘     │
│                      ↓                                  │
│  ┌──────────────────────────────────────────────┐     │
│  │ Langfuse Config + LangChain Handler          │     │
│  │ - Session management                         │     │
│  │ - Call tracking                              │     │
│  │ - Batch uploading                            │     │
│  └──────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│           Langfuse Cloud (SaaS / Self-Hosted)          │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Traces API  │  │ Analytics    │  │ Dashboards   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create Langfuse Account

```bash
# Visit https://cloud.langfuse.com
# Sign up for free account
# Create project: "aqdy-platform"
```

### 2. Get API Keys

1. Go to **Settings** → **API Keys**
2. Copy:
   - **Public Key** → `LANGFUSE_PUBLIC_KEY`
   - **Secret Key** → `LANGFUSE_SECRET_KEY`

### 3. Configure Environment

```bash
# .env
LANGFUSE_PUBLIC_KEY=pk_xxx...
LANGFUSE_SECRET_KEY=sk_xxx...
LANGFUSE_URL=https://cloud.langfuse.com
```

### 4. Start Backend

```bash
npm run dev
```

Look for logs:
```
✓ Langfuse client initialized
  baseUrl: https://cloud.langfuse.com
```

### 5. View Traces

Upload a contract via API, then check dashboard:
```
https://cloud.langfuse.com → Select project → Traces tab
```

## Core Components

### 1. **Langfuse Configuration** (`langfuse.config.ts`)

Handles:
- Global client initialization
- CallbackHandler factory for LangChain
- Direct trace logging
- Graceful shutdown with trace flushing

```typescript
// Initialize on startup
initializeLangfuse();

// Create handler for LangChain
const handler = createLangfuseHandler({
  sessionId: `analysis-${contractId}`,
  userId: "user-123",
  traceName: "contract-analysis",
});

// Log agent execution directly
logAgentExecution({
  agentName: "extractor",
  contractId: "contract-123",
  userId: "user-456",
  language: "en",
  duration: 2850,
});
```

### 2. **Tracing Wrapper** (`langfuse.tracing.ts`)

Wraps agent functions with:
- Automatic duration measurement
- Structured metadata logging
- Error tracking
- Langfuse integration

```typescript
const result = await traceAgent(
  () => extractorAgent.extract(text, language),
  {
    agentName: "extractor",
    contractId: "contract-123",
    userId: "user-456",
    language: "en",
  }
);

// result.success: boolean
// result.duration: milliseconds
// result.data: agent output (if successful)
// result.error: error message (if failed)
```

### 3. **Pipeline Tracing** (`langfuse.tracing.ts`)

Wraps multi-agent pipelines:

```typescript
const result = await tracePipeline(
  async () => {
    const extracted = await extractorAgent.extract(...);
    const classified = await riskClassifierAgent.classify(...);
    return { extracted, classified };
  },
  { contractId, userId, language }
);
```

## Integration Points

### Agent Execution Service

The `AgentExecutionService` manages job queues. All executions are logged:

```
Agent Job Created → Trace Started → Job Processing → Result Logged → Langfuse Upload
```

### Orchestrator Service

The `OrchestratorService` runs the full pipeline. All steps are traced:

```
Contract Analysis Pipeline
├─ Step 1: Extraction (traceAgent: "extractor")
├─ Step 2: Classification (traceAgent: "riskClassifier" × N clauses)
└─ Step 3: Redlining (traceAgent: "redline" × risky clauses)
```

### API Endpoints

All analysis endpoints automatically trigger traces:

```
POST /api/analysis/analyze
  → OrchestratorService.run()
    → tracePipeline() wraps everything
      → Individual agents logged
        → Traces batch uploaded to Langfuse
```

## Trace Data Structure

### Example Trace

```json
{
  "id": "contract-123-extractor-full",
  "name": "agent-extractor",
  "userId": "user-456",
  "metadata": {
    "agentName": "extractor",
    "contractId": "contract-123",
    "language": "en",
    "clauseNumber": null
  },
  "input": {
    "text": "CONTRACT...",
    "length": 5432
  },
  "output": {
    "clauses": [
      {
        "clauseNumber": 1,
        "clauseText": "...",
        "clauseType": "General Terms"
      }
    ],
    "modelUsed": "gemini-1.5-pro",
    "usedFallback": false
  },
  "duration": 2850,
  "statusMessage": "success"
}
```

### Trace Metadata

Every trace includes:

| Field | Value | Notes |
|-------|-------|-------|
| `agentName` | "extractor" \| "riskClassifier" \| "redline" | Agent type |
| `contractId` | "contract-123" | Database ID |
| `userId` | "user-456" | For attribution |
| `language` | "ar" \| "en" | Contract language |
| `clauseNumber` | 1-N \| null | Clause being processed |
| `duration` | ms | Execution time |
| `error` | string \| null | Error message if failed |

## Dashboard & Monitoring

### Main Views

1. **Traces**: Browse all agent executions
2. **Sessions**: Group traces by contract analysis
3. **Analytics**: Performance metrics and trends
4. **Custom Dashboards**: Build your own charts

### Common Queries

```
# Find all extractors
Filter: agentName = "extractor"

# Find slow operations
Filter: duration > 10000 ORDER BY duration DESC

# Find errors for a contract
Filter: contractId = "contract-123" AND statusMessage = "error"

# Compare agent performance
Group by: agentName
Metric: avg(duration)
```

### Performance Targets

| Agent | Target Avg | Target Max |
|-------|-----------|-----------|
| Extractor | <5s | <10s |
| Risk Classifier | <2s | <5s |
| Redline | <3s | <8s |

## Alerts & Monitoring

### Pre-configured Alerts

1. **Error Rate > 5%**: Daily digest
2. **Slow Execution > 30s**: Real-time alert
3. **Cost Spike**: Daily review

### Setting Up Alerts

1. Go to **Settings** → **Alerts**
2. Click **Create Alert**
3. Set condition and notification channel
4. Save and enable

### Notification Channels

- **Slack**: Real-time alerts in channel
- **Email**: Daily digests or immediate
- **Webhooks**: Custom integrations
- **PagerDuty**: For critical issues

## Cost Management

### Monitor Usage

```
Langfuse Dashboard → Settings → Usage & Billing

Shows:
- API calls by agent
- Tokens processed
- Daily/monthly costs
- Cost per agent
```

### Optimize Costs

1. **Reduce trace verbosity**: Don't log full contract text
2. **Batch operations**: Group similar analyses
3. **Archive traces**: Use retention policies
4. **Monitor token efficiency**: Check LLM outputs

### Cost Metrics

```
Typical costs per contract analysis:
- Extraction: $0.05-0.15
- Classification: $0.02-0.05 per clause
- Redlining: $0.02-0.04 per clause

Example: 50-clause contract = $0.50-1.50 per analysis
```

## Advanced Features

### Custom Metrics

Query traces via API:

```typescript
const client = getLangfuseClient();
const traces = await client.getTraces({
  projectId: "your-project",
  filter: { agentName: "extractor" },
  limit: 100,
});
```

### Batch Export

Download traces as CSV/JSON:

```bash
# Via Dashboard: Traces → Export
# Via API: /api/traces?format=csv&startDate=...
```

### Integrations

- **Slack**: Alerts and notifications
- **Datadog**: Custom metric dashboards
- **Grafana**: Performance monitoring
- **Webhooks**: Custom integrations

## Troubleshooting

### Issue: Traces not appearing

**Check:**
1. ✓ Langfuse client initialized (look for log message)
2. ✓ `NODE_ENV` is not "test"
3. ✓ API keys are correct
4. ✓ Network connection to Langfuse cloud
5. ✓ Wait 10-30 seconds (batched upload)

### Issue: Missing metadata

**Check:**
1. ✓ All required fields passed to `traceAgent()`
2. ✓ `contractId` and `userId` are set
3. ✓ `language` is "ar" or "en"

### Issue: High memory usage

**Solutions:**
1. Reduce `flushInterval` in config (currently 10s)
2. Monitor queue size with debug logs
3. Increase batch size

## Documentation

- **Setup Guide**: [LANGFUSE_SETUP.md](./LANGFUSE_SETUP.md)
  - Account creation, configuration, environment setup

- **Dashboard Guide**: [LANGFUSE_DASHBOARDS.md](./LANGFUSE_DASHBOARDS.md)
  - Dashboard setup, queries, alerts, custom metrics

- **Integration Examples**: [LANGFUSE_INTEGRATION_EXAMPLES.md](./LANGFUSE_INTEGRATION_EXAMPLES.md)
  - Code examples for all tracing patterns
  - Best practices and common patterns

## Files Overview

```
backend/src/
├── config/
│   ├── langfuse.config.ts      ← Client initialization & handlers
│   └── env.ts                  ← Environment variables
├── services/
│   └── langfuse.tracing.ts     ← Tracing wrapper functions
├── pipeline/
│   ├── orchestrator.service.ts ← Uses tracing
│   └── agentExecution.service.ts ← Job queue with traces
├── agents/
│   ├── extractor.agent.ts
│   ├── riskClassifier.agent.ts
│   └── redline.agent.ts
└── index.ts                    ← Initialization & shutdown hooks
```

## Next Steps

1. ✅ [Create Langfuse Account](./LANGFUSE_SETUP.md#langfuse-account-setup)
2. ✅ [Configure Environment](./LANGFUSE_SETUP.md#environment-configuration)
3. ✅ [Verify Traces](./LANGFUSE_DASHBOARDS.md#traces-dashboard-main-view)
4. ✅ [Create Custom Dashboards](./LANGFUSE_DASHBOARDS.md#creating-custom-dashboards)
5. ✅ [Set Up Alerts](./LANGFUSE_DASHBOARDS.md#setting-up-alerts)
6. ✅ [Monitor Costs](./LANGFUSE_SETUP.md#cost-management)

## Support

- **Langfuse Docs**: https://docs.langfuse.com
- **LangChain Integration**: https://docs.langfuse.com/integrations/langchain
- **Community**: https://discord.gg/langfuse
- **Issues**: Report in Langfuse GitHub

---

**Last Updated**: May 28, 2024  
**Status**: ✓ Production Ready  
**Maintainer**: Aqdy Platform Team
