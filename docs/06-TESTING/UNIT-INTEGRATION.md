# Unit & Integration Tests

> Test frameworks, coverage thresholds, and testing patterns.

## Overview

This guide outlines the **unit** and **integration** testing strategy for the Aqdy platform. Unit tests validate individual functions and modules in isolation, while integration tests verify interactions between components (e.g., API endpoints, services, and UI layers). Together they ensure reliable, maintainable code and provide confidence for continuous integration pipelines.

## Prerequisites

- **Node.js** (>=18) and **npm** installed.
- Project dependencies installed (`npm ci`).
- Optional: Docker Compose for a local database/service stack used by integration tests.

## Project Structure

```
├─ src/
│  ├─ backend/          # Server code
│  └─ frontend/         # React/Vite UI code
├─ tests/
│  ├─ unit/              # Jest unit tests for backend & utils
│  ├─ integration/       # Supertest API tests + Vitest UI integration tests
│  └─ fixtures/          # Shared test data and mocks
└─ jest.config.js
```

## Backend Testing (Jest + Supertest)

- **Jest** is used for pure unit tests of backend modules.
- **Supertest** extends Jest to perform HTTP assertions against the Express/Koa server.

### Example Unit Test (`src/backend/utils/math.ts`)
```ts
import { add } from './math';

test('adds two numbers', () => {
  expect(add(2, 3)).toBe(5);
});
```

### Example Integration Test (`tests/integration/auth.spec.ts`)
```ts
import request from 'supertest';
import app from '../../src/backend/app';

describe('Auth API', () => {
  it('signs in a user', async () => {
    const res = await request(app).post('/api/login').send({ email: 'user@example.com', password: 'secret' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});
```

## Front‑end Testing (Vitest + Testing Library)

- **Vitest** runs fast unit tests for Vue/React components.
- **Testing Library** provides utilities to query the DOM as users would.

### Example Component Test (`src/frontend/components/Button.vue`)
```ts
import { render, fireEvent } from '@testing-library/vue';
import Button from './Button.vue';

test('emits click event', async () => {
  const { getByRole, emitted } = render(Button);
  await fireEvent.click(getByRole('button'));
  expect(emitted()).toHaveProperty('click');
});
```

## Coverage Thresholds

- Enforce **60%** line coverage across the whole codebase.
- Configure in `jest.config.js`:
```js
module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: { lines: 60 },
  },
};
```

## Test Patterns

1. **Unit → Integration → Pipeline** – Start with isolated unit tests, then add integration tests that exercise multiple units together, and finally run end‑to‑end pipelines in CI.
2. Keep tests **fast** and **deterministic**; avoid external network calls by mocking.
3. Use **snapshot testing** sparingly for stable UI output.

## Mocking Strategy

- **MSW (Mock Service Worker)** for intercepting HTTP calls in both unit and integration tests.
- **Manual jest mocks** for pure Node modules.
- Store reusable mock data under `tests/fixtures/`.

## Running Tests Locally

```bash
# Install all test dependencies
npm ci
# Run unit tests only
npm run test:unit
# Run integration tests only
npm run test:integration
# Run full suite with coverage report
npm run test:all
```

## CI Integration (GitHub Actions)

```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
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
      - run: npm run test:all
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/aqdy_test
```

## Debugging Tips

- Run tests with `--watch` to see changes instantly.
- Use `--runInBand` to isolate flaky tests.
- Inspect generated coverage reports (`npm run coverage`) to identify uncovered modules.

## Frequently Asked Questions

| Question | Answer |
|---|---|
| How to test code that accesses the database? | Use a Docker‑compose fixture or an in‑memory SQLite DB for CI; clean up with `afterAll` hooks. |
| Where should test data live? | Place JSON fixtures under `tests/fixtures/` and import them in tests. |
| How to skip a flaky test temporarily? | Prefix the test name with `test.skip` or use the `--skipTests` env flag. |

---
*Document last updated: 2026‑07‑01*
