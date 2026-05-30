**Rate Limiting (Backend)**

- **Purpose**: Protect the platform from abuse and enforce plan limits for Free tier users.

- **Implemented policies**:
  - Per-user (authenticated) analysis limit: Free tier users are limited to 10 analyses per UTC day.
  - IP-based anonymous limiting: Unauthenticated requests (no `x-user-id` header or `x-user-id: anonymous`) are limited to 20 requests per 15-minute window per IP.

- **Where it lives**: `src/middlewares/rateLimit.ts`

- **How it is enforced**:
  - Analysis requests (`POST /api/analysis/analyze`) pass through `userAnalysisRateLimit()` which increments a per-user, per-day counter for users with `x-user-tier: free` (default). When the daily count > 10, the middleware returns HTTP 429.
  - Upload routes (`/api/upload`) use `anonymousIpRateLimit()` at router level to throttle unauthenticated IPs.

- **HTTP response when limited**:
  - Status: `429 Too Many Requests`
  - Body: JSON with shape `{ success: false, error: string, retryAfter: number }` where `retryAfter` is seconds until limit reset.
  - Header: `Retry-After: <seconds>` is set.

- **Headers used**:
  - `x-user-id` — authenticated user identifier (string). If missing or `anonymous`, the request is considered unauthenticated.
  - `x-user-tier` — optional string that indicates plan (`free`, `pro`, etc.). When omitted, defaults to `free`.
  - `x-forwarded-for` — used to obtain client IP when present.

- **Test utilities**:
  - `src/middlewares/rateLimit.ts` exports `resetRateLimitStores()` to clear in-memory counters in tests.

- **Notes & limitations**:
  - The implementation uses in-memory Maps. This is suitable for single-instance deployments and unit tests. For multi-instance deployments, replace storage with a distributed store (Redis) and use atomic counters and TTLs.
  - Daily counters use UTC midnight as reset.

- **Running tests locally (fast)**

  - To skip starting `mongodb-memory-server` during quick unit tests (useful in CI or when Mongo cannot start locally) set `SKIP_MONGO=1`.

  - PowerShell (Windows):

    $env:SKIP_MONGO='1'
    npm test -- --runInBand

  - Linux / macOS or with `cross-env`:

    cross-env SKIP_MONGO=1 npm test -- --runInBand

- **Files changed** (summary):
  - `src/middlewares/rateLimit.ts` — new middleware implementing per-user and per-IP limits.
  - `src/routes/analysis.route.ts` — `userAnalysisRateLimit()` applied to `POST /analyze`.
  - `src/routes/upload.route.ts` — `anonymousIpRateLimit()` applied to the upload router.
  - `tests/unit/rateLimit.middleware.test.ts` — new unit tests covering normal, at-limit, over-limit and anonymous IP limiting.
  - `tests/setup-env.js` — allow `SKIP_MONGO=1` to speed up unit test runs.

- **Next steps for production readiness**:
  - Replace in-memory maps with Redis (or another central store) and use TTLs and atomic increments.
  - Add monitoring/metrics and dashboards for blocked requests.
  - Add exponential backoff or temporary bans for repeat offenders if desired.
