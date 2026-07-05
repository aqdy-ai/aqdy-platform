# Retrieval-Augmented Generation (RAG)

> Ingestion pipeline, chunking strategy, vector store, and retrieval.

## Ingestion Pipeline (`backend/src/scripts/embedKB.ts`)

The embedding pipeline ingests the KB into Pinecone:

1. **Loads** clause data from `legal_kb.json` (~157 clauses).
2. **Normalizes** clauses from the structured-object format.
3. **Connects to Pinecone** — creates the `legal-kb` index via `createIndexForModel()` if it does not exist.
4. **Builds records** where the embedded text field = `clausePattern + explanation_en + explanation_ar`.
5. **Upserts** in batches of 25 to respect Pinecone rate limits.

**KB data model** (`legal_kb.json`):
- 157 clauses across categories: Liability, Termination, Payment, IP Rights, Non-Compete, Confidentiality, Dispute Resolution, Privacy, Working Conditions, Compensation, etc.
- Each clause has: `clausePattern`, `riskLevel`, `explanation` (ar/en), `whyRisky` (ar/en), `saferAlternative` (ar/en), `negotiationTips` (ar/en), `relatedLaw`, `contractTypes`, `applicableRegions`, `frequency`.

## Chunking Strategy

- **Contracts** are chunked at 80K characters for LLM extraction (handled in `text.utils.ts`).
- **KB text** for embedding is the concatenation of `clausePattern + explanation_en + explanation_ar` — no further chunking needed since clause descriptions are compact.
- **Query expansion** (via Gemini fallback LLM) generates related terms, synonyms, and bilingual translations to enrich the search query before sending to Pinecone.

## Embedding Model

- **Model**: `multilingual-e5-large` (1024 dimensions)
- **Provider**: Pinecone's integrated inference (no separate embedding API call needed).
- **Bilingual**: Supports both Arabic and English with strong cross-lingual performance.

## Vector Store: Pinecone

| Property | Value |
|----------|-------|
| **Service** | Pinecone Serverless |
| **Index name** | `legal-kb` |
| **Cloud** | AWS (`us-east-1`) |
| **Embedding** | Integrated inference (`multilingual-e5-large`) |
| **SDK** | `@pinecone-database/pinecone` v7.2.0 |

## Retrieval Pipeline (`backend/src/services/rag.service.ts`)

The main `searchKB()` method performs:

1. **Caching** — SHA-256 hash-based in-memory cache to avoid redundant searches.
2. **Semantic search** via `index.searchRecords()` with Pinecone's integrated inference.
3. **Similarity filtering** — discards results with score < 0.5.
4. **MMR Reranking** (category-based) — dual-mode:
   - **Category-based MMR** (develop pipeline): penalizes results from the same category for diversity.
   - **Vector similarity MMR** (HEAD pipeline): computes cosine similarity between candidate vectors and already-selected results.
5. **Confidence scoring** based on top match similarity thresholds:
   - `>= 0.9` → 0.95, `>= 0.8` → 0.85, `>= 0.7` → 0.75, `>= 0.6` → 0.60, else 0.40.
6. **Metadata filtering** by category, riskLevel, contractType (with normalization and legacy type mapping).

The `search()` method (used for general queries) additionally supports:
- **Query expansion** (default: enabled) via Gemini Fallback LLM.
- Configurable `topK`, `lambda` (MMR diversity parameter).

## Legal Knowledge Base

- (`backend/src/data/legal_kb.json`): 157 clauses, structured format with metadata header (version, lastUpdated, embeddingModel, embeddingDimensions).
- **Evaluation script** (`backend/src/scripts/evaluateRAG.ts`): 8 test cases (EN/AR pairs) measuring Recall@5 and average latency for queries like: unlimited liability, perpetual NDA, excessive non-compete, unpaid overtime, illegal probation extension.

## Knowledge Base Management (Admin Dashboard)

Admins can manage KB entries directly through the admin dashboard UI and REST API, all gated by the `knowledge_base` permission role.

### API Endpoints (`backend/src/routes/admin.content.route.ts`)

| Method | Endpoint | Permission | Action |
|--------|----------|------------|--------|
| `GET` | `/admin/content/knowledge-base` | `knowledge_base:read` | List all KB entries |
| `POST` | `/admin/content/knowledge-base` | `knowledge_base:write` | Create KB entry |
| `PUT` | `/admin/content/knowledge-base/:id` | `knowledge_base:write` | Update KB entry |
| `DELETE` | `/admin/content/knowledge-base/:id` | `knowledge_base:write` | Delete KB entry |

All mutations are logged to the **audit trail** with event types `KB_ENTRY_CREATED`, `KB_ENTRY_UPDATED`, and `KB_ENTRY_DELETED` for full traceability.

### Admin UI (`frontend/src/pages/admin/ContentDashboard.tsx`)
- Full CRUD interface for KB entries with fields matching the KB schema (clausePattern, riskLevel, explanation, saferAlternative, etc.).
- Write access controlled by `canWrite('knowledge_base')`.

### Re-embedding After Changes

After creating, updating, or deleting KB entries via the dashboard, run the ingestion script to re-sync Pinecone with the updated data:

```bash
npx tsx backend/src/scripts/embedKB.ts
```

This re-embeds all clauses and upserts them to the `legal-kb` index, applying the latest KB content to all future RAG searches.

### Dashboard Monitor (`frontend/src/pages/admin/AdminDashboard.tsx`)
The admin dashboard displays the Pinecone vector index status, including the count of embedded clause embeddings.

## RAG Integration in Agents

- **RiskClassifierAgent** calls `ragService.searchKB(clauseText)` before each classification.
- If a KB match exceeds the `similarityThreshold` (0.75), the match's risk level, explanation, and safer alternative are injected into the LLM prompt as context.
- The agent's confidence is calibrated by blending the vector similarity score (50%) with the LLM's own confidence (50%).
