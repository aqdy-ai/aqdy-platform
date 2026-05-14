# Database Schema Documentation

## Overview
Aqdy uses MongoDB with Mongoose ODM. The database contains 3 main collections.

---

## Collections

### 1. Contracts
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique identifier |
| `filename` | String | ✅ | Original file name |
| `uploadedAt` | Date | Auto | Upload timestamp |
| `language` | String | ✅ | `ar` or `en` |
| `text` | String | ✅ | Extracted contract text |
| `userId` | String | ✅ | Owner user ID |
| `fileSize` | Number | ✅ | File size in bytes |

**Indexes:**
- `{ userId: 1, uploadedAt: -1 }`
- `{ language: 1 }`

---

### 2. RiskAnalyses
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique identifier |
| `contractId` | ObjectId | ✅ | Reference to Contract |
| `userId` | String | ✅ | Owner user ID |
| `executiveSummary` | Object | ✅ | High-level risk summary |
| `clauseAnalysis` | Array | ✅ | Per-clause analysis |
| `analysisDuration` | Number | ✅ | Time taken in ms |

**Indexes:**
- `{ contractId: 1, createdAt: -1 }`
- `{ userId: 1, createdAt: -1 }`

---

### 3. AuditLogs
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique identifier |
| `contractId` | ObjectId | ✅ | Reference to Contract |
| `userId` | String | ✅ | User who triggered event |
| `action` | String | ✅ | Event type |
| `timestamp` | Date | Auto | Event timestamp |
| `langfuseTraceId` | String | ❌ | Langfuse trace ID |
| `metadata` | Object | ❌ | Additional event data |

**Action Types:**
- `CONTRACT_UPLOADED`
- `ANALYSIS_STARTED`
- `ANALYSIS_COMPLETED`
- `ANALYSIS_FAILED`
- `REPORT_EXPORTED`

**Indexes:**
- `{ userId: 1, timestamp: -1 }`
- `{ action: 1, timestamp: -1 }`

---

## Relationships
```
Contract (1) ──── (many) RiskAnalyses
Contract (1) ──── (many) AuditLogs
```