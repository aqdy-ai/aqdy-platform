PR Title: feat: Add per-user and per-IP rate limiting middleware

Summary

This PR introduces basic rate limiting to protect unauthenticated endpoints and enforce Free-tier usage limits.

What I changed

- Added `src/middlewares/rateLimit.ts` implementing:
  - `userAnalysisRateLimit()` — blocks Free tier users after 10 analyses/day (UTC).
  - `anonymousIpRateLimit()` — throttles unauthenticated IPs (20 requests per 15 minutes).
  - `resetRateLimitStores()` — helper for tests.
- Applied `userAnalysisRateLimit()` to `POST /api/analysis/analyze`.
- Applied `anonymousIpRateLimit()` as router-level middleware for `/api/upload`.
- Added unit tests `tests/unit/rateLimit.middleware.test.ts` covering: normal usage, exactly at limit, over limit, unauthenticated IP limit.
- Updated `tests/setup-env.js` to support `SKIP_MONGO=1` for fast unit test runs.
- Added documentation `docs/BACKEND/RATE_LIMITING.md`.

Acceptance criteria (from issue)

- Free tier users receive `429` after reaching daily limit (covered by tests).
- IP-based limiting works on unauthenticated endpoints (covered by tests).
- Tests: Unit tests pass locally (see test steps below).

Testing instructions

1. Run the targeted unit tests (fast):

   PowerShell:

   $env:SKIP_MONGO='1'
   npm test -- --runInBand tests/unit/rateLimit.middleware.test.ts

   Or using cross-env (Linux/macOS or CI):

   cross-env SKIP_MONGO=1 npm test -- --runInBand tests/unit/rateLimit.middleware.test.ts

2. Run the full backend test suite (may take longer):

   PowerShell:

   $env:SKIP_MONGO='1'
   npm test -- --runInBand


Notes for reviewers

- The middleware is intentionally in-memory to keep the initial implementation simple and testable. For production we should use Redis and document the migration steps.
- I added `SKIP_MONGO` to speed up running unit tests locally. If you prefer not to add this flag I can revert and instead mock dependencies.

Checklist before merging

- [ ] 2+ code reviewers approve
- [ ] Unit tests pass in CI
- [ ] Docs updated (included)
- [ ] Consider follow-up task to move to Redis for distributed rate limiting

Suggested reviewers: @backend-team, @devops

Branch & commands (example)

git checkout -b feat/rate-limiting
git add .
git commit -m "feat: add per-user and per-ip rate limiting middleware"
git push origin feat/rate-limiting

Then open a PR with the above title and description, request 2 reviewers, and link to the related issue.
