# Langfuse Dashboard Guide

## Quick Start

1. Go to [cloud.langfuse.com](https://cloud.langfuse.com)
2. Select your **aqdy-platform** project
3. Navigate to **Traces** tab to see live agent executions
4. Click any trace to view detailed execution logs

---

## Core Dashboards

### 1. Traces Dashboard (Main View)

**Location**: Dashboard → Traces

**Key Metrics:**
- Total traces
- Avg. duration
- Error rate
- Active sessions

**Filters Available:**
- Agent name (extractor, classifier, redline)
- Status (success, error)
- User ID
- Session ID
- Duration range
- Timestamp range

**Example Filter Query:**
```
status = success AND agentName = extractor AND duration < 5000
```

---

### 2. Sessions Dashboard

**Location**: Dashboard → Sessions

A "session" in Langfuse = one contract analysis

**View Details:**
- Session ID (contract ID)
- Total traces in session
- Total duration
- Success rate
- Cost (tokens)

**Example:**
```
Session: analysis-contract-123-789
├─ 3 extractor traces (1 successful, 2 retries)
├─ 15 classifier traces (one per clause)
├─ 5 redline traces (high-risk clauses only)
└─ Total duration: 45 seconds
```

---

### 3. Performance Analytics

**Location**: Dashboard → Analytics

**Key Views:**

#### Agent Performance Comparison
```
Group by: agentName
Metrics:
  - Count (executions)
  - Avg duration
  - Error rate
  - Total duration
```

**Chart Type**: Bar chart for easy comparison

#### Performance Over Time
```
Time series showing:
  - Avg duration per hour
  - Error rate trends
  - Success rate trends
  - Throughput (executions/hour)
```

#### Cost Analysis
```
Metrics:
  - Tokens used per agent
  - API cost per agent
  - Total cost over time
  - Cost per contract analysis
```

---

## Creating Custom Dashboards

### Step 1: Create Dashboard

1. Go to **Dashboards** → **Create new dashboard**
2. Name: e.g., "Agent Performance"
3. Click **Create**

### Step 2: Add Charts

Click **Add chart** and select from:
- **Table**: List traces with custom columns
- **Time series**: Performance metrics over time
- **Bar chart**: Compare agents/metrics
- **Pie chart**: Distribution (success/error/retry)
- **Gauge**: Current metric (e.g., error rate)

### Step 3: Configure Chart

```json
{
  "type": "timeseries",
  "title": "Agent Duration Trends",
  "metrics": ["avg(duration)", "max(duration)", "min(duration)"],
  "groupBy": ["agentName"],
  "timeRange": "last_7_days",
  "refreshInterval": "5m"
}
```

### Step 4: Save Dashboard

Give it a meaningful name and save. Share with team members.

---

## Example Dashboards

### Dashboard 1: Agent Health Overview

**Purpose**: Monitor all agents in production

**Charts:**
1. **Error Rate by Agent** (Bar chart)
   ```
   Metric: sum(errors) / count(*)
   Group by: agentName
   ```

2. **Avg Duration by Agent** (Bar chart)
   ```
   Metric: avg(duration)
   Group by: agentName
   ```

3. **Throughput** (Time series)
   ```
   Metric: count(traces)
   Group by: agentName
   Time interval: hourly
   ```

4. **Recent Errors** (Table)
   ```
   Filter: statusMessage = "error"
   Limit: 20
   Columns: timestamp, agentName, contractId, error
   ```

### Dashboard 2: Cost & Usage Monitoring

**Purpose**: Track API costs and token usage

**Charts:**
1. **Token Usage by Agent** (Pie chart)
   ```
   Metric: sum(input_tokens) + sum(output_tokens)
   Group by: agentName
   ```

2. **Cost Over Time** (Time series)
   ```
   Metric: sum(cost_usd)
   Time interval: daily
   ```

3. **Cost per Contract** (Gauge)
   ```
   Metric: avg(cost_per_session)
   Threshold: $0.50
   ```

4. **Usage Trends** (Bar chart)
   ```
   Metric: count(sessions)
   Group by: date
   Last 30 days
   ```

### Dashboard 3: Quality & Performance

**Purpose**: Monitor analysis quality

**Charts:**
1. **Success Rate by Agent** (Gauge)
   ```
   Metric: success_count / total_count
   Target: > 95%
   ```

2. **P95 Duration** (Time series)
   ```
   Metric: percentile(duration, 0.95)
   Group by: agentName
   ```

3. **Retry Rate** (Bar chart)
   ```
   Metric: avg(attempt) per session
   Filter: agentName = extractor
   ```

4. **Error Distribution** (Pie chart)
   ```
   Group by: error_type
   ```

---

## Querying Traces

### Using the Trace Explorer

1. Go to **Traces** tab
2. Click **Advanced Filter**
3. Build queries:

#### Find Slow Extractions
```
agentName = "extractor" 
AND duration > 10000
ORDER BY duration DESC
```

#### Find Failed Analyses
```
metadata.agentName IN ["extractor", "classifier", "redline"]
AND statusMessage = "error"
AND timestamp > 1 day ago
```

#### Compare Languages
```
metadata.language = "ar" OR metadata.language = "en"
GROUP BY metadata.language
ORDER BY count DESC
```

#### Top Users by Activity
```
userId != NULL
GROUP BY userId
ORDER BY count(*) DESC
LIMIT 10
```

---

## Setting Up Alerts

### Alert 1: High Error Rate

**Condition**: Error rate > 5% in last hour

```json
{
  "name": "High Agent Error Rate",
  "condition": "error_rate > 0.05",
  "timeWindow": "1h",
  "notification": {
    "slack": "#alerts",
    "email": "ops@example.com"
  }
}
```

### Alert 2: Performance Degradation

**Condition**: Avg duration > 30 seconds

```json
{
  "name": "Slow Agent Execution",
  "condition": "avg(duration) > 30000",
  "groupBy": ["agentName"],
  "notification": {
    "slack": "#alerts"
  }
}
```

### Alert 3: Cost Spike

**Condition**: Daily cost > threshold

```json
{
  "name": "Unexpected Cost Increase",
  "condition": "daily_cost > 100",
  "timeWindow": "24h",
  "notification": {
    "email": "billing@example.com",
    "slack": "#finance"
  }
}
```

---

## Integration Examples

### Slack Integration

1. Go to **Settings** → **Integrations**
2. Click **Slack**
3. Authorize with your Slack workspace
4. Select channel: `#alerts` or `#monitoring`
5. Configure notification triggers

### Webhook Integration

Get trace data via webhook:

```bash
curl -X GET https://cloud.langfuse.com/api/traces \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "limit": 100,
    "filter": {
      "timestamp": { "gte": "2024-05-28T00:00:00Z" }
    }
  }'
```

---

## Data Retention & Export

### View Data Retention Policy

1. Go to **Settings** → **Data Retention**
2. Check retention period (default: 90 days)
3. Option to extend or customize

### Export Traces

**Via API:**
```typescript
const traces = await client.getTraces({
  projectId: "your-project-id",
  limit: 1000,
  startTime: "2024-05-01T00:00:00Z",
  endTime: "2024-05-31T23:59:59Z",
});

// Save to CSV/JSON
```

**Via Dashboard:**
1. Go to **Traces**
2. Click **Export** (top right)
3. Choose format: CSV or JSON
4. Download

---

## Best Practices

### 1. Naming Conventions

Use consistent naming for easy filtering:
```
agent-[type]-[version]
trace-[contract-id]-[agent-type]-[attempt]
session-[contract-id]
```

### 2. Metadata Structure

Always include:
```json
{
  "agentName": "extractor",
  "contractId": "contract-123",
  "userId": "user-456",
  "language": "en",
  "clauseNumber": 1,
  "timestamp": "2024-05-28T10:15:30Z"
}
```

### 3. Regular Review

- **Daily**: Check error rate and performance
- **Weekly**: Review cost trends and optimization opportunities
- **Monthly**: Archive old traces, update dashboards

### 4. Team Access

- Share dashboards with:
  - **Engineering**: Performance & errors
  - **Product**: Usage & trends
  - **Finance**: Cost & budget tracking

---

## Troubleshooting Dashboard Issues

### Issue: Empty dashboard

**Solutions:**
1. Verify traces are being sent (check **Traces** tab)
2. Check date filters (expand time range)
3. Verify project is selected
4. Check data retention hasn't expired

### Issue: Slow dashboard loading

**Solutions:**
1. Reduce time range (e.g., last 7 days instead of 90)
2. Add filters to reduce data volume
3. Limit table rows to 100-500
4. Use time series instead of detailed tables

### Issue: Missing metrics

**Solutions:**
1. Verify metric name is correct (check API docs)
2. Ensure data exists in that time range
3. Check filter conditions are valid
4. Try simpler query first

---

## Quick Commands

### View Latest Traces
```
Filter: timestamp > 1 hour ago
Order: timestamp DESC
Limit: 50
```

### Find Specific Contract Analysis
```
Filter: contractId = "contract-123"
Order: timestamp DESC
```

### Compare Agent Performance
```
Group by: agentName
Metrics: count, avg(duration), error_rate
Time range: last 7 days
```

### Check API Costs
```
Group by: agentName
Metric: sum(cost_usd)
Time range: last 30 days
```

---

For more help, visit [Langfuse Documentation](https://docs.langfuse.com)
