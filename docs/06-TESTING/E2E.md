# End-to-End Tests

## Overview

This document describes the **Playwright**-based end‑to‑end (E2E) testing strategy for the Aqdy platform. E2E tests exercise the full stack – from the browser UI through the API layer down to the database – ensuring that critical user flows work as expected in a realistic environment.

## Prerequisites

- **Node.js** (>=18) and **npm** installed.
- **Playwright** browsers installed (`npx playwright install`).
- Access to the development or staging environment (`API_URL` and `APP_URL`).
- Optional: Docker Compose setup for a local environment that mirrors CI.

## Project Structure

```
└─ tests/e2e/
   ├─ fixtures/            # shared test data & helpers
   ├─ pages/               # Page Object Model classes
   ├─ specs/               # Test specs (one spec per user flow)
   └─ playwright.config.ts # Global Playwright configuration
```

## Configuration (`playwright.config.ts`)

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/specs',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
```

## Test Scenarios (examples)

1. **Upload → Analyse → View Results** – Verify that a user can upload a document, the system processes it, and results are displayed.
2. **Authentication Flow** – Sign‑in, sign‑out, password reset.
3. **Permission Checks** – Ensure users with different roles see appropriate UI elements.
4. **Adversarial LLM Jailbreak Probes** – Run crafted prompts to confirm the LLM refuses disallowed instructions.

## Running Tests Locally

```bash
# Install dependencies (run once)
npm i
# Install Playwright browsers
npx playwright install

# Execute all E2E tests
npm run test:e2e

# Run a specific spec
npx playwright test tests/e2e/specs/upload.spec.ts
```

## CI Integration (GitHub Actions)

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      db:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: aqdy_test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          APP_URL: http://localhost:3000
          API_URL: http://localhost:8000/api
```

## Debugging Tips

- Use `npx playwright codegen <url>` to record interactive sessions.
- Enable trace collection (`trace: 'on-first-retry'`) and open the HTML report after a failure.
- Attach to the running container with `docker exec -it <container> /bin/bash` to inspect logs.

## Frequently Asked Questions

| Question | Answer |
|---|---|
| How to run flaky tests only? | Use the `--grep` flag with the test title or `--repeat-each` to isolate. |
| Where to store test data? | Place JSON fixtures under `tests/e2e/fixtures/`. |
| How to test in multiple browsers? | CI matrix runs each Playwright project (chromium, firefox, webkit). |

---

*Document last updated: 2026‑07‑01*
