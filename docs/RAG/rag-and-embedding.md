# RAG & Embedding Pipeline — Aqdy Platform

> **Retrieval-Augmented Generation (RAG)** is the core intelligence layer of Aqdy.  
> It allows the AI to ground its contract analysis in a curated knowledge base of **102 real legal clauses**, rather than relying solely on the LLM's parametric memory.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Knowledge Base — `legal_kb.json`](#knowledge-base--legal_kbjson)
4. [KB Schema Versions](#kb-schema-versions)
5. [Embedding Script — `embedKB.ts`](#embedding-script--embedkbts)
6. [RAG Query Flow](#rag-query-flow)
7. [Related Services](#related-services)
8. [Environment Variables](#environment-variables)
9. [How to Run the Embedding Pipeline](#how-to-run-the-embedding-pipeline)
10. [Clause Schema Reference](#clause-schema-reference)
11. [Risk Level Reference](#risk-level-reference)
12. [Category Reference](#category-reference)
13. [Troubleshooting](#troubleshooting)

### Related Documentation

| Document | Description |
|---|---|
| [LEGAL_KB.md](./LEGAL_KB.md) | Full clause inventory — all 102 clauses with risk levels and legal references |
| [KB_CURATION_PROCESS.md](./KB_CURATION_PROCESS.md) | How to add, edit, validate, and re-embed KB clauses |
| [MENA_BUSINESS_NORMS.md](./MENA_BUSINESS_NORMS.md) | Egyptian & MENA legal context behind the KB risk assessments |

---

## Overview

The Aqdy platform uses a **two-stage RAG pipeline**:

| Stage | What Happens |
|-------|-------------|
| **Offline (one-time)** | Legal clauses from `legal_kb.json` are embedded and stored in Pinecone via `embedKB.ts` |
| **Online (per request)** | When a user uploads a contract, each clause is semantically searched against Pinecone to retrieve the most similar known risky clauses, which are then injected into the LLM prompt |

This architecture ensures the LLM always has **domain-specific, legally-grounded context** when analyzing a contract.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     OFFLINE (Run Once)                          │
│                                                                 │
│  legal_kb.json  ──►  embedKB.ts  ──►  Pinecone Index           │
│  (102 clauses)       (upsertRecords)   "legal-kb"              │
│                       multilingual-e5-large embedding           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     ONLINE (Per Request)                        │
│                                                                 │
│  User Contract                                                  │
│      │                                                          │
│      ▼                                                          │
│  Clause Extraction (LLM)                                        │
│      │                                                          │
│      ▼                                                          │
│  Semantic Search ──► Pinecone "legal-kb" ──► Top-K Matches     │
│      │                                                          │
│      ▼                                                          │
│  Augmented Prompt = Clause + Retrieved KB Context              │
│      │                                                          │
│      ▼                                                          │
│  Gemma 4 31B (Primary) / Gemma 4 26B MoE (Fallback)           │
│      │                                                          │
│      ▼                                                          │
│  Risk Analysis JSON → Saved to MongoDB                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Knowledge Base — `legal_kb.json`

**Primary file:** `backend/src/data/legal_kb.json`  
**Legacy file:** `backend/src/data/legalKB.json` *(original 50-clause flat array — kept for reference)*

### What It Contains

A structured JSON object containing **102 legal clause objects**, each representing a known risky clause pattern commonly found in Egyptian and MENA-region contracts.

```json
{
  "version": "1.0",
  "lastUpdated": "2025-05-21",
  "totalEntries": 102,
  "embeddingModel": "multilingual-e5-large",
  "embeddingDimensions": 1024,
  "clauses": [ ... ]
}
```

The clauses cover a wide range of contract types:

| Contract Type | Description |
|---|---|
| `Employment Agreement` | Full-time employment contracts |
| `Freelance Contract` | Independent contractor agreements |
| `Service Agreement` | B2B service contracts |
| `Consulting Agreement` | Professional consulting engagements |
| `NDA` | Non-disclosure agreements |
| `Vendor Agreement` | Supplier / vendor contracts |
| `Subscription Agreement` | SaaS / subscription contracts |

### Multilingual Support

Every clause has **parallel Arabic and English** content in the `explanation`, `whyRisky`, `saferAlternative`, and `negotiationTips` fields. This enables the system to respond in the same language as the uploaded contract.

---

## KB Schema Versions

The embedding script supports two schema versions automatically:

### v1 — Legacy Flat Array (`legalKB.json`)

```json
[
  {
    "id": "clause_001_unlimited_liability",
    "category": "liability",
    "riskLevel": "critical",
    "clausePattern": "The Service Provider shall be liable for unlimited damages...",
    "keywords": ["unlimited liability", "liable", "مسؤولية غير محدودة"],
    "explanation": { "ar": "...", "en": "..." },
    "whyRisky": { "ar": "...", "en": "..." },
    "saferAlternative": { "ar": "...", "en": "..." },
    "relatedLaw": "Egyptian Civil Code Article 224",
    "contractTypes": ["service_agreement", "freelance"]
  }
]
```

### v2 — Structured Object (`legal_kb.json`) ✅ Active

```json
{
  "version": "1.0",
  "lastUpdated": "2025-05-21",
  "totalEntries": 102,
  "embeddingModel": "multilingual-e5-large",
  "embeddingDimensions": 1024,
  "clauses": [
    {
      "id": "clause_001_unlimited_liability",
      "category": "Liability",
      "riskLevel": "critical",
      "clausePattern": "Service Provider shall be liable for all damages...",
      "explanation": { "ar": "...", "en": "..." },
      "whyRisky": { "ar": "...", "en": "..." },
      "saferAlternative": { "ar": "...", "en": "..." },
      "negotiationTips": { "ar": "...", "en": "..." },
      "context": {
        "contractTypes": ["Service Agreement", "Freelance Contract"],
        "frequency": "very_common",
        "applicableRegions": ["Egypt", "MENA"]
      },
      "relatedLaw": {
        "egyptianLaw": "Egyptian Civil Code Articles 163-164 and Article 224",
        "country": "Egypt"
      },
      "precedents": ["contract_001_service.txt"],
      "version": 1,
      "createdAt": "2025-05-21T10:00:00Z",
      "updatedAt": "2025-05-21T10:00:00Z"
    }
  ]
}
```

### Schema Differences

| Field | v1 | v2 |
|---|---|---|
| Top-level structure | Plain array `[]` | Object with metadata header |
| `keywords` | ✅ Present | ❌ Not present |
| `negotiationTips` | ❌ Not present | ✅ Present |
| `context.frequency` | ❌ Not present | ✅ Present |
| `context.applicableRegions` | ❌ Not present | ✅ Present |
| `relatedLaw` | `string` | `{ egyptianLaw, country }` object |
| `contractTypes` | Top-level array | Inside `context.contractTypes` |
| `category` casing | lowercase (`liability`) | Title case (`Liability`) |

---

## Embedding Script — `embedKB.ts`

**File path:** `backend/src/scripts/embedKB.ts`

This is a **one-time setup script** (safe to re-run — idempotent) that reads `legal_kb.json`, creates a Pinecone serverless index if it doesn't exist, and upserts all clause embeddings.

### Auto-Detection Logic

The script automatically detects and handles both KB schema versions:

```
Priority order (first found wins):
  1. backend/src/data/legal_kb.json   ← v2, 102 clauses (preferred)
  2. src/data/legal_kb.json           ← v2, run from /backend dir
  3. backend/src/data/legalKB.json    ← v1, 50 clauses (legacy fallback)
  4. src/data/legalKB.json            ← v1, run from /backend dir
```

### What the Script Does (Step by Step)

#### Step 1 — Load & Normalise the Knowledge Base

```typescript
const clauses = loadKB(process.cwd());
```

- Resolves the KB file from the candidate list above
- Detects v1 (plain array) vs v2 (object with `clauses` key)
- Normalises both formats into a common `NormalisedClause` interface
- Fails fast with a clear error if no KB file is found

#### Step 2 — Connect to Pinecone & Create Index

```typescript
const pc = new Pinecone({ apiKey });
await pc.createIndexForModel({
  name: "legal-kb",
  cloud: "aws",
  region: "us-east-1",
  embed: {
    model: "multilingual-e5-large",
    fieldMap: { text: "text" },
  },
  waitUntilReady: true,
});
```

- Uses **Pinecone's integrated inference** — no separate embedding API call needed
- Model: **`multilingual-e5-large`** — supports Arabic and English natively
- Skips creation if index `"legal-kb"` already exists

#### Step 3 — Prepare Records

```typescript
const text = `${c.clausePattern}\n${c.explanation.en}\n${c.explanation.ar}`;
```

The **text field** (which gets embedded) is a concatenation of:
1. `clausePattern` — the legal clause template text
2. `explanation.en` — English explanation
3. `explanation.ar` — Arabic explanation

All other clause fields are stored as **metadata** alongside the vector:

| Metadata Field | v1 | v2 | Description |
|---|---|---|---|
| `_id` | ✅ | ✅ | `clause.id` |
| `text` | ✅ | ✅ | Embedded text (pattern + explanations) |
| `category` | ✅ | ✅ | Topic category |
| `riskLevel` | ✅ | ✅ | `critical` / `high` / `medium` / `low` |
| `explanation_ar` | ✅ | ✅ | Arabic explanation |
| `explanation_en` | ✅ | ✅ | English explanation |
| `whyRisky_ar` | ✅ | ✅ | Risk rationale (Arabic) |
| `whyRisky_en` | ✅ | ✅ | Risk rationale (English) |
| `saferAlternative_ar` | ✅ | ✅ | Safer wording (Arabic) |
| `saferAlternative_en` | ✅ | ✅ | Safer wording (English) |
| `negotiationTips_ar` | ❌ empty | ✅ | Negotiation tips (Arabic) |
| `negotiationTips_en` | ❌ empty | ✅ | Negotiation tips (English) |
| `relatedLaw` | ✅ | ✅ | Egyptian law citation (normalised to string) |
| `contractTypes` | ✅ | ✅ | Applicable contract types |
| `keywords` | ✅ | ❌ empty | Bilingual keyword list |
| `frequency` | ❌ empty | ✅ | How common this clause pattern is |
| `applicableRegions` | ❌ empty | ✅ | Geographic regions (e.g., `["Egypt", "MENA"]`) |

#### Step 4 — Batch Upsert

```typescript
const batchSize = 25;
for (let i = 0; i < records.length; i += batchSize) {
  const batch = records.slice(i, i + batchSize);
  await index.upsertRecords({ records: batch });
}
```

- Records upserted in batches of **25** to respect Pinecone rate limits
- Uses `upsertRecords` (integrated inference API), not the legacy `upsert`
- Fully **idempotent** — safe to re-run after KB changes

---

## RAG Query Flow

During contract analysis, the RAG retrieval works as follows:

```
1. User uploads contract (PDF/DOCX)
   └─► Text extracted and stored in MongoDB (contract.service.ts)

2. Clause Extraction Agent (LLM)
   └─► Breaks contract into individual clauses

3. For each clause → Pinecone Semantic Search
   └─► Query: clause text
   └─► Returns: top-K most similar KB entries with full metadata

4. Augmented Prompt Construction
   └─► [System Prompt] + [Clause Text] + [Retrieved KB Context]
   └─► Injected into Gemma 4 31B via llm.service.ts

5. LLM generates structured JSON:
   {
     riskLevel, explanation, whyRisky,
     saferAlternative, negotiationTips, relatedLaw, confidence
   }

6. Result saved to MongoDB via analysis.service.ts
```

---

## Related Services

### [`llm.service.ts`](../../backend/src/services/llm.service.ts)

Handles all LLM calls with automatic retry and fallback:

| Model | Role |
|---|---|
| `gemma-4-31b-it` | Primary — used for complex clause analysis |
| `gemma-4-26b-a4b-it` | Fallback — activates if primary fails all 3 retries |

**Retry strategy:** Exponential backoff — 1s → 2s → 4s between attempts.

```typescript
const response = await llmService.call(prompt, {
  systemPrompt: RISK_CLASSIFICATION_SYSTEM_PROMPT,
  temperature: 0.1,
  maxTokens: 4096,
});
```

### [`langchain.config.ts`](../../backend/src/config/langchain.config.ts)

Defines reusable LangChain model instances and system prompts:

| Prompt Constant | Purpose |
|---|---|
| `CONTRACT_ANALYSIS_SYSTEM_PROMPT` | General analysis role definition |
| `EXTRACTION_SYSTEM_PROMPT` | Clause extraction → JSON array |
| `RISK_CLASSIFICATION_SYSTEM_PROMPT` | Risk scoring with law references |
| `REDLINE_SYSTEM_PROMPT` | Suggest safer clause alternatives |

### [`analysis.service.ts`](../../backend/src/services/analysis.service.ts)

Persists the final risk analysis results to MongoDB.

### [`contract.service.ts`](../../backend/src/services/contract.service.ts)

Manages contract CRUD — save, retrieve, update, and delete user contracts.

---

## Environment Variables

The following `.env` variables are required for the RAG/embedding pipeline:

```env
# Pinecone — Vector database for knowledge base
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=legal-kb

# Google Gemini — Powers the Gemma 4 LLMs
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB — Stores contracts and analysis results
MONGODB_URI=mongodb+srv://...

# Auth
JWT_SECRET=your_jwt_secret

# Observability (LangFuse)
LANGFUSE_SECRET_KEY=your_langfuse_secret
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
```

All variables are validated at startup via **Zod schema** in [`env.ts`](../../backend/src/config/env.ts). The app will refuse to start if any required variable is missing.

> **Note:** `embedKB.ts` loads `PINECONE_API_KEY` separately with a fallback path:  
> It looks for `.env` in `process.cwd()` first, then in `../` (one level up).

---

## How to Run the Embedding Pipeline

> ⚠️ **Run this only once** (or when `legal_kb.json` is updated).  
> Running it again is safe — Pinecone upsert is idempotent.

### From the project root

```bash
npx ts-node backend/src/scripts/embedKB.ts
```

### From the `backend/` directory

```bash
npx ts-node src/scripts/embedKB.ts
```

### Expected Console Output

```
🚀 Starting Legal KB Embedding pipeline (multilingual-e5-large)...
📂 Loaded 102 clauses from backend/src/data/legal_kb.json (KB v1.0, updated 2025-05-21)
✅ Index "legal-kb" already exists.

📤 Upserting 102 clauses to Pinecone index "legal-kb"…
   Upserting batch 1 (25 records)…
   Upserting batch 2 (25 records)…
   Upserting batch 3 (25 records)…
   Upserting batch 4 (25 records)…
   Upserting batch 5 (2 records)…

🎉 Success: Confirmed that all 102 clauses have been embedded and upserted into Pinecone!
```

---

## Clause Schema Reference

### v2 Schema (Active — `legal_kb.json`)

```typescript
interface ClauseV2 {
  id: string;              // Unique slug, e.g. "clause_001_unlimited_liability"
  category: string;        // Title case, e.g. "Liability", "Non-Compete", "IP Rights"
  riskLevel: string;       // "critical" | "high" | "medium" | "low"
  clausePattern: string;   // Template text of the risky clause in English
  explanation: {
    ar: string;            // Arabic explanation of what the clause means
    en: string;            // English explanation
  };
  whyRisky: {
    ar: string;            // Why this clause is dangerous (Arabic)
    en: string;            // Why this clause is dangerous (English)
  };
  saferAlternative: {
    ar: string;            // Recommended safer clause wording (Arabic)
    en: string;            // Recommended safer clause wording (English)
  };
  negotiationTips?: {      // NEW in v2 — actionable negotiation advice
    ar: string;
    en: string;
  };
  context?: {
    contractTypes: string[];       // e.g. ["Employment Agreement", "NDA"]
    frequency?: string;            // "very_common" | "common" | "occasional"
    applicableRegions?: string[];  // e.g. ["Egypt", "MENA", "International"]
  };
  relatedLaw?: {           // NEW in v2 — structured law reference
    egyptianLaw?: string;  // e.g. "Egyptian Civil Code Article 224"
    country?: string;      // e.g. "Egypt"
  };
  precedents?: string[];   // Reference contract filenames
  version?: number;        // Clause revision number
  createdAt?: string;      // ISO 8601 timestamp
  updatedAt?: string;      // ISO 8601 timestamp
}
```

### v1 Schema (Legacy — `legalKB.json`)

```typescript
interface ClauseV1 {
  id: string;
  category: string;        // lowercase, e.g. "liability"
  riskLevel: string;       // "critical" | "high" | "medium" | "low"
  clausePattern: string;
  keywords: string[];      // Bilingual keywords for matching
  explanation: { ar: string; en: string };
  whyRisky: { ar: string; en: string };
  saferAlternative: { ar: string; en: string };
  relatedLaw?: string;     // Plain string, e.g. "Egyptian Civil Code Article 224"
  contractTypes: string[]; // lowercase, e.g. ["service_agreement", "freelance"]
}
```

---

## Risk Level Reference

| Level | Color Code | Description |
|---|---|---|
| `critical` | 🔴 | Immediately dangerous — can cause catastrophic financial or legal harm; may be illegal |
| `high` | 🟠 | Seriously unfair or violates Egyptian labor/civil law |
| `medium` | 🟡 | Requires negotiation — unfavorable but not immediately harmful |
| `low` | 🟢 | Minor concern — worth noting, or even a positive/protective clause |

---

## Category Reference

### v2 Categories (Title Case)

| Category | Example Clause Type |
|---|---|
| `Liability` | Unlimited liability, joint and several liability |
| `Termination` | Unilateral termination, no severance, automatic renewal |
| `Payment` | Discretionary payment, 90-day terms, compound interest |
| `IP Rights` | Broad IP assignment, moral rights waiver, ownership disputes |
| `Non-Compete` | Broad geographic scope, excessive duration |
| `Confidentiality` | Indefinite NDA, no legal-disclosure exception |
| `Dispute Resolution` | Foreign jurisdiction, forced arbitration |
| `Privacy` | Broad data sharing, device monitoring |
| `Working Conditions` | Mandatory unpaid overtime |
| `Compensation` | Unilateral salary cuts |
| `Leave` | Discretionary leave denial |
| `Scope of Work` | Scope creep without compensation |
| `Force Majeure` | Overly narrow force majeure definition |
| `Warranties` | Full warranty disclaimer |
| `Non-Solicitation` | Excessive post-employment restrictions |
| `Exclusivity` | Full exclusivity without compensation |
| `Employment Terms` | Illegal probation period (>3 months) |
| `Amendment` | Unilateral contract modification |
| `Indemnification` | Blanket indemnity covering client's own faults |
| `Governing Law` | Non-Egyptian governing law |

### v1 Categories (snake_case — legacy)

`liability`, `termination`, `payment`, `intellectual_property`, `non_compete`, `confidentiality`, `dispute_resolution`, `privacy`, `working_conditions`, `compensation`, `leave`, `scope_of_work`, `force_majeure`, `warranties`, `non_solicitation`, `exclusivity`, `employment_terms`, `performance`, `amendment`, `indemnification`, `obligations`, `penalties`, `notices`, `governing_law`

---

## Troubleshooting

### ❌ `PINECONE_API_KEY is not set`

Ensure `.env` exists and contains `PINECONE_API_KEY`.  
The script checks `process.cwd()/.env` and `process.cwd()/../.env`.

### ❌ `Legal KB file not found`

Run the script from the project root (not a subdirectory):

```bash
# ✅ Correct
cd aqdy-platform
npx ts-node backend/src/scripts/embedKB.ts
```

### ❌ `upsertRecords is not a function`

Ensure you are using `@pinecone-database/pinecone` SDK **v3+**, which supports the integrated inference API (`upsertRecords`). Older versions only have `upsert`.

```bash
npm install @pinecone-database/pinecone@latest
```

### ⚠️ `legal_kb.json has no 'clauses' array`

The v2 file is malformed — the top-level `clauses` key is missing or the file is a plain array instead of an object. Verify the file starts with `{` not `[`.

### ⚠️ Index already exists but data seems wrong

Re-run the script — `upsertRecords` is idempotent and will overwrite existing vectors by `_id`.

### ⚠️ Arabic text not matching correctly

The `multilingual-e5-large` model natively supports Arabic. If matches seem poor, verify the `text` field in Pinecone console — it should contain Arabic text from `explanation.ar`.

### ⚠️ Record count in Pinecone is less than 102

If you deleted clauses from the JSON but they still appear in Pinecone, you must delete them manually. `upsertRecords` only adds/updates — it does not remove deleted entries. See [KB_CURATION_PROCESS.md § Deleting a Clause](./KB_CURATION_PROCESS.md#5-deleting-a-clause).