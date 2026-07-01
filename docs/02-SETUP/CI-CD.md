# CI/CD (Aqdy Platform)

> This repository already contains GitHub Actions workflows. The pipeline runs lint, tests, build, image creation and Playwright E2E where configured.

Repository workflows

```
.github/workflows/ci-cd.yml
.github/workflows/playwright.yml
```

ci-cd.yml

Runs on:

```
push
pull_request
```

Pipeline steps (high level):

```
Checkout
Install dependencies
Lint
Unit Tests
Build Backend
Build Frontend
Docker Build
Coverage
Deploy (optional)
```

Pipeline Flow

```
Push / Pull Request

↓

Install

↓

Lint

↓

Backend Tests

↓

Frontend Tests

↓

Build Backend

↓

Build Frontend

↓

Docker Build

↓

Playwright

↓

Deploy
```

Tools Used

```
GitHub Actions
Docker
Playwright
Vitest
Jest
ESLint
Husky
lint-staged
```

Playwright workflow (`playwright.yml`)

```
Runs end-to-end browser tests
Starts frontend
Starts backend
Runs Playwright
Uploads report
```

Husky & local checks

The repo uses a Husky pre-commit hook at `.husky/pre-commit` and `lint-staged` to run checks before commits. Ensure your local setup runs the Husky hooks after installation.

Code quality tools

Backend:

```
ESLint
Jest
```

Frontend:

```
ESLint
Vitest
Playwright
```

Coverage

Backend uses `Jest` for coverage reporting. Frontend uses `Vitest`.

GitHub Secrets (required)

```
JWT_SECRET
MONGODB_URI
REDIS_URL
GEMINI_API_KEY
LANGFUSE_SECRET_KEY
LANGFUSE_PUBLIC_KEY
STRIPE_SECRET_KEY
SMTP_USER
SMTP_PASS
```

