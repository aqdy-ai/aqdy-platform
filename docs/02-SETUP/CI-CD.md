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
push to develop, main, fix/pre-stage
pull_request to develop, main, fix/pre-stage
```

Pipeline steps (high level):

```
Checkout
Set up Node.js
Lint Backend
Lint Frontend
Test Backend
Test Frontend
Security Audit
Build and push Docker images
Deploy to staging / production
```

Pipeline Flow

```
Push / Pull Request

↓

Lint Backend

↓

Lint Frontend

↓

Test Backend

↓

Test Frontend

↓

Security Audit

↓

Build and Push Docker Images

↓

Deploy to Staging / Production
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

The repo includes a Husky pre-commit hook at `.husky/pre-commit`. The frontend package also includes `lint-staged` as a dependency, but the current hook is still minimal and can be extended for staged-file checks.

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
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
OPENAI_API_KEY
PINECONE_API_KEY
PINECONE_INDEX
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
VITE_GOOGLE_CLIENT_ID
```

