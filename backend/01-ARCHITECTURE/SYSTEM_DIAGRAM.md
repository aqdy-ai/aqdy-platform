# Aqdy Platform — System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│                                                                  │
│   React + Vite (Frontend)          Admin Dashboard               │
│   - Contract Upload UI             - User Management             │
│   - Risk Analysis Dashboard        - Stats & Metrics             │
│   - Contract History Page          - Audit Logs                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS / REST API
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│                                                                  │
│   Express.js (Node.js / TypeScript)                              │
│                                                                  │
│   Middlewares:                                                   │
│   - JWT Authentication (auth.middleware.ts)                      │
│   - Rate Limiting (rateLimit.ts)                                 │
│   - Plan Enforcement (planEnforcement.middleware.ts)             │
│   - Contract Ownership (contractOwnership.middleware.ts)         │
│   - PII Filtering (piiFiltering.ts)                              │
│   - Security / Prompt Injection Detection                        │
│   - CORS + CSRF Protection                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
┌──────────────┐ ┌──────────┐ ┌───────────────┐
│  Auth Routes │ │  Upload  │ │   Analysis    │
│  /api/auth   │ │  Routes  │ │   Routes      │
│              │ │/api/upload│ │/api/analysis  │
└──────────────┘ └────┬─────┘ └──────┬────────┘
                      │              │
                      ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI PIPELINE LAYER                             │
│                                                                  │
│   OrchestratorService (pipeline/orchestrator.service.ts)         │
│                                                                  │
│   ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│   │  Extractor  │ →  │ RiskClassifier   │ →  │   Redline     │  │
│   │   Agent     │    │    Agent         │    │   Agent       │  │
│   │             │    │  + RAG Search    │    │               │  │
│   └─────────────┘    └──────────────────┘    └───────────────┘  │
│                                                                  │
│   LangChain + Gemini 3.5 Flash (Primary) / 3.1 Flash (Fallback) │
└──────────┬──────────────────────┬───────────────────────────────┘
           │                      │
           ▼                      ▼
┌─────────────────┐    ┌─────────────────────┐
│   MongoDB Atlas │    │   Pinecone Vector   │
│                 │    │   Database (RAG)    │
│   Collections:  │    │                     │
│   - users       │    │   Legal KB embeddings│
│   - contracts   │    │   (OpenAI embeddings)│
│   - riskanalysis│    └─────────────────────┘
│   - auditlogs   │
│   - plans       │
│   - subscriptions│
│   - creditledger│
│   - payments    │
└─────────────────┘
```

## External Services

| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Primary database |
| Pinecone | Vector DB for RAG (Legal KB) |
| Google Gemini | LLM for AI agents |
| OpenAI | Text embeddings for RAG |
| Stripe | Payment processing |
| Langfuse | LLM observability & tracing |

## Deployment

| Component | Platform |
|-----------|---------|
| Backend API | Railway |
| Frontend | Vercel |
| Database | MongoDB Atlas (aqdy-cluster) |
| CI/CD | GitHub Actions |
