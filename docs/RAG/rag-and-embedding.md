# RAG & Embedding Pipeline — Aqdy Platform

> **Retrieval-Augmented Generation (RAG)** is the core intelligence layer of Aqdy.  
> It allows the AI to ground its contract analysis in a curated knowledge base of 50+ real legal clauses, rather than relying solely on the LLM's parametric memory.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Knowledge Base — `legalKB.json`](#knowledge-base--legalkbjson)
4. [Embedding Script — `embedKB.ts`](#embedding-script--embedkbts)
5. [RAG Query Flow](#rag-query-flow)
6. [Related Services](#related-services)
7. [Environment Variables](#environment-variables)
8. [How to Run the Embedding Pipeline](#how-to-run-the-embedding-pipeline)
9. [Clause Schema Reference](#clause-schema-reference)
10. [Risk Level Reference](#risk-level-reference)
11. [Category Reference](#category-reference)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Aqdy platform uses a **two-stage RAG pipeline**:

| Stage | What Happens |
|-------|-------------|
| **Offline (one-time)** | Legal clauses from `legalKB.json` are embedded and stored in Pinecone via `embedKB.ts` |
| **Online (per request)** | When a user uploads a contract, each clause is semantically searched against Pinecone to retrieve the most similar known risky clauses, which are then injected into the LLM prompt |

This architecture ensures the LLM always has **domain-specific, legally-grounded context** when analyzing a contract.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     OFFLINE (Run Once)                          │
│                                                                 │
│  legalKB.json  ──►  embedKB.ts  ──►  Pinecone Index            │
│  (50+ clauses)      (upsertRecords)   "legal-kb"               │
│                      multilingual-e5-large embedding            │
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

## Knowledge Base — `legalKB.json`

**File path:** `backend/src/data/legalKB.json`  
*(Also duplicated as `legal_kb.json` in the same directory — both are identical.)*

### What It Contains

A JSON array of **50+ legal clause objects**, each representing a known risky clause pattern commonly found in Egyptian and MENA-region contracts.

The clauses cover a wide range of contract types:

| Contract Type | Description |
|---|---|
| `employment` | Employment agreements |
| `freelance` | Freelance / independent contractor agreements |
| `service_agreement` | B2B service contracts |
| `vendor` | Vendor / supplier agreements |
| `subscription` | SaaS / subscription contracts |
| `nda` | Non-disclosure agreements |

### Sample Clause (abbreviated)

```json
{
  "id": "clause_001_unlimited_liability",
  "category": "liability",
  "riskLevel": "critical",
  "clausePattern": "The Service Provider shall be liable for unlimited damages arising from any breach",
  "keywords": ["unlimited liability", "liable", "damages", "مسؤولية غير محدودة"],
  "explanation": {
    "ar": "هذا الشرط يجعلك مسؤولاً عن أي خسائر بدون حد أقصى...",
    "en": "This clause makes you liable for unlimited damages without any cap..."
  },
  "whyRisky": {
    "ar": "قد يؤدي إلى خسائر مالية كبيرة جداً...",
    "en": "May result in catastrophic financial losses even for minor breaches..."
  },
  "saferAlternative": {
    "ar": "يجب تحديد المسؤولية بحد أقصى يساوي قيمة العقد...",
    "en": "Liability should be capped at the total contract value or 12 months of fees..."
  },
  "relatedLaw": "Egyptian Civil Code Article 224",
  "contractTypes": ["service_agreement", "freelance", "vendor"]
}
```

### Multilingual Support

Every clause has **parallel Arabic and English** content in the `explanation`, `whyRisky`, and `saferAlternative` fields. This enables the system to respond in the same language as the uploaded contract.

---

## Embedding Script — `embedKB.ts`

**File path:** `backend/src/scripts/embedKB.ts`

This is a **one-time setup script** that reads `legalKB.json`, creates a Pinecone serverless index (if it doesn't exist), and upserts all clause embeddings.

### What the Script Does (Step by Step)

#### Step 1 — Load the Knowledge Base

```typescript
let kbPath = path.join(process.cwd(), "backend/src/data/legalKB.json");
// Fallback if run from within /backend directory:
kbPath = path.join(process.cwd(), "src/data/legalKB.json");
const clauses: Clause[] = JSON.parse(fs.readFileSync(kbPath, "utf-8"));
```

- Resolves the path from either the root or `backend/` directory.
- Fails fast with a clear error if the file is missing.

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

- Uses **Pinecone's integrated inference** — no separate embedding API call needed.
- Model: **`multilingual-e5-large`** — supports Arabic and English natively.
- Skips creation if index `"legal-kb"` already exists.

#### Step 3 — Prepare Records

```typescript
const text = `${c.clausePattern}\n${c.explanation.en}\n${c.explanation.ar}`;
```

The **text field** (which gets embedded) is a concatenation of:
1. `clausePattern` — the legal clause template text
2. `explanation.en` — English explanation
3. `explanation.ar` — Arabic explanation

This trilingual embedding ensures robust semantic matching whether a user's contract is in Arabic or English.

All other clause fields are stored as **metadata** alongside the vector:

| Metadata Field | Source |
|---|---|
| `_id` | `clause.id` |
| `text` | Concatenated pattern + explanations |
| `category` | `clause.category` |
| `riskLevel` | `clause.riskLevel` |
| `explanation_ar` | `clause.explanation.ar` |
| `explanation_en` | `clause.explanation.en` |
| `whyRisky_ar` | `clause.whyRisky.ar` |
| `whyRisky_en` | `clause.whyRisky.en` |
| `saferAlternative_ar` | `clause.saferAlternative.ar` |
| `saferAlternative_en` | `clause.saferAlternative.en` |
| `relatedLaw` | `clause.relatedLaw` (empty string if null) |
| `contractTypes` | `clause.contractTypes` |
| `keywords` | `clause.keywords` |

#### Step 4 — Batch Upsert

```typescript
const batchSize = 25;
for (let i = 0; i < records.length; i += batchSize) {
  const batch = records.slice(i, i + batchSize);
  await index.upsertRecords({ records: batch });
}
```

- Records are upserted in batches of **25** to respect Pinecone rate limits.
- Uses `upsertRecords` (integrated inference API), not the legacy `upsert`.

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
     saferAlternative, relatedLaw, confidence
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

> ⚠️ **Run this only once** (or when `legalKB.json` is updated).  
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
📂 Loaded 52 clauses from backend/src/data/legalKB.json
🏗️ Index "legal-kb" does not exist. Creating serverless index...
✅ Index "legal-kb" created successfully.

📤 Upserting 52 clauses to Pinecone index "legal-kb"…
   Upserting batch 1 (25 records)…
   Upserting batch 2 (25 records)…
   Upserting batch 3 (2 records)…

🎉 Success: Confirmed that all 52 clauses have been embedded and upserted into Pinecone!
```

---

## Clause Schema Reference

```typescript
interface Clause {
  id: string;              // Unique identifier e.g. "clause_001_unlimited_liability"
  category: string;        // e.g. "liability", "termination", "payment"
  riskLevel: string;       // "low" | "medium" | "high" | "critical"
  clausePattern: string;   // Template text of the risky clause
  keywords: string[];      // Bilingual keywords for matching
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
  relatedLaw?: string;     // e.g. "Egyptian Civil Code Article 224"
  contractTypes: string[]; // e.g. ["employment", "freelance"]
}
```

---

## Risk Level Reference

| Level | Color Code | Description |
|---|---|---|
| `critical` | 🔴 | Immediately dangerous — can cause catastrophic financial or legal harm |
| `high` | 🟠 | Seriously unfair or violates Egyptian labor/civil law |
| `medium` | 🟡 | Requires negotiation — unfavorable but not immediately harmful |
| `low` | 🟢 | Minor concern — worth noting but not urgent |

---

## Category Reference

| Category | Example Clause Type |
|---|---|
| `liability` | Unlimited liability, blanket indemnification |
| `termination` | Unilateral termination, no severance, automatic renewal |
| `payment` | Discretionary payment, 90-day terms, compound interest |
| `intellectual_property` | Broad IP assignment, moral rights waiver, ownership disputes |
| `non_compete` | Broad geographic scope, excessive duration |
| `confidentiality` | Indefinite NDA, no legal-disclosure exception |
| `dispute_resolution` | Foreign jurisdiction, forced arbitration |
| `privacy` | Broad data sharing, device monitoring |
| `working_conditions` | Mandatory unpaid overtime |
| `compensation` | Unilateral salary cuts |
| `leave` | Discretionary leave denial |
| `scope_of_work` | Scope creep without compensation |
| `force_majeure` | Overly narrow force majeure definition |
| `warranties` | Full warranty disclaimer |
| `non_solicitation` | Excessive post-employment restrictions |
| `exclusivity` | Full exclusivity without compensation |
| `employment_terms` | Illegal probation period (>3 months) |
| `performance` | Subcontracting restrictions |
| `amendment` | Unilateral contract modification |
| `indemnification` | Blanket indemnity covering client's own faults |

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

### ⚠️ Index already exists but data seems wrong

Re-run the script — `upsertRecords` is idempotent and will overwrite existing vectors by `_id`.

### ⚠️ Arabic text not matching correctly

The `multilingual-e5-large` model natively supports Arabic. If matches seem poor, verify the `text` field in Pinecone console — it should contain Arabic text from `explanation.ar`.
