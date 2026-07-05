<div align="center">
  <h1>⚖️ Aqdy Platform (عَقْدِي)</h1>
  <p><strong>AI-powered contract risk analyzer grounded in Egyptian law for the Arabic-speaking market.</strong></p>

  <p>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white" alt="Node.js" /></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=black" alt="React" /></a>
    <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-v5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://ai.google.dev"><img src="https://img.shields.io/badge/Google_Gemini-API-8E75C2?logo=googlegemini&logoColor=white" alt="Google Gemini" /></a>
    <a href="https://langfuse.com"><img src="https://img.shields.io/badge/Langfuse-Trace-000000?logo=langfuse&logoColor=white" alt="Langfuse" /></a>
    <a href="https://stripe.com"><img src="https://img.shields.io/badge/Stripe-Payments-008FC1?logo=stripe&logoColor=white" alt="Stripe" /></a>
    <a href="https://www.docker.com"><img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker Compose" /></a>
  </p>

  <h4>
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-core-features">Features</a> •
    <a href="#-system-architecture">Architecture</a> •
    <a href="#-repository-layout">Repository Structure</a> •
    <a href="#-documentation-directory">Documentation Index</a>
  </h4>
</div>

---

## 🌟 Project Overview

Aqdy helps freelancers, startups, and small businesses understand legal contracts by highlighting liabilities, providing alternative legal wordings, and explaining terms in plain language (both Arabic and English).

Upload any contract in **PDF** or **DOCX** format to retrieve:
*   🔍 **Clause-by-clause risk analysis** calibrated against Egyptian law.
*   🌍 **Bilingual (Arabic/English) explanations** with auto-detected contract language.
*   📝 **Redline revision suggestions** and negotiation talking points.
*   📚 **Citations and grounding** from a curated legal knowledge base.

---

## 🛠️ Tech Stack & Ecosystem

