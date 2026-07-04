# Rate Limiting (Backend)

## Purpose
Protect the platform from abuse and enforce plan limits for Free tier users.

---

## Implemented Policies

| Policy | Limit | Window | Applies To |
|--------|-------|--------|------------|
| Per-user analysis (Free tier) | 10 requests | 24h (UTC) | `POST /api/analysis/analyze` |
| Anonymous IP | 20 requests | 15 min | `POST /api/upload/` (legacy upload router) |
| Forgot password | 5 requests | 1 hour | `POST /api/auth/forgot-password` |

**Where it lives:** `src/middlewares/rateLimit.ts`

---

## Audit Findings (This Review)

### 🔴 Critical Gaps

| Endpoint | Issue | Risk | Recommendation |
|----------|-------|------|-----------------|
| `POST /api/auth/login` | No rate limit | Brute-force credential stuffing | Add per-IP limit: 10 attempts / 15 min |
| `POST /api/auth/register` | No rate limit | Spam account creation, email bombing | Add per-IP limit: 5 accounts / hour |
| `POST /api/auth/refresh` | No rate limit | Token refresh abuse | Add per-user limit: 30 / hour |
| `POST /api/contracts/upload` (contract.route.ts) | No rate limit AND no auth middleware | Unauthenticated AI-cost-incurring uploads | Add `authenticateJwt` + per-user limit (this route appears to be a legacy/duplicate of `upload.route.ts` — **flag for removal or consolidation**) |
| `POST /:contractId/clauses/:clauseIndexStr/chat` (clauseChat) | No rate limit | Unbounded LLM cost — each chat message is an LLM call | Add per-user limit: 30 messages / hour (Free), higher for Pro |

### 🟡 Medium Priority Gaps

| Endpoint | Issue | Risk | Recommendation |
|----------|-------|------|-----------------|
| `POST /api/payments/checkout` | No rate limit | Stripe API abuse, duplicate session creation | Add per-user limit: 10 / hour |
| All `/api/admin/*` routes | No rate limit | Lower risk (admin-only via `requireAdmin`), but no defense-in-depth | Add per-admin-user limit: 100 / min as safety net |
| `POST /api/auth/resend-verification` | No rate limit | Email flooding | Add per-user limit: 3 / hour (similar to forgot-password) |

### 🟢 Correctly Protected

| Endpoint | Strategy | Status |
|----------|----------|--------|
| `POST /api/analysis/analyze` | Per-user daily limit (Free tier) + credits enforcement + ownership check | ✅ |
| `POST /api/upload/` | Anonymous IP limit + storage limit + credits check | ✅ |
| `POST /api/auth/forgot-password` | Per-IP hourly limit | ✅ |

---

## Strategy Verification

**Confirmed:** The codebase correctly applies two different strategies as required:

- **Public-facing/unauthenticated routes** (forgot-password, anonymous upload) → **IP-based** limiting via `anonymousIpRateLimit()` / `forgotPasswordRateLimit()`.
- **Authenticated routes** (analysis) → **Per-user** limiting via `userAnalysisRateLimit()`, scoped to `x-user-tier: free`.

**Gap:** Auth routes (`login`, `register`) have **neither** strategy applied, despite being the most common brute-force/spam target in any system. These are public-facing and should use **IP-based** limiting, matching the pattern already used for `forgot-password`.

---

## AI-Cost Endpoints — Strictness Review

| Endpoint | Cost driver | Current limit | Assessment |
|----------|-------------|----------------|------------|
| `POST /api/analysis/analyze` | 3-agent LLM pipeline (Extractor + RiskClassifier × N clauses + Redline) per call | 10/day (Free) | ✅ Appropriately strict — this is the most expensive single operation in the platform |
| `POST /api/upload/` | Triggers `analysisService.triggerAnalysis()` in background — same cost as analyze | 20 requests / 15 min (IP-based, anonymous only) | ⚠️ **Authenticated** uploads have NO limit beyond storage/credits — credits enforcement is the only backstop |
| Clause chat | 1 LLM call per message | None | 🔴 Needs a dedicated limit — see Critical Gaps |

**Recommendation:** Credits enforcement (`enforceCreditsBeforeAnalysis`) acts as a soft rate limit since it costs money to call repeatedly, but it does not protect against rapid-fire abuse within a single credit balance (e.g., a Pro user with high credits could still hammer the endpoint). Recommend adding a **per-user request-per-minute cap** (e.g., 5/min) independent of credit balance, to prevent burst abuse and protect the Gemini API quota.

