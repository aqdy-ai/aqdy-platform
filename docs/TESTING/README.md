# Testing Documentation - Aqdy Platform

This document outlines the testing strategy, tools, and procedures for the Aqdy Platform to ensure high code quality and reliability.

## 🧪 Overview
Our testing strategy follows the Testing Pyramid, focusing on robust unit tests and targeted integration tests. We enforce a **60% minimum line coverage** across both the backend and frontend.

## 📈 Quality Reports
Per-week quality audits and metric reports:
- Week 1 Quality Metrics Report
- Week 2 Quality Metrics Report

## � Tools & Frameworks

### Backend
- **Framework:** [Jest](https://jestjs.io/)
- **Environment:** Node.js with ES Modules (`type: module`)
- **Integration Testing:** Supertest
- **Mocking:** Manual Jest mocks for external services (OpenAI, Gemini).

### Frontend
- **Framework:** Vitest
- **DOM Testing:** React Testing Library
- **API Mocking:** MSW (Mock Service Worker)
- **Language:** TypeScript

## 🚀 Running Tests Locally

### Backend
```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Frontend
```bash
cd frontend
npm test              # Run all tests (Vitest)
npm run test:coverage # Run tests with coverage threshold check
```

## 📊 Quality Gates & CI/CD
Our GitHub Actions pipeline (`ci-cd.yml`) automatically executes tests on every push to `develop` or `main`.

1. **Linting:** Checks for code style violations.
2. **Security Audit:** Scans for vulnerable dependencies and hardcoded secrets.
3. **Coverage Check:** Fails the build if line coverage drops below **60%**.
4. **Artifacts:** Coverage reports are uploaded and kept for 7 days for review.

## 📜 Coding Conventions & Guidelines

1. **File Naming:** Tests must end in `.test.js` (Backend) or `.test.tsx` (Frontend) and be located in the relevant `tests/` directory.
2. **The AAA Pattern:** Structure every test using the **Arrange-Act-Assert** pattern:
   - **Arrange:** Set up the test data, mocks, and environment.
   - **Act:** Call the function or interact with the component.
   - **Assert:** Check that the outcome matches your expectations.
3. **Mocking Philosophy:** 
   - **Mock Boundaries:** Always mock external services (OpenAI, Gemini, Pinecone) and database calls in unit tests.
   - **Don't Mock Internals:** Avoid mocking internal helper functions; test the behavior, not the implementation.
   - **MSW for Frontend:** Use Mock Service Worker (MSW) in `frontend/tests/mocks/handlers.ts` to simulate API responses instead of mocking `fetch` or `axios` directly.
4. **Isolate External Dependencies:** 
   - Always mock database calls in unit tests.
   - Use MSW for frontend API calls.
   - Use `jest.mock('openai')` to prevent actual API costs during backend tests.
5. **Negative Testing:** Don't just test success cases. Every feature should have tests for:
   - Invalid inputs.
   - API failures/timeouts.
   - Unauthorized access.
6. **Descriptive Naming:** Test descriptions should be clear and in Arabic or English, explaining the expected behavior (e.g., `يجب أن ينجح في حفظ العقد عند إدخال بيانات صحيحة`).
7. **Environment Variables:** Never hardcode secrets in tests. Use placeholder strings (e.g., `'test-key'`) or leverage the environment variables already configured in the CI/CD pipeline.
8. **Cleanup:** Ensure `cleanup()` is called (handled automatically in `frontend/tests/setup.ts`) to prevent DOM leakage.

## 📂 Test Templates
To maintain consistency, use the templates located in the following directories:

- **Backend Services:** `backend/tests/templates/service.test.template.js`
- **Backend Models:** `backend/tests/templates/model.test.template.js`
- **Frontend Components:** `frontend/tests/templates/component.test.template.tsx`

## 🛡 Coverage Thresholds
| Metric | Requirement |
| :--- | :--- |
| Global Lines | 60% |
| Functions | 60% |
| Branches | 50% |

---
*Created by Islam (QA Lead) - Week 1*
