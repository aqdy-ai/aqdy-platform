# Aqdy — Architecture

This document describes the system architecture of Aqdy v1.0: an AI-powered legal contract analysis platform with bilingual (Arabic/English) support, a three-agent AI pipeline, a credit-based subscription model, and Stripe payment integration.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Backend](#backend)
4. [Three-Agent AI Pipeline](#three-agent-ai-pipeline)
5. [Frontend](#frontend)
6. [Data Models](#data-models)
7. [Authentication & Authorization](#authentication--authorization)
8. [Credits & Subscription System](#credits--subscription-system)
9. [Payment Integration](#payment-integration)
10. [Knowledge Base & RAG](#knowledge-base--rag)
11. [Security](#security)
12. [Observability](#observability)
13. [Infrastructure & Deployment](#infrastructure--deployment)
14. [Data Flow: End-to-End Contract Analysis](#data-flow-end-to-end-contract-analysis)
15. [External Services](#external-services)

---

## System Overview

Aqdy is a full-stack SaaS application. Users upload contract documents (PDF or DOCX), which are processed by a three-agent AI pipeline built on Google Gemini and LangChain. The pipeline extracts clauses, classifies risk, and generates redline suggestions grounded in a 150+ clause legal knowledge base stored in Pinecone. Results are presented in a bilingual, RTL-safe dashboard.

**Core technologies:**

| Layer | Technology |
|-------|-----------|
| Backend runtime | Node.js + Express |
| Frontend | React (Vite) + Tailwind CSS |
| Database | MongoDB Atlas (Mongoose) |
| AI models | Google Gemini (via LangChain) |
| Vector search | Pinecone |
| AI tracing | Langfuse |
| Payments | Stripe |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                          CLIENT                              │
│              React SPA (Vite + Tailwind + i18n)              │
│              Arabic / English  ·  RTL / LTR                  │
└────────────────────────┬─────────────────────────────────────┘
                         │  HTTPS (REST API)
┌────────────────────────▼─────────────────────────────────────┐
│                      BACKEND (Express)                       │
│                                                              │
│  Auth Middleware → Credit Enforcement → Rate Limiter         │
│                                                              │
│  Routes: /api/auth  /api/contracts  /api/account             │
│          /api/plans  /api/payments  /api/admin               │
│                                                              │
│  ┌─────────────────────────────────────────────────┐         │
│  │           Three-Agent AI Pipeline               │         │
│  │  Extractor → Risk Classifier → Redline Agent    │         │
│  │         (orchestrated via LangChain)            │         │
│  └──────────────────┬──────────────────────────────┘         │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────┐         │
│  │                  Services                       │         │
│  │  llmService · ragService · creditService        │         │
│  │  documentParsing · piiFiltering · paymentService│         │
│  └──────────────────┬──────────────────────────────┘         │
└─────────────────────┼────────────────────────────────────────┘
                      │
        ┌─────────────┼──────────────┐
        │             │              │
┌───────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
│ MongoDB Atlas│ │ Pinecone │ │   Gemini   │
│  (primary DB)│ │(vector DB│ │    API     │
└──────────────┘ └──────────┘ └────────────┘
        │
┌───────▼─────────────────────────────────────┐
│   Langfuse (tracing) · Stripe (payments)    │
└─────────────────────────────────────────────┘
```

---

## Backend

The backend is a **Node.js + Express** application structured around services, middleware, and route handlers.

### Directory Structure

```
src/
├── agents/
│   ├── extractorAgent.js      # Clause extraction agent
│   ├── classifierAgent.js     # Risk classification agent
│   └── redlineAgent.js        # Redline & negotiation agent
├── middleware/
│   ├── auth.js                # JWT verification
│   ├── validateInput.js       # Request body & file validation
│   ├── rateLimit.js           # IP + user-level rate limiting
│   └── creditEnforcement.js   # Pre-analysis credit balance check
├── models/                    # Mongoose schemas (see Data Models)
├── routes/
│   ├── auth.js                # /api/auth/*
│   ├── contracts.js           # /api/contracts/*
│   ├── account.js             # /api/account/*
│   ├── plans.js               # /api/plans/*
│   ├── payments.js            # /api/payments/*
│   └── admin.js               # /api/admin/* (admin role required)
├── services/
│   ├── agentOrchestration.js  # Chains the three agents
│   ├── creditService.js       # Credit deduction, granting, balance
│   ├── documentParsing/
│   │   ├── pdfParser.js       # pdf-parse
│   │   └── docxParser.js      # docx library
│   ├── llmService.js          # Gemini API wrapper
│   ├── paymentService.js      # Stripe wrapper
│   ├── piiFiltering.js        # PII detection & redaction
│   └── ragService.js          # Pinecone semantic search
└── app.js
```

### API Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT cookie |
| POST | `/api/auth/logout` | Clear session |
| POST | `/api/contracts/upload` | Upload PDF/DOCX, parse & save |
| POST | `/api/contracts/analyze` | Trigger AI analysis pipeline |
| GET | `/api/contracts/:id/analysis` | Fetch analysis result |
| GET | `/api/account/profile` | Get user profile |
| PATCH | `/api/account/profile` | Update name/email/password |
| DELETE | `/api/account` | Soft delete account |
| GET | `/api/account/subscription` | Current subscription details |
| POST | `/api/account/subscription/upgrade` | Change plan |
| POST | `/api/account/subscription/cancel` | Cancel subscription |
| GET | `/api/account/credits` | Balance, usage, allowance |
| GET | `/api/account/credits/history` | Paginated credit ledger |
| GET | `/api/account/contracts` | Contract history (paginated, filterable) |
| GET | `/api/account/contracts/:id` | Contract detail + latest analysis |
| DELETE | `/api/account/contracts/:id` | Soft delete contract |
| GET | `/api/account/contracts/export` | CSV/JSON export (Pro/Enterprise) |
| GET | `/api/account/payments` | Billing history |
| GET | `/api/account/payments/:id/invoice` | Download invoice PDF |
| GET | `/api/plans` | List all active plans (public) |
| POST | `/api/payments/checkout` | Create Stripe Checkout session |
| POST | `/api/payments/webhook` | Stripe webhook handler |
| GET | `/api/admin/stats` | Platform stats (admin only) |
| GET | `/api/admin/accounts` | All user accounts (admin only) |
| PATCH | `/api/admin/accounts/:id` | Change plan/status/credits (admin only) |

Full request/response schemas are documented in the OpenAPI/Swagger spec (`/api/docs`).

---

## Three-Agent AI Pipeline

The core of Aqdy is a sequential three-agent pipeline orchestrated via LangChain and powered by Google Gemini.

```
Contract Text
      │
      ▼
┌─────────────────────┐
│   Extractor Agent   │  Extracts discrete clauses from raw contract text.
│                     │  Output: structured clause list with titles and text.
│  extractorAgent.js  │  Handles Arabic and English, long contracts, edge cases.
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Risk Classifier     │  Classifies each clause: risk level (High/Medium/Low),
│     Agent           │  confidence score, and KB source reference.
│                     │  Links to Pinecone RAG for grounded classifications.
│ classifierAgent.js  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Redline Generator  │  For each risky clause: generates alternative text,
│      Agent          │  redline diff, and negotiation talking points.
│                     │  Output grounded in KB safer alternatives.
│  redlineAgent.js    │
└─────────┬───────────┘
          │
          ▼
    Structured Analysis Result
    (saved to MongoDB as RiskAnalysis)
```

### Orchestration (`agentOrchestration.js`)

- Chains all three agents sequentially
- Handles retries with exponential backoff for LLM failures
- Enforces per-request timeout protection
- After pipeline completion, records real token usage (from Langfuse trace) and calls `creditService.deductCredits()`
- Logs all executions to `AuditLog`

### Cost Estimation

Before pipeline execution, `creditEnforcement` middleware estimates the cost:

```
Estimated cost = 50 (base) + (inputTokens / 100) + (outputTokens / 50)
```

The request is blocked with HTTP `402` if the user's balance is insufficient.

---

## Frontend

The frontend is a **React SPA** built with Vite, Tailwind CSS, and react-i18next.

### Key Pages

| Page | Path | Description |
|------|------|-------------|
| `Login` / `Register` | `/login`, `/register` | Auth flows with JWT cookie handling |
| `Dashboard` | `/dashboard` | Upload + analysis results |
| `ContractHistory` | `/history` | All user contracts with filters, pagination |
| `AccountSettings` | `/settings` | Profile, password, current plan |
| `Pricing` | `/pricing` | Plan comparison, upgrade CTAs |
| `BillingHistory` | `/billing` | Payment table, invoice download |
| `AdminDashboard` | `/admin` | Stats, accounts, payments (admin only) |

### Bilingual Support

- **react-i18next** for all UI strings via `locales/en.json` and `locales/ar.json`
- **tailwindcss-rtl** for RTL layout mirroring
- Language direction (`dir="rtl"` or `dir="ltr"`) applied at the root level on language switch
- All user-facing components tested in both languages and both text directions

### Key Components

```
components/
├── RiskAnalysisDashboard.jsx   # Executive summary: risk gauge, stats bar, donut chart
├── ClauseCard.jsx              # Expandable clause row with redline diff and KB source
├── RedlineComparison.jsx       # Original vs suggested text (diff highlighted)
├── CreditsWidget.jsx           # Credits usage bar, low-balance warning, upgrade CTA
├── UpgradeModal.jsx            # Plan comparison + Stripe Checkout redirect
└── ContractHistoryRow.jsx      # Table row with quick-preview, re-analyze, delete
```

---

## Data Models

### User

```js
{
  name: String,
  email: String (unique),
  passwordHash: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  plan: String,                    // 'free' | 'pro' | 'enterprise'
  status: { type: String, enum: ['active', 'suspended', 'deleted'] },
  credits: {
    balance: Number,
    lifetimeUsed: Number,
    lastResetAt: Date
  },
  createdAt: Date,
  lastLogin: Date
}
```

### Contract

```js
{
  userId: ObjectId (ref: User),    // indexed with createdAt
  filename: String,
  language: String,                // 'ar' | 'en'
  rawText: String,
  status: String,                  // 'pending' | 'analyzed' | 'failed'
  createdAt: Date
}
```

### RiskAnalysis

```js
{
  contractId: ObjectId (ref: Contract),
  userId: ObjectId (ref: User),
  version: Number,
  executiveSummary: String,
  overallRiskLevel: String,        // 'low' | 'medium' | 'high' | 'critical'
  clauses: [{
    title: String,
    originalText: String,
    shortSummary: String,
    detailedExplanation: String,
    riskLevel: String,
    confidenceScore: Number,
    suggestedText: String,
    talkingPoints: [String],
    kbSource: { clauseId: String, title: String, confidence: Number }
  }],
  creditsUsed: Number,
  inputTokens: Number,
  outputTokens: Number,
  createdAt: Date
}
```

### Plan

```js
{
  name: String,                    // 'Free' | 'Pro' | 'Enterprise'
  slug: String,                    // 'free' | 'pro' | 'enterprise'
  price: Number,
  billingCycle: String,            // 'monthly' | 'annual'
  monthlyCredits: Number,          // 500 | 5000 | 50000
  storageLimit: Number,            // max contracts (Free: 10)
  features: [String],
  isActive: Boolean
}
```

### CreditLedger

```js
{
  userId: ObjectId (ref: User),
  delta: Number,                   // positive = grant, negative = deduction
  reason: {
    type: String,
    enum: ['plan_grant', 'analysis_deduction', 'refund', 'admin_adjustment']
  },
  referenceId: ObjectId,           // analysis ID or payment ID
  tokensUsed: Number,
  balanceBefore: Number,
  balanceAfter: Number,
  createdAt: Date
}
```

### Subscription

```js
{
  userId: ObjectId (ref: User),
  planId: ObjectId (ref: Plan),
  status: String,                  // 'active' | 'cancelled' | 'expired'
  startDate: Date,
  endDate: Date,
  renewalDate: Date,
  cancelledAt: Date
}
```

### Payment

```js
{
  userId: ObjectId (ref: User),
  subscriptionId: ObjectId (ref: Subscription),
  amount: Number,
  currency: String,
  status: String,                  // 'pending' | 'succeeded' | 'failed' | 'refunded'
  provider: String,                // 'stripe'
  providerTxId: String,
  description: String,
  createdAt: Date                  // indexed with userId
}
```

### AuditLog

```js
{
  userId: ObjectId (ref: User),
  action: String,                  // 'upload' | 'analyze' | 'login' | 'plan_change' | ...
  metadata: Object,
  langfuseTraceId: String,
  createdAt: Date
}
```

---

## Authentication & Authorization

- **JWT** issued on login, stored in an **httpOnly secure cookie** (not localStorage)
- Token verified in `middleware/auth.js` on all protected routes
- Token contains `{ userId, role, plan }`
- **Roles:** `user` (default) and `admin`
- Admin-only routes (all `/api/admin/*`) are protected by a role guard that returns `403` for non-admins
- Ownership is enforced per-resource: users can only access their own contracts, payments, and account data

---

## Credits & Subscription System

The credit system measures and limits usage across subscription tiers.

```
User signs up → assigned Free plan (500 credits/month)
                          │
         ┌────────────────┼────────────────┐
         │                │                │
   Uploads contract   Upgrades to      Subscribes to
                       Pro (5,000)    Enterprise (50,000)
                          │
                     Monthly reset on renewal date
                     (credits do not carry over)
```

### Per-Analysis Flow

```
1. User requests analysis
2. creditEnforcement middleware:
   a. Calls creditService.estimateCost(inputTokens, outputTokens)
   b. Checks user.credits.balance >= estimatedCost
   c. If insufficient → HTTP 402 with balance info and upgrade CTA
3. Pipeline executes
4. agentOrchestration.js calls creditService.deductCredits()
   using real token counts from Langfuse trace
5. CreditLedger entry written (delta, balanceBefore, balanceAfter)
6. User balance updated atomically
```

### `creditService.js` API

| Method | Description |
|--------|-------------|
| `estimateCost(inputTokens, outputTokens)` | Returns estimated credit cost |
| `deductCredits(userId, cost, reason, referenceId)` | Atomic balance deduction + ledger entry |
| `grantMonthlyCredits(userId)` | Grants plan allowance, resets balance |
| `getBalance(userId)` | Returns `{ balance, lifetimeUsed, monthlyAllowance, percentUsed }` |

---

## Payment Integration

Aqdy uses **Stripe Checkout** for subscription management.

### Checkout Flow

```
User clicks "Upgrade to Pro"
        │
        ▼
POST /api/payments/checkout
  → Creates Stripe Checkout session
  → Returns session URL
        │
        ▼
User redirected to Stripe-hosted checkout page
        │
   ┌────▼────┐
   │ Success │ → GET /api/payments/success
   │         │   Verify session → activate subscription
   │         │   Grant monthly credits
   └─────────┘
   │  Cancel │ → GET /api/payments/cancel
   └─────────┘

Ongoing events handled by:
POST /api/payments/webhook (Stripe signature verified)
  • checkout.session.completed → activate subscription
  • invoice.paid              → renew subscription, grant credits
  • invoice.payment_failed    → notify user
  • customer.subscription.deleted → downgrade to Free
```

---

## Knowledge Base & RAG

The legal knowledge base underpins the Risk Classifier and Redline agents.

```
150+ curated legal clauses
(title, bilingual explanation, risk level, safer alternatives, MENA context)
         │
         ▼
  Embedding script (Google text-embedding-004)
         │
         ▼
  Pinecone vector index
         │
         ▼
  ragService.js
  ├── semantic_search(query) → cosine similarity top-k
  ├── MMR reranking          → diversity in results
  └── confidence scoring     → returned with each KB match
```

Agents receive the most relevant KB clauses as context in their prompts. This grounds classifications and redline suggestions in curated legal knowledge rather than pure LLM generation, reducing hallucinations and improving legal accuracy toward the 95%+ target.

---

## Security

| Control | Implementation |
|---------|---------------|
| Input validation | `validateInput.js` middleware on all endpoints |
| PII filtering | `piiFiltering.js` redacts phone, email, ID, card numbers before AI processing |
| Prompt injection | `promptSanitization.js` removes suspicious patterns before LLM input |
| Rate limiting | `rateLimit.js` — user-level (10 analyses/day on Free) and IP-level |
| Authentication | JWT in httpOnly cookies; no localStorage |
| Authorization | Role-based (user/admin), resource ownership enforced per-request |
| Stripe webhook | Signature verified via `stripe.webhooks.constructEvent()` |
| Secrets | All API keys in environment variables; never in source code |
| HTTPS | TLS enforced in production |
| Credit enforcement | HTTP 402 before any analysis when balance is insufficient |

---

## Observability

| Tool | Purpose |
|------|---------|
| **Langfuse** | Per-agent tracing, token usage, latency, cost attribution |
| **AuditLog (MongoDB)** | User action log linked to Langfuse trace IDs |
| **Structured logging** | Winston/Pino JSON logs throughout the backend |
| **CloudWatch / monitoring** | Infrastructure metrics, uptime, error rates |
| **Alerts** | Failed payments, high error rates, plan limit abuse, low credit users |

Langfuse traces are the primary debugging tool for AI pipeline issues. Each trace captures the full input/output of each agent, token counts, and latency — used to compute accurate credit deductions.

---

## Infrastructure & Deployment

```
GitHub (source)
     │
     ▼
GitHub Actions (CI/CD)
  ├── Lint
  ├── Test
  ├── Build Docker images
  └── Deploy to staging → production (on main merge)
     │
     ▼
Cloud (AWS or equivalent)
  ├── Backend container (Node.js)
  ├── Frontend container (static build served via Nginx or CDN)
  └── MongoDB Atlas (managed)
```

### Docker

Each service is containerized:

```
docker-compose.yml
├── backend   (Node.js, port 4000)
├── frontend  (Vite build, port 3000)
└── mongo     (local dev only; Atlas used in staging/production)
```

### Environments

| Environment | Branch | Purpose |
|-------------|--------|---------|
| Local | any | Development |
| Staging | `develop` | Pre-launch testing, Stripe test keys |
| Production | `main` | Live users, Stripe live keys |

**No feature code is deployed to production directly.** All code must pass staging validation and a go/no-go review before merging to `main`.

---

## Data Flow: End-to-End Contract Analysis

```
1. User uploads PDF or DOCX
   └── POST /api/contracts/upload
       ├── multer handles file
       ├── pdfParser / docxParser extracts text
       ├── Language detected (Arabic / English)
       ├── Metadata saved to Contract (MongoDB)
       └── Returns contractId

2. User triggers analysis
   └── POST /api/contracts/analyze
       ├── auth middleware verifies JWT
       ├── creditEnforcement estimates cost → blocks if insufficient (402)
       ├── piiFiltering redacts sensitive data from raw text
       ├── agentOrchestration chains agents:
       │     extractorAgent → classifierAgent (+ RAG) → redlineAgent
       ├── Langfuse traces each agent
       ├── Real token counts extracted from trace
       ├── creditService.deductCredits() called
       ├── RiskAnalysis saved to MongoDB (linked to userId + contractId)
       ├── AuditLog entry written
       └── Analysis returned to client

3. Frontend renders results
   └── GET /api/contracts/:id/analysis
       ├── RiskAnalysisDashboard: risk gauge, stats bar, donut chart
       ├── Expandable ClauseCard rows (collapsed → full detail on click)
       ├── RedlineComparison: original vs suggested text (diff highlighted)
       ├── CreditsWidget: balance updated, cost of this analysis shown
       └── Bilingual output (AR/EN), RTL-safe layout
```

---

## External Services

| Service | Role | Docs |
|---------|------|------|
| Google Gemini API | LLM inference for all three agents | [ai.google.dev](https://ai.google.dev) |
| LangChain | Agent orchestration and LLM chaining | [js.langchain.com](https://js.langchain.com) |
| Pinecone | Vector database for KB semantic search | [pinecone.io/docs](https://docs.pinecone.io) |
| Langfuse | AI pipeline tracing and cost tracking | [langfuse.com/docs](https://langfuse.com/docs) |
| MongoDB Atlas | Primary database (managed) | [mongodb.com/atlas](https://www.mongodb.com/atlas) |
| Stripe | Payment processing and subscription management | [stripe.com/docs](https://stripe.com/docs) |

---

*Last updated: Sprint 1, Day 4. This document should be updated whenever significant architectural decisions are made. Owner: Kareem (coordinate), with all team members reviewing.*
