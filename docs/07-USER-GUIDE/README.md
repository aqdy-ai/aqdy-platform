# Aqdy Platform – User Guide

## 📖 Introduction

Welcome to the **Aqdy Platform** – a modern, AI‑enhanced development environment designed for rapid prototyping, robust testing, and seamless deployment. This guide walks you through everything a user needs to get started, work efficiently, and troubleshoot common issues.

---

## 🚀 Getting Started

### 1️⃣ Prerequisites
| Requirement | Minimum Version |
|------------|-----------------|
| Node.js    | 18+            |
| npm        | 9+             |
| Docker*    | 20.10+ (optional for local services) |
| Git        | 2.30+          |

> **Tip:** Install Node via **nvm** to manage multiple versions easily.

### 2️⃣ Clone the Repository
```bash
git clone https://github.com/aqdy/aqdy-platform.git
cd aqdy-platform
```

### 3️⃣ Install Dependencies
```bash
npm ci
# Install Playwright browsers for E2E tests
npx playwright install
```

### 4️⃣ Configure Environment
Create a `.env` file (copy from `.env.example`) and set:
- `APP_URL` – URL of the running front‑end (e.g., `http://localhost:3000`).
- `API_URL` – Base URL for the back‑end API.
- Any feature flags you need.

---

## 🛠️ Development Workflow

| Stage | Description | Key Commands |
|-------|-------------|--------------|
| **Run locally** | Start the full stack in development mode. | `npm run dev` |
| **Unit / Integration Tests** | Fast feedback on code correctness. | `npm run test:unit`<br>`npm run test:integration` |
| **End‑to‑End Tests** | Full‑stack UI flow validation with Playwright. | `npm run test:e2e` |
| **Lint & Format** | Enforce code style and catch static issues. | `npm run lint`<br>`npm run format` |
| **Build** | Produce production bundles. | `npm run build` |
| **Deploy** | Deploy to your chosen cloud/infra. | See **Deployment** section below. |

---

## 📂 Project Structure Snapshot
```
├─ docs/                     # Documentation (this guide lives here)
├─ src/                      # Application source
│   ├─ backend/               # API, services, models
│   └─ frontend/              # React/Vite UI
├─ tests/                    # All test suites
│   ├─ unit/                  # Jest unit tests
│   ├─ integration/           # Supertest + Vitest integration tests
│   └─ e2e/                   # Playwright end‑to‑end tests
├─ .github/workflows/        # CI pipelines (GitHub Actions)
├─ package.json
└─ README.md                 # Project‑level overview
```

---

## 🧪 Testing Strategy (Quick Recap)
- **Unit Tests** – Isolate functions/modules (`npm run test:unit`).
- **Integration Tests** – Verify API contracts (`npm run test:integration`).
- **E2E Tests** – Simulate real user journeys with Playwright (`npm run test:e2e`).
- **Coverage** – Enforced 60% line coverage (see `jest.config.js`).

---

## 📦 Deployment Guide

### 1️⃣ CI/CD Pipelines (GitHub Actions)
- **Test Suite** – Runs unit, integration, and E2E tests on each PR.
- **Build & Release** – Generates production assets and publishes Docker images.

### 2️⃣ Deploy to Docker (local or cloud)
```bash
docker compose -f docker-compose.prod.yml up -d
```
> **Note:** Ensure the `DATABASE_URL` environment variable points to a reachable PostgreSQL instance.

### 3️⃣ Deploy to Kubernetes
Use the provided Helm chart:
```bash
helm upgrade --install aqdy-platform ./helm/aqdy-platform \
  --set image.tag=$(git rev-parse --short HEAD)
```

---

## 🔧 Troubleshooting & FAQ
| Question | Answer |
|---|---|
| **Why does `npm run dev` crash?** | Check that ports 3000 (frontend) and 8000 (backend) are free, and that your `.env` values are correct. |
| **Tests are flaky, what can I do?** | Run the failing test with `--runInBand` to isolate, or increase the timeout: `npm test -- --testTimeout=15000`. |
| **How to add a new environment variable?** | Add it to `.env` and, if needed, to `docker-compose.yml` or Helm values. |
| **Where are mock data files stored?** | Under `tests/fixtures/`. Use them in tests via `import fixture from '../../tests/fixtures/example.json';`. |
| **Can I customize the Playwright browsers?** | Edit `playwright.config.ts` – you can add mobile device emulations or change headless mode. |

---

## 📞 Support & Contribution
- **Open Issues:** https://github.com/aqdy/aqdy-platform/issues
- **Pull Requests:** Follow the `CONTRIBUTING.md` guidelines.
- **Community Chat:** Join our Discord at https://discord.gg/aqdy.

> **Happy coding!**
