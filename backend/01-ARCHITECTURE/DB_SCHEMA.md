# Aqdy Platform — Database Schema

**Database:** MongoDB Atlas
**Cluster:** aqdy-cluster.soqzyn2.mongodb.net
**ODM:** Mongoose

---

## Collections Overview

| Collection | Description |
|------------|-------------|
| `users` | Platform user accounts |
| `contracts` | Uploaded contract documents |
| `riskanalyses` | AI analysis results per contract |
| `auditlogs` | System event audit trail |
| `plans` | Subscription plan definitions |
| `subscriptions` | User-plan subscription records |
| `creditledgers` | Credit transaction history |
| `payments` | Stripe payment records |

---

## users

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | ✅ | Auto-generated |
| `name` | String | ✅ | Min 3 chars |
| `email` | String | ✅ | Unique, lowercase |
| `password` | String | ✅ | Bcrypt hashed |
| `role` | Enum | ✅ | `user` \| `admin` |
| `planSlug` | String | ✅ | `free` \| `pro` \| `enterprise` |
| `status` | Enum | ✅ | `active` \| `suspended` \| `deleted` |
| `creditBalance` | Number | ✅ | Default: 0 |
| `isEmailVerified` | Boolean | ✅ | Default: false |
| `refreshToken` | String | ❌ | JWT refresh token |
| `createdAt` | Date | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Mongoose timestamps |

**Indexes:** `email` (unique)

---

## contracts

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | ✅ | Auto-generated |
| `filename` | String | ✅ | Max 255 chars |
| `uploadedAt` | Date | ✅ | Default: now |
| `language` | Enum | ✅ | `ar` \| `en` |
| `text` | String | ✅ | Extracted contract text |
| `userId` | String | ✅ | Owner user ID |
| `fileSize` | Number | ✅ | Bytes |
| `deletedAt` | Date | ❌ | Soft delete timestamp |
| `createdAt` | Date | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Mongoose timestamps |

**Indexes:**
- `userId` (single)
- `userId + uploadedAt` (compound, desc)
- `userId + deletedAt` (compound)
- `language` (single)

---

## riskanalyses

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | ✅ | Auto-generated |
| `contractId` | ObjectId | ✅ | Ref: contracts |
| `userId` | String | ✅ | Owner user ID |
| `executiveSummary` | Object | ✅ | See below |
| `clauseAnalysis` | Array | ✅ | See below |
| `analysisDuration` | Number | ❌ | Ms |
| `createdAt` | Date | Auto | Mongoose timestamps |

**executiveSummary:**
```json
{
  "overallRisk": "low | medium | high | critical",
  "totalClauses": 10,
  "riskyClausesCount": 3,
  "summary": { "ar": "...", "en": "..." }
}
```

**clauseAnalysis item:**
```json
{
  "clauseText": "exact clause text",
  "clauseType": "termination | payment | liability | ...",
  "riskLevel": "low | medium | high | critical",
  "confidence": 0.85,
  "explanation": { "ar": "...", "en": "..." },
  "sourceFromKB": "kb_id or null",
  "redlineSuggestion": "suggested revision",
  "lowConfidenceWarning": false,
  "kbCitationMissing": false
}
```

---

## auditlogs

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | ✅ | Auto-generated |
| `contractId` | String | ❌ | Related contract |
| `userId` | ObjectId | ❌ | Related user |
| `userEmail` | String | ❌ | For tracing |
| `action` | Enum | ✅ | See action types below |
| `outcome` | Enum | ✅ | `success` \| `failure` |
| `timestamp` | Date | ✅ | Default: now |
| `ipAddress` | String | ❌ | Client IP |
| `userAgent` | String | ❌ | Browser info |
| `metadata` | Object | ❌ | Extra context |

**Action Types:** `CONTRACT_UPLOADED`, `ANALYSIS_STARTED`, `ANALYSIS_COMPLETED`, `ANALYSIS_FAILED`, `AUTH_LOGIN`, `AUTH_LOGIN_FAILED`, `AUTH_LOGOUT`, `AGENT_EXTRACTOR`, `AGENT_RISK_CLASSIFIER`, `AGENT_REDLINE`, `AGENT_PIPELINE`

---

## plans

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | ✅ | Auto-generated |
| `name` | String | ✅ | Display name |
| `slug` | String | ✅ | Unique: `free` \| `pro` \| `enterprise` |
| `price` | Number | ✅ | Monthly price USD |
| `billingCycle` | Enum | ✅ | `monthly` \| `yearly` |
| `features` | String[] | ✅ | Feature list |
| `analysisLimit` | Number | ✅ | -1 = unlimited |
| `storageLimit` | Number | ✅ | -1 = unlimited |
| `creditAllowance` | Number | ❌ | Credits per period |
| `isActive` | Boolean | ✅ | Default: true |

**Indexes:** `slug` (unique)

---

## subscriptions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | ✅ | Auto-generated |
| `userId` | ObjectId | ✅ | Ref: users |
| `planId` | ObjectId | ✅ | Ref: plans |
| `status` | Enum | ✅ | `active` \| `cancelled` \| `expired` \| `past_due` |
| `startDate` | Date | ✅ | Subscription start |
| `endDate` | Date | ✅ | Subscription end |
| `renewalDate` | Date | ❌ | Next renewal |
| `cancelledAt` | Date | ❌ | Cancellation time |
| `createdAt` | Date | Auto | Mongoose timestamps |

---

## creditledgers

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | ✅ | Auto-generated |
| `userId` | ObjectId | ✅ | Ref: users |
| `delta` | Number | ✅ | + topup / - deduction |
| `balanceAfter` | Number | ✅ | Balance after transaction |
| `reason` | Enum | ✅ | `analysis_deduction` \| `chat_deduction` \| `plan_topup` \| `manual_adjustment` \| `refund` \| `plan_reset` |
| `metadata` | Object | ❌ | tokensUsed, contractId, etc. |
| `createdAt` | Date | Auto | Mongoose timestamps |

---

## payments

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | ✅ | Auto-generated |
| `userId` | ObjectId | ✅ | Ref: users |
| `stripeSessionId` | String | ✅ | Stripe checkout session |
| `stripePaymentIntentId` | String | ❌ | Stripe payment intent |
| `amount` | Number | ✅ | Amount in currency units |
| `currency` | String | ✅ | e.g. `USD`, `EGP` |
| `status` | Enum | ✅ | `pending` \| `succeeded` \| `failed` \| `refunded` |
| `planSlug` | String | ❌ | Plan purchased |
| `createdAt` | Date | Auto | Mongoose timestamps |

---

## Entity Relationships

```
users (1) ──────── (N) contracts
users (1) ──────── (N) riskanalyses
users (1) ──────── (N) auditlogs
users (1) ──────── (N) subscriptions
users (1) ──────── (N) creditledgers
users (1) ──────── (N) payments
plans (1) ──────── (N) subscriptions
contracts (1) ──── (N) riskanalyses
```
