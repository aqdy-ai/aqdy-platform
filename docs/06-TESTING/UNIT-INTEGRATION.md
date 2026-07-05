# Unit & Integration Tests

> Overview of the testing strategy, frameworks, coverage goals, and folder layout for the Aqdy platform.

## 🧪 Tech Stack
- **Backend**: Jest (`jest`), Supertest (`supertest`) for API integration tests.
- **Frontend**: Vitest (`vitest`) + Testing Library (`@testing-library/react`) for component and UI tests.
- **Mocking**: MSW (Mock Service Worker) for deterministic API responses in the frontend.
- **Coverage**: Global line‑coverage gate set to **60 %** (enforced by CI).

## 📁 Directory Structure
```
backend/
  tests/
    unit/          # Pure unit tests for services, utils, etc.
    integration/   # Supertest API integration tests (e.g., auth.integration.test.ts)
frontend/
  tests/
    unit/          # Component tests using Testing Library
    integration/   # End‑to‑end style tests that run against a local dev server
```
> The repository already contains example tests in these folders.

## 🚀 Running Tests Locally
```bash
# Backend unit tests
cd backend && npm test            # runs Jest with coverage
# Backend integration tests
cd backend && npm run test:integration   # (script defined in package.json)

# Frontend unit tests
cd frontend && npm run test        # runs Vitest
# Frontend integration tests (with MSW)
cd frontend && npm run test:integration   # runs Vitest with MSW handlers
```
Add `--watch` to any command for continuous feedback.

## 🏭 CI Integration
The **GitHub Actions** workflow (`.github/workflows/ci-cd.yml`) runs:
- `npm run test` for backend Jest tests (fails if coverage < 60 %).
- `npm run test` for frontend Vitest tests.
- Coverage reports are uploaded as artifacts for each job.

## 📦 Mocking Strategy
- **MSW** intercepts HTTP calls in the frontend test environment, providing static JSON fixtures located in `frontend/src/mocks/`.
- Backend unit tests use **Jest mocks** for external services (e.g., Stripe, Pinecone).

## 📋 Test Patterns
1. **Unit** – Isolated functions/services, no external I/O.
2. **Integration** – API endpoints exercised with real request/response flow, using Supertest or Vitest with MSW.
3. **Pipeline** – Combine unit & integration steps to simulate end‑to‑end behavior (covered by the separate E2E suite).

## 🛡️ Adversarial / Security Testing

Prompt injection and jailbreak detection are tested at both the unit and integration levels:

### Security Middleware (`backend/src/middlewares/security.middleware.ts`)
- Detects 20+ distinct English and Arabic jailbreak patterns at the HTTP layer.
- Rejects requests with `400 Bad Request` when prompt injection is found.

| Test file | Level |
|-----------|-------|
| `backend/tests/unit/security.middleware.test.ts` | Unit — validates pattern detection per payload |
| `backend/tests/unit/sanitization.service.test.ts` | Unit — validates specific jailbreak payloads (DAN, STAN, roleplay, hypothetical, research, steganographic zero-width chars) |
| `backend/tests/integration/pipeline.security.integration.test.ts` | Integration — validates pipeline rejects uploaded documents containing prompt injection |

### Sanitization Service (`backend/src/services/sanitization.service.ts`)
- Removes role override, ignore instructions, and jailbreak attempts (`DAN`, `do anything now`, `developer mode`, `god mode`, `STAN`, `hypothetically`, `for research purposes`, roleplay patterns, etc.).
- Strips zero-width characters used in steganographic attacks.

---

> **Note**: Keep new tests alongside existing ones; follow the naming convention `*.test.ts` for Jest and `*.spec.ts` for Vitest.