| Component | Technologies & Frameworks |
| :--- | :--- |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express.js-v4-000000?logo=express&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-v5-3178C6?logo=typescript&logoColor=white) ![LangChain](https://img.shields.io/badge/LangChain-v0.2-1C3C3C?logo=langchain&logoColor=white) |
| **Frontend** | ![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=black) ![Vite](https://img.shields.io/badge/Vite-v8-646CFF?logo=vite&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white) ![Radix UI / shadcn](https://img.shields.io/badge/Radix_UI-Primitive-161618?logo=radixui&logoColor=white) ![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animation-00C5FF?logo=framer&logoColor=white) |
| **AI / RAG** | ![Google Gemini](https://img.shields.io/badge/Google_Gemini-API-8E75C2?logo=googlegemini&logoColor=white) ![Pinecone](https://img.shields.io/badge/Pinecone-Vector_DB-161616?logo=pinecone&logoColor=white) ![OpenAI Fallback](https://img.shields.io/badge/OpenAI_Fallback-v4-412991?logo=openai&logoColor=white) |
| **Data & Queues** | ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-v7-DC382D?logo=redis&logoColor=white) ![BullMQ](https://img.shields.io/badge/BullMQ-Queues-FF9900) |
| **Observability** | ![Langfuse](https://img.shields.io/badge/Langfuse-Trace-000000?logo=langfuse&logoColor=white) |
| **Security / Dev** | ![Docker](https://img.shields.io/badge/Docker_Compose-v2-2496ED?logo=docker&logoColor=white) ![Doppler](https://img.shields.io/badge/Doppler-Secrets-FF007F?logo=doppler&logoColor=white) ![AWS CDK](https://img.shields.io/badge/AWS_CDK-v2-FF9900?logo=amazon-web-services&logoColor=white) |
| **Testing** | ![Jest](https://img.shields.io/badge/Jest-Backend-C21325?logo=jest&logoColor=white) ![Vitest](https://img.shields.io/badge/Vitest-Frontend-6E9F18?logo=vitest&logoColor=white) ![Playwright](https://img.shields.io/badge/Playwright-E2E-2E8555?logo=playwright&logoColor=white) |

---

## ⚡ Core Features

*   **🤖 3-Agent AI Pipeline** — Sequential multi-agent orchestration for high-accuracy parsing and classification:
    1.  `ExtractorAgent` (Clause extraction & language detection)
    2.  `RiskClassifierAgent` (Egyptian law grounding and risk scoring)
    3.  `RedlineAgent` (Safer alternative generation & negotiation points)
*   **📚 Semantic RAG** — 150+ legal clauses embedded using `multilingual-e5-large` in Pinecone, retrieved with MMR (Maximal Marginal Relevance) + reranking.
*   **🌍 RTL-First & Bilingual** — Full Arabic and English support; automatically detects document languages and uses Tailwind logical properties for fluent RTL switching.
*   **⚖️ LLM-as-a-Judge** — Continuous evaluation of the RAG pipeline across 4 quality metrics: Context Precision, Context Recall, Faithfulness, and Answer Relevancy.
*   **📈 Real-time Observability** — End-to-end tracing (latencies, token count, costs per LLM call) integrated with Langfuse Cloud.
*   **🔒 Hardened Security** — Input sanitization, PII filtering, Redis rate limiting, JWT authentication, Helmet headers, and secure Doppler-managed secrets.
*   **💳 Payments & Credit Model** — Seamless Stripe integration with support for recurring subscription tiers and a tokenized credit-deduction engine.
*   **♿ Accessibility (WCAG 2.1 AA)** — Fully compliant with keyboard navigation, screen reader attributes, semantic HTML, and vitest-axe tests.
*   **💬 Human Feedback Loop** — Thumbs up/down evaluation on per-clause results and contextual issue-reporting forms.

---

## 🏗️ System Architecture

The following diagram illustrates how the frontend client, backend Express application, asynchronous BullMQ workers, and the multi-agent AI framework interact with the Pinecone vector database and Langfuse observability:

```mermaid
graph TD
    User["User (Web Browser)"] -- "HTTPS / RTL-First UI" <--> FE["React 19 Frontend (Vite 8, Tailwind 4)"]
    FE -- "REST API / JWT / Doppler Secrets" <--> BE["Express.js Backend (Node.js, TypeScript)"]

    subgraph "Asynchronous Processing & Storage"
        BE -->|Enqueue Jobs| Redis["Redis (BullMQ Queue)"]
        Redis -.->|Worker Dequeue| Worker["BullMQ Background Worker"]
        Worker -- "Save / Retrieve Data" <--> DB[(MongoDB Mongoose)]
    end

    subgraph "Orchestration & AI Agents"
        Worker -- "Execute Pipeline" <--> Orchestrator["Orchestrator Service"]
        Orchestrator -->|0. Sanitize Text| Sanitization["Sanitization Service"]
        Orchestrator -->|1. Extract Clauses| Extractor["Extractor Agent"]
        Orchestrator -->|2. Classify Risk| Classifier["Risk Classifier Agent"]
        Orchestrator -->|3. Generate Revisions| Redline["Redline Agent"]
    end

    subgraph "External AI & Vector Databases"
        Extractor -- "Primary LLM: gpt-4o / Fallback: gemini" <--> LLM["LLM Service (LangChain)"]
        Classifier -- "Primary LLM: gpt-4o / Fallback: gemini" <--> LLM
        Redline -- "Primary LLM: gpt-4o / Fallback: gemini" <--> LLM
        Classifier -- "Query Vector Database" <--> RAG["RAG Service"]
        RAG -- "Semantic Search (multilingual-e5-large)" <--> Pinecone[(Pinecone Serverless Vector DB)]
    end

    subgraph "Observability & Payments"
        Orchestrator -.->|Callbacks & Spans| Langfuse["Langfuse Cloud"]
        LLM -.->|Token Count & Cost| Langfuse
        RAG -.->|Retrieval Metrics| Langfuse
        Worker -- "Manage Subscriptions & Credits" <--> Stripe["Stripe Payments"]
    end
```

---

## 📁 Repository Layout

```
aqdy-platform/
├── backend/                     # Express API Server (Node.js/TypeScript)
│   ├── src/
│   │   ├── agents/              # Multi-agent systems & prompt libraries
│   │   ├── config/              # Redis, MongoDB, LangChain configuration
│   │   ├── models/              # Mongoose schemas (12 database collections)
│   │   ├── routes/              # Express REST endpoints (23 files)
│   │   └── services/            # AI pipelines, RAG, payments, and tracing
│   └── tests/                   # Unit, integration, & system tests (Jest)
├── frontend/                    # React client built with Vite & Tailwind CSS v4
│   ├── src/
│   │   ├── components/          # UI primitives and feature-specific components
│   │   ├── pages/               # Application page templates (15 views)
│   │   └── locales/             # Translation keys (Arabic/English)
│   └── tests/                   # Component and E2E tests (Vitest + Playwright)
├── docs/                        # Complete technical specifications & design docs
├── infra/                       # AWS CDK Infrastructure-as-Code definitions
└── docker-compose.yml           # Redis, MongoDB, Backend & Frontend local setup
```

---

## ⚡ Quick Start

### Prerequisites
Make sure you have the following tools installed on your development machine:
- **Node.js** (>= 18.0)
- **npm** (>= 9.0)
- **Docker** & **Docker Compose**

### Step 1: Clone and Set Up Environment
Copy the environment variables template:
```bash
cp .env.example .env
```
Fill in the configuration details inside `.env` (API credentials for Gemini, OpenAI, Pinecone, MongoDB Atlas, Langfuse, Stripe, and Doppler).

### Step 2: Run with Docker Compose
Run the entire stack containing backend, frontend, database, and Redis queues:
```bash
docker compose up --build
```

### Step 3: Run Manually (Local Development Mode)
If you prefer running services independently:

**Backend Server**
```bash
cd backend
npm install
npm run dev
```

**Frontend App** (In a new terminal)
```bash
cd frontend
npm install
npm run dev
```

---

## 📖 Documentation Directory

The complete guide and architecture specs are modularly organized in the [`docs/`](./docs/) directory:

| Section | Topic | Primary Reference Guides |
| :--- | :--- | :--- |
| **01 — Architecture** | System Design | [System Overview](./docs/01-ARCHITECTURE/OVERVIEW.md) • [DB Schema](./docs/01-ARCHITECTURE/DATABASE-SCHEMA.md) • [API Spec](./docs/01-ARCHITECTURE/API-SPEC.md) |
| **02 — Setup** | Run & Deploy | [Local Dev](./docs/02-SETUP/LOCAL-DEV.md) • [Deployment](./docs/02-SETUP/DEPLOYMENT.md) • [CI/CD](./docs/02-SETUP/CI-CD.md) |
| **03 — AI Pipeline** | LLMs & Agents | [Model Selection](./docs/03-AI-PIPELINE/MODEL-SELECTION.md) • [Prompt Library](./docs/03-AI-PIPELINE/PROMPT-LIBRARY.md) • [RAG Pipeline](./docs/03-AI-PIPELINE/RAG.md) • [Multi-Agent System](./docs/03-AI-PIPELINE/AGENTS.md) • [Evaluation](./docs/03-AI-PIPELINE/EVALUATION.md) |
| **04 — Security** | Guardrails | [Security Overview](./docs/04-SECURITY/OVERVIEW.md) • [RBAC Policies](./docs/04-SECURITY/RBAC.md) |
| **05 — Observability** | Tracing | [Langfuse Tracing](./docs/05-OBSERVABILITY/TRACING.md) |
| **06 — Testing** | Quality Assurance | [Unit & Integration](./docs/06-TESTING/UNIT-INTEGRATION.md) • [E2E Testing](./docs/06-TESTING/E2E.md) |
| **07 — User Guide** | Operations | [How to Use](./docs/07-USER-GUIDE/README.md) |
| **08 — Appendix** | Standards & Info | [Accessibility](./docs/08-APPENDIX/ACCESSIBILITY.md) • [Localization](./docs/08-APPENDIX/LOCALIZATION.md) • [Credits](./docs/08-APPENDIX/CREDITS.md) |

---

## 🧪 Running Tests & Quality Gates

Run the automated test suites locally to verify logic and schema compliance:

```bash
# Run backend tests (Jest)
cd backend
npm run test
npm run test:coverage       # Enforces 60% coverage gate in CI/CD pipeline

# Run frontend unit/component tests (Vitest)
cd frontend
npm run test
npm run test:coverage

# Run End-to-End browser scenarios (Playwright)
cd frontend
npm run test:e2e
```


