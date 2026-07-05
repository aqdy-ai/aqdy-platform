# End-to-End (E2E) Tests

> Playwright‑based E2E testing for the critical user flows of the Aqdy contract analysis platform.

## 🎯 Goal
Validate the **full stack** – from the UI down to the backend services – in realistic browser environments. The tests ensure that a user can upload a contract, trigger analysis, and view the risk‑assessment dashboard without regressions.

## 🛠️ Tech Stack
- **Playwright** (`@playwright/test@^1.60.0`) – multi‑browser automation (Chromium, Firefox, WebKit).
- **TypeScript** configuration in `playwright.config.ts`.
- **Vite dev server** (frontend) and **Express API** (backend) started in parallel for local execution.

## 📋 Critical Test Scenarios
| Scenario | Description |
|---|---|
| **Upload → Analyse → View Results** | Simulates a user uploading a PDF/DOCX, clicking **Analyse**, then asserts the dashboard shows a risk summary and clause‑by‑clause results. |
| **Authentication Flow** | Ensures a newly created account can log in and retain a JWT for subsequent API calls. |
| **Language Switch (AR ↔ EN)** | Verifies UI text toggles correctly and analysis results are rendered in the selected language. |
| **Redline Suggestions** | Confirms that the redline editor displays suggested revisions after analysis completes. |
| **Feedback Submission** | Checks that thumbs‑up/down actions record feedback and trigger the backend endpoint. |

## ⚙️ Playwright Configuration (excerpt)
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:5173', // Vite dev server
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```
> The full file lives at `playwright.config.ts` in the repo root.

## 🚀 Running Locally
```bash
# From the repository root
npm run dev --workspace=frontend -- --host 127.0.0.1   # start Vite
npm run dev --workspace=backend                     # start Express API
npm run test:e2e                                   # runs Playwright suite
```
Playwright will launch browsers headlessly by default; add `--headed` to see the UI.

## 🏭 CI Integration
The **GitHub Action** `playwright.yml` (or the `test:e2e` job inside `ci-cd.yml`) runs the same command in a Linux container, captures HTML reports, and uploads them as artifacts. The CI job fails if any test exits with a non‑zero status, guaranteeing that regressions are caught before merge.
---

> **Note**: The repository already contains a sample test at `tests/e2e/upload-analyse-view.spec.ts`. Feel free to extend it using the patterns shown above.
