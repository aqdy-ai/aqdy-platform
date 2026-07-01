# Aqdy Platform

**AI-powered contract risk analyzer for the Arabic-speaking market.**  
Upload a contract (PDF or DOCX) and get clause-by-clause risk analysis, bilingual explanations, and redline revision suggestions — all grounded in Egyptian law through a curated legal knowledge base and semantic RAG pipeline.

---

## Tech Stack

**Backend:** Node.js / Express • TypeScript • LangChain • Google Gemini API (OpenAI fallback) • Pinecone • MongoDB (Mongoose) • Redis (BullMQ) • Stripe • Langfuse

**Frontend:** React 19 • Vite 8 • Tailwind CSS 4 • TypeScript • Radix UI / shadcn • TanStack Query • i18next • Framer Motion • Recharts

**Infrastructure:** Docker • Docker Compose • AWS CDK • Doppler (secrets)

**Testing:** Jest • Supertest • Vitest • Testing Library • Playwright • MSW • vitest-axe

---

## Core Features

- **3-Agent AI Pipeline** — Sequential multi-agent system: ExtractorAgent (clause extraction), RiskClassifierAgent (risk classification with law references), RedlineAgent (revision generation)
- **Semantic RAG** — 150+ legal clauses embedded with `multilingual-e5-large` in Pinecone, retrieved with MMR + reranking
- **Bilingual (AR/EN)** — Full Arabic and English support; detects contract language automatically
- **RTL-First UI** — Tailwind logical properties, Arabic-optimized layout
- **LLM-as-a-Judge** — 4 quality metrics: Context Precision, Context Recall, Faithfulness, Answer Relevancy
- **Observability** — Full Langfuse tracing (latency, cost, tokens per LLM call and RAG retrieval)
- **Security** — Input sanitization, PII filtering, Redis rate limiting, JWT auth, Helmet, Doppler secrets
- **Payments** — Stripe integration with subscription plans and credit system
- **Accessibility** — WCAG 2.1 AA compliant (keyboard nav, screen readers, contrast)
- **Feedback** — Thumbs up/down per clause, report issue dialog

---

## Repository Layout

```
aqdy-platform/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── agents/             # 3 agents + prompt templates
│   │   ├── config/             # LangChain, DB, Redis, Swagger, env validation
│   │   ├── models/             # Mongoose schemas (12 collections)
│   │   ├── routes/             # REST endpoints (23 route files)
│   │   ├── services/           # LLM, RAG, agents, auth, payments, tracing
│   │   └── scripts/            # Seed, embed, migration scripts
│   └── tests/                  # Unit, integration, pipeline tests
├── frontend/                   # React 19 / Vite 8 client
│   ├── src/
│   │   ├── components/         # UI primitives + feature components
│   │   ├── pages/              # Route pages (15 pages)
│   │   └── locales/            # i18n AR/EN dictionary
│   └── tests/                  # Vitest + Playwright
├── docs/                       # Central documentation
├── infra/                      # AWS CDK deployment stack
├── docker-compose.yml          # Redis, backend, frontend
└── README.md
```

---

## Quick Start

```bash
# Prerequisites: Node.js >= 18, npm, Docker

# 1. Clone and set up environment
cp .env.example .env
# Fill in your API keys (Gemini, Pinecone, MongoDB, Langfuse, Stripe, Doppler)

# 2. Run with Docker Compose
docker compose up --build
```

Or run manually:

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

---

## Documentation

Full documentation is available in the [`docs/`](./docs/) directory:

| Section | Guide |
|:---|:---|
| Architecture | [System Overview](./docs/01-ARCHITECTURE/OVERVIEW.md) • [DB Schema](./docs/01-ARCHITECTURE/DATABASE-SCHEMA.md) • [API Spec](./docs/01-ARCHITECTURE/API-SPEC.md) |
| Setup | [Local Dev](./docs/02-SETUP/LOCAL-DEV.md) • [Deployment](./docs/02-SETUP/DEPLOYMENT.md) • [CI/CD](./docs/02-SETUP/CI-CD.md) |
| AI Pipeline | [Models](./docs/03-AI-PIPELINE/MODEL-SELECTION.md) • [Prompts](./docs/03-AI-PIPELINE/PROMPT-LIBRARY.md) • [RAG](./docs/03-AI-PIPELINE/RAG.md) • [Agents](./docs/03-AI-PIPELINE/AGENTS.md) • [Evaluation](./docs/03-AI-PIPELINE/EVALUATION.md) |
| Security | [OWASP LLM Top 10](./docs/04-SECURITY/OVERVIEW.md) |
| Observability | [Langfuse Tracing](./docs/05-OBSERVABILITY/TRACING.md) |
| Testing | [Unit/Integration](./docs/06-TESTING/UNIT-INTEGRATION.md) • [E2E](./docs/06-TESTING/E2E.md) |
| User Guide | [How to Use](./docs/07-USER-GUIDE/README.md) |
| Appendix | [Accessibility](./docs/08-APPENDIX/ACCESSIBILITY.md) • [Localization](./docs/08-APPENDIX/LOCALIZATION.md) • [Credits](./docs/08-APPENDIX/CREDITS.md) |

---

## Tests

```bash
# Backend tests (Jest)
cd backend && npm run test
npm run test:coverage    # With 60% line coverage gate

# Frontend tests (Vitest)
cd frontend && npm run test
npm run test:coverage

# E2E tests (Playwright)
cd frontend && npm run test:e2e
```