---

## Response Headers

**Current state:** Only `Retry-After` is set, and only on a 429 response.

**Gap:** No `X-RateLimit-Limit`, `X-RateLimit-Remaining`, or `X-RateLimit-Reset` headers are returned on **successful** requests, so clients cannot proactively back off before hitting the limit.

**Recommendation (not yet implemented):**
```typescript
res.setHeader("X-RateLimit-Limit", String(FREE_TIER_DAILY_LIMIT));
res.setHeader("X-RateLimit-Remaining", String(Math.max(0, FREE_TIER_DAILY_LIMIT - entry.count)));
res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
```
This should be added to `ensureEntry()` callers in `rateLimit.ts` so every limited route — not just 429 responses — exposes its quota state.

---

## Scalability Concerns

### Current Implementation: In-Memory Maps

```typescript
const userDailyLimits = new Map<string, RateLimitEntry>();
const anonymousIpLimits = new Map<string, RateLimitEntry>();
const forgotPasswordLimits = new Map<string, RateLimitEntry>();
```

**Concerns:**
1. **Multi-instance deployments break this entirely.** If Aqdy scales horizontally (multiple Node processes/containers behind a load balancer), each instance has its own in-memory Map. A user could get 10 free analyses **per instance**, not 10 total — defeating the purpose of the limit.
2. **Memory leak risk.** Entries are never proactively cleaned up — they rely on `resetAt` checks on next access. A high-cardinality key space (e.g., many distinct IPs hitting `anonymousIpLimits`) with low repeat traffic means stale entries accumulate indefinitely until process restart.
3. **No persistence across restarts.** A deploy or crash resets all counters, giving every user a free reset of their daily limit.

### Recommended Path Forward

1. **Short term (no infra change):** Add a periodic cleanup `setInterval` that sweeps expired entries from all three Maps every 10 minutes, to bound memory growth until Redis migration.
2. **Medium term (recommended):** Migrate to **Redis** with `INCR` + `EXPIRE` for atomic, distributed counters:
```typescript
   const key = `ratelimit:analysis:${userId}:${dateKey}`;
   const count = await redis.incr(key);
   if (count === 1) await redis.expire(key, 86400);
   if (count > FREE_TIER_DAILY_LIMIT) { /* 429 */ }
```
   This is a drop-in replacement that preserves the existing `ensureEntry`/`buildLimitResponse` interface while making limits correct across all instances.
3. **Long term:** Consider a dedicated rate-limiting library (`rate-limiter-flexible` with a Redis store) once multiple limit tiers (per-plan, per-endpoint) grow beyond what hand-rolled Maps can cleanly express.

---

## Headers Used

- `x-user-id` — authenticated user identifier. Missing/`anonymous` → treated as unauthenticated.
- `x-user-tier` — plan indicator (`free`, `pro`, etc.). Defaults to `free` if omitted.
- `x-forwarded-for` — client IP source when behind a proxy/load balancer.

---

## Test Utilities

- `resetRateLimitStores()` exported from `src/middlewares/rateLimit.ts` — clears all in-memory counters between test runs.
- New: `tests/integration/rateLimiting.integration.test.ts` — covers limit exhaustion and recovery for `analyze`, `forgot-password`, and `upload` (anonymous IP).

---

## Running Tests Locally

```bash
# Skip mongodb-memory-server for fast unit-only runs
cross-env SKIP_MONGO=1 npm test -- --runInBand
```

---

## Files Changed (This Audit)

- `RATE_LIMITING.md` — updated with audit findings, gap analysis, scalability recommendations
- `tests/integration/rateLimiting.integration.test.ts` — new integration tests covering exhaustion/recovery for 3+ routes

---

## Backlog Items (Not Fixed in This PR)

- [ ] Add IP-based rate limiting to `POST /api/auth/login`
- [ ] Add IP-based rate limiting to `POST /api/auth/register`
- [ ] Add per-user rate limiting to `POST /api/auth/refresh`
- [ ] Add per-user rate limiting to clause chat endpoint
- [ ] Investigate and likely remove/consolidate duplicate `contract.route.ts` upload endpoint (no auth, no rate limit)
- [ ] Add `X-RateLimit-*` response headers on all limited routes
- [ ] Migrate from in-memory Maps to Redis for multi-instance correctness
- [ ] Add per-minute burst protection to `/api/analysis/analyze` independent of credit balance