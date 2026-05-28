# Langfuse Quick Reference

## 30-Second Setup

```bash
# 1. Create account at https://cloud.langfuse.com
# 2. Create project: "aqdy-platform"
# 3. Get API keys from Settings → API Keys
# 4. Update .env:

LANGFUSE_PUBLIC_KEY=pk_xxx...
LANGFUSE_SECRET_KEY=sk_xxx...
LANGFUSE_URL=https://cloud.langfuse.com

# 5. Start backend
npm run dev

# 6. Upload a contract
curl -X POST http://localhost:5000/api/upload -F "file=@contract.pdf"

# 7. View traces at https://cloud.langfuse.com
```

---

## Code Examples

### Basic Agent Tracing

```typescript
import { traceAgent } from "../services/langfuse.tracing.js";
import { extractorAgent } from "../agents/extractor.agent.js";

const result = await traceAgent(
  () => extractorAgent.extract(contractText, language),
  {
    agentName: "extractor",
    contractId: "contract-123",
    userId: "user-456",
    language: "en",
  }
);

// result.success: boolean
// result.duration: number (ms)
// result.data: T (agent output)
// result.error: string | undefined
```

### Pipeline Tracing

```typescript
import { tracePipeline } from "../services/langfuse.tracing.js";

const result = await tracePipeline(
  async () => {
    const extracted = await extractorAgent.extract(...);
    const classified = await riskClassifierAgent.classify(...);
    return { extracted, classified };
  },
  { contractId, userId, language }
);
```

### With Error Handling

```typescript
const result = await traceAgent(
  () => extractorAgent.extract(contractText, language),
  { agentName: "extractor", contractId, userId, language }
);

if (result.success) {
  console.log(`✓ Completed in ${result.duration}ms`);
  return result.data;
} else {
  console.error(`✗ Failed: ${result.error}`);
  throw new Error(result.error);
}
```

---

## Dashboard Queries

### Find All Traces for a Contract

```
Filter: contractId = "contract-123"
Order: timestamp DESC
```

### Find Slow Operations

```
Filter: duration > 10000
Order: duration DESC
```

### Compare Agent Performance

```
Group by: agentName
Metrics: count, avg(duration), max(duration)
```

### Find Recent Errors

```
Filter: statusMessage = "error"
Order: timestamp DESC
Limit: 50
```

---

## Configuration

### Environment Variables

```bash
# Required
LANGFUSE_PUBLIC_KEY=pk_...
LANGFUSE_SECRET_KEY=sk_...

# Optional (defaults shown)
LANGFUSE_URL=https://cloud.langfuse.com
NODE_ENV=development  # test skips Langfuse

# Batch settings (in langfuse.config.ts)
flushInterval: 10000  # ms
```

### Supported Agents

```typescript
agentName: "extractor" | "riskClassifier" | "redline"
```

### Supported Languages

```typescript
language: "ar" | "en"
```

---

## Monitoring

### Key Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Extraction duration | <5s | <10s | >10s |
| Classifier duration | <2s | <5s | >5s |
| Error rate | <1% | <5% | >5% |

### Check Dashboard

1. Go to https://cloud.langfuse.com
2. Select project "aqdy-platform"
3. Click **Traces** tab
4. Filter by agent name or contract ID

### Set Alert (in Langfuse)

1. Settings → Alerts
2. Create Alert
3. Condition: `error_rate > 0.05`
4. Notification: Slack

---

## Troubleshooting

### Issue: "Langfuse handler creation failed"

**Fix:**
```bash
# 1. Verify API keys in .env
# 2. Check network connectivity
curl https://cloud.langfuse.com -I
# 3. Restart backend
npm run dev
```

### Issue: No traces appearing

**Fix:**
```bash
# 1. Verify initialization log:
# "✓ Langfuse client initialized"

# 2. Check NODE_ENV != "test"

# 3. Wait 10-30 seconds (batched upload)

# 4. Verify traces were sent:
# Look for "[AGENT-SUCCESS]" or "[AGENT-ERROR]" logs

# 5. Try manual trace:
curl -X POST http://localhost:5000/api/upload \
  -F "file=@test-contract.pdf"
```

### Issue: High memory usage

**Fix:**
```typescript
// In langfuse.config.ts, reduce flush interval:
flushInterval: 5000  // was 10000
```

---

## Performance Targets

```
┌─────────────────┬────────────┬──────────────┐
│ Agent           │ Avg Time   │ Max Time     │
├─────────────────┼────────────┼──────────────┤
│ Extractor       │ <5s        │ <10s         │
│ Risk Classifier │ <2s        │ <5s          │
│ Redline         │ <3s        │ <8s          │
│ Full Pipeline   │ <20s       │ <30s         │
└─────────────────┴────────────┴──────────────┘
```

---

## API Reference

### traceAgent()

```typescript
traceAgent<T>(
  fn: () => Promise<T>,
  options: {
    agentName: "extractor" | "riskClassifier" | "redline";
    contractId: string;
    userId: string;
    language: "ar" | "en";
    clauseNumber?: number;  // optional, for per-clause ops
  }
): Promise<TracedAgentResult<T>>
```

### tracePipeline()

```typescript
tracePipeline<T>(
  fn: () => Promise<T>,
  options: {
    contractId: string;
    userId: string;
    language: "ar" | "en";
  }
): Promise<TracedAgentResult<T>>
```

### logAgentMetricsReport()

```typescript
logAgentMetricsReport(
  results: TracedAgentResult<any>[],
  context?: string
): void
```

---

## Files & Locations

```
Configuration:
  └── src/config/langfuse.config.ts

Tracing Wrapper:
  └── src/services/langfuse.tracing.ts

Entry Point:
  └── src/index.ts (initialization + shutdown)

Documentation:
  └── docs/AGENTS/
      ├── README_LANGFUSE.md          (overview)
      ├── LANGFUSE_SETUP.md           (detailed setup)
      ├── LANGFUSE_DASHBOARDS.md      (monitoring)
      ├── LANGFUSE_INTEGRATION_EXAMPLES.md (code)
      └── LANGFUSE_QUICK_REFERENCE.md (this file)
```

---

## Useful Links

| Link | Purpose |
|------|---------|
| https://cloud.langfuse.com | Dashboard |
| https://docs.langfuse.com | Documentation |
| https://docs.langfuse.com/integrations/langchain | LangChain Integration |
| https://api.reference.langfuse.com | API Reference |

---

## Common Tasks

### View Traces for Contract #123

```
Dashboard → Traces → Filter: contractId = "contract-123"
```

### Compare Agent Performance

```
Dashboard → Analytics → Group by: agentName → Metric: avg(duration)
```

### Export Traces

```
Dashboard → Traces → Export (CSV or JSON)
```

### Share Dashboard

```
Dashboard → Dashboards → [Select] → Share → Copy URL
```

### Set Performance Alert

```
Dashboard → Settings → Alerts → Create Alert
Condition: avg(duration) > 30000
```

---

## Support

- Check [LANGFUSE_SETUP.md](./LANGFUSE_SETUP.md) for detailed setup
- Check [LANGFUSE_DASHBOARDS.md](./LANGFUSE_DASHBOARDS.md) for monitoring
- Check [LANGFUSE_INTEGRATION_EXAMPLES.md](./LANGFUSE_INTEGRATION_EXAMPLES.md) for code patterns
- Visit https://docs.langfuse.com for official docs

---

**Version**: 1.0  
**Last Updated**: May 28, 2024  
**Status**: ✓ Ready for Production
