# Aqdy Platform ⚖️🚀

> **AI-powered contract risk analyzer designed for the Arabic-speaking market.**  
> Aqdy helps freelancers, startups, and small businesses understand legal contracts by providing clause-by-clause risk analysis in Arabic and English using state-of-the-art LLMs, semantic RAG pipelines, and curated regional legal knowledge bases.

---

## 🛠️ Technology Stack

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React 19](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite 8](https://img.shields.io/badge/Vite%208-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%204-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
<br>
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Pinecone](https://img.shields.io/badge/Pinecone-24292e?style=for-the-badge&logo=pinecone&logoColor=white)
<br>
![Gemini API](https://img.shields.io/badge/Gemini%20API-4285F4?style=for-the-badge&logo=google-gemini&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

---

## ✨ Core Features

*   **Bilingual Analysis (ar/en):** Complete support for contracts written in Arabic, English, or mixed bilingual formats.
*   **Semantic RAG Pipeline:** Augmented intelligence grounded in a vector database (`Pinecone`) using the `multilingual-e5-large` model, preventing AI hallucinations.
*   **Curated Legal Knowledge Base:** 50+ pre-audited risk clauses carefully mapped against the **Egyptian Labor Law No. 12/2003** and the **Egyptian Civil Code No. 131/1948**.
*   **RTL-First Premium UI:** Built from the ground up to support right-to-left layout constraints using Tailwind 4 logical spacing properties.
*   **Observability & Tracking:** Full Langfuse trace logging for security, debugging, and continuous improvement of AI responses.
*   **Strict Quality Gates:** Proactive linting, formatting checks, and a mandatory **60% unit test coverage gate** in CI/CD.

---

## 📂 Repository Layout

```text
aqdy-platform/
├── backend/                   # Node/Express API service
│   ├── src/
│   │   ├── config/            # LangChain configurations & env Zod validators
│   │   ├── data/              # legalKB.json primary source of truth
│   │   ├── scripts/           # embedKB.ts indexing script
│   │   └── services/          # LLM connection wrappers, contract/analysis services
│   └── tests/                 # Jest backend suites & template mocks
├── frontend/                  # React 19 / Vite 8 client application
│   ├── src/
│   │   ├── components/        # Layout panels (RTL-ready) & Atomic UI primitives
│   │   ├── locales/           # Arabic & English translation dictionaries
│   │   └── pages/             # Main client routes & state stores
│   └── tests/                 # Vitest frontend components & MSW api mocks
├── docs/                      # Central system technical documentation
│   ├── BACKEND/               # LLM wrappers & LangChain setups
│   ├── DATABASE/              # Atlas connections & table schemas
│   ├── DEVOPS/                # Docker setups & installation guides
│   ├── FRONTEND/              # Component Atomic design & i18n
│   ├── RAG/                   # Knowledge Base & Pinecone pipeline
│   └── TESTING/               # Jest, Vitest, & CI/CD thresholds
├── docker-compose.yml         # Local container orchestrator
└── README.md                  # Landing page (You are here!)
```

---

## 🚦 Quick Start Guide

### 1. Prerequisite Installations
*   Ensure **Node.js (>= 18)**, **npm**, **MongoDB**, and **Docker** are installed locally.

### 2. Configure Environment Secrets
Create a `.env` file inside `backend/` and configure the essential API keys:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aqdy
GEMINI_API_KEY=your_google_ai_studio_gemini_key
PINECONE_API_KEY=your_pinecone_db_key
PINECONE_INDEX=legal-kb
```

### 3. Spin Up Services

#### Running via Docker Compose (Recommended)
From the repository root directory:
```bash
docker-compose up --build
```

#### Running Locally (Development Mode)
Run both backend and frontend concurrently in your local environment:

```bash
# In the backend terminal:
cd backend && npm install && npm run dev

# In the frontend terminal:
cd frontend && npm install && npm run dev
```

---

## 📖 Deep-Dive Technical Documentation

To read further about specific architectures and components, please jump to our **[Central Documentation Index (docs/README.md)](./docs/README.md)** or explore these direct guides:

*   **Setup Guides:** [Local Development Installation](./docs/DEVOPS/LOCAL_SETUP.md) | [Docker Deployment Guide](./docs/DEVOPS/DEPLOYMENT.md)
*   **Engineering specs:** [LLM Connection & Orchestration](./docs/BACKEND/LLM_SETUP.md) | [Database Collections & Schemas](./docs/DATABASE/DATABASE_SCHEMA.md)
*   **Frontend patterns:** [Tailwind 4 i18n & Layouts](./docs/FRONTEND/README.md) | [Atomic Component Architecture](./docs/FRONTEND/COMPONENT_ARCHITECTURE.md)
*   **Vector Engine:** [Semantic Pinecone RAG Pipeline](./docs/RAG/rag-and-embedding.md) | [Legal Clause Catalog](./docs/RAG/LEGAL_KB.md)
*   **Development Rules:** [Testing Strategies & CI/CD Quality Gates](./docs/TESTING/README.md) | [KB Curation Workflow](./docs/RAG/KB_CURATION_PROCESS.md)

---

> [!TIP]
> **Updating the Knowledge Base:** If you are a legal expert or a developer adding new contract risks to the Pinecone index, always read the [Knowledge Base Curation Process](./docs/RAG/KB_CURATION_PROCESS.md) first to ensure correct schema validations and multilingual embedding guidelines are preserved.
