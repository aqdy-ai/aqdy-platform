# Monitoring & Observability Guide

## Overview
Aqdy uses a multi-layer monitoring approach:
- **In-memory metrics** via `metrics.ts`
- **Langfuse** for LLM tracing and observability
- **Winston logger** for structured logging

---

## Metric Definitions

### Counters
| Metric | Description |
|--------|-------------|
| `analyses.total` | Total number of contract analyses run |
| `analyses.risk.low` | Analyses with low overall risk |
| `analyses.risk.medium` | Analyses with medium overall risk |
| `analyses.risk.high` | Analyses with high overall risk |
| `analyses.risk.critical` | Analyses with critical overall risk |
| `alerts.highLatency` | Number of analyses exceeding 5s latency |

### Histograms
| Metric | Description |
|--------|-------------|
| `analyses.latencyMs` | Analysis duration in milliseconds |
| `analyses.clauseCount` | Number of clauses per analysis |
| `analyses.tokens.total` | Estimated total tokens per analysis |
| `analyses.costUSD` | Estimated cost per analysis in USD |

---

## Alert Thresholds

| Alert | Threshold | Action |
|-------|-----------|--------|
| Token spike | > 3x rolling average | Warning log |
| High latency | > 5000ms | Warning log + counter |
| Error rate | > 5% in 5-minute window | Warning log |

---

## LLM Pricing (Gemini)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|-----------------------|------------------------|
| `gemini-3.5-flash` | $0.075 | $0.30 |
| `gemini-3.1-flash-lite` | $0.0375 | $0.15 |

---

## Metrics API

### GET /api/metrics
Returns current metrics snapshot.

**Response:**
```json
{
  "success": true,
  "data": {
    "counters": {
      "analyses.total": 42,
      "analyses.risk.high": 10,
      "alerts.highLatency": 2
    },
    "histograms": {
      "analyses.latencyMs": { "count": 42, "avg": 2300, "min": 800, "max": 6200 },
      "analyses.tokens.total": { "count": 42, "avg": 1500, "min": 200, "max": 8000 },
      "analyses.costUSD": { "count": 42, "avg": 0.00045, "min": 0.00006, "max": 0.0024 }
    },
    "timestamp": "2026-05-28T20:00:00.000Z"
  }
}
```

---

## Langfuse Dashboard

Access at: **https://cloud.langfuse.com**

Tracks:
- Every LLM call with input/output
- Agent execution traces
- Token usage per call
- Latency per agent

---

## Alert Channels

Currently alerts are logged via Winston logger with level `warn`.

Future: integrate with Slack/PagerDuty webhook.