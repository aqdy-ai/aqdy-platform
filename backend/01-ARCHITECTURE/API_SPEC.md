# Aqdy Platform — API Specification

**Base URL:** `https://aqdy-api.railway.app/api`
**Auth:** Bearer JWT via `Authorization: Bearer <token>` or HttpOnly cookie

---

## Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login and get JWT |
| POST | `/auth/logout` | ❌ | Invalidate refresh token |
| POST | `/auth/refresh` | ❌ | Refresh access token |
| GET | `/auth/me` | ✅ | Get current user info |
| POST | `/auth/verify-email` | ❌ | Verify email address |
| POST | `/auth/resend-verification` | ✅ | Resend verification email |
| POST | `/auth/forgot-password` | ❌ | Request password reset (rate limited: 5/hr) |
| POST | `/auth/reset-password` | ❌ | Reset password with token |

---

## Upload (`/api/upload`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/upload/` | ✅ | Upload PDF/DOCX → triggers AI pipeline (202) |
| GET | `/upload/:id` | ❌ | Get contract by ID |

**POST /upload/ Request:**
```
Content-Type: multipart/form-data
Body: contract (file) — PDF or DOCX
```

**POST /upload/ Response (202):**
```json
{
  "contractId": "...",
  "filename": "contract.pdf",
  "language": "ar",
  "status": "processing"
}
```

---

## Analysis (`/api/analysis`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/analysis/analyze` | ✅ | Start analysis for uploaded contract |
| GET | `/analysis/:contractId` | ❌ | Get analysis results or status |

**POST /analysis/analyze Request:**
```json
{ "contractId": "ObjectId", "userId": "string" }
```

**GET /analysis/:contractId Response:**
```json
{
  "status": "processing | completed | failed",
  "executiveSummary": {
    "overallRisk": "high",
    "totalClauses": 10,
    "summary": { "ar": "...", "en": "..." }
  },
  "clauseAnalysis": [
    {
      "clauseText": "...",
      "clauseType": "liability",
      "riskLevel": "high",
      "confidence": 0.85,
      "explanation": { "ar": "...", "en": "..." },
      "redlineSuggestion": "..."
    }
  ]
}
```

---

## Account (`/api/account`) — All require Auth ✅

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/account/profile` | Get user profile |
| PATCH | `/account/profile` | Update name, email, password |
| DELETE | `/account/` | Soft delete account |
| GET | `/account/credits` | Get credit balance |
| GET | `/account/subscription` | Get active subscription |
| POST | `/account/subscription/cancel` | Cancel subscription |
| GET | `/account/contracts` | List contracts (paginated + filtered) |
| GET | `/account/contracts/export` | Export CSV/JSON (Pro+ only) |
| GET | `/account/contracts/:contractId` | Get contract detail |
| DELETE | `/account/contracts/:contractId` | Soft delete contract |
| GET | `/account/payments` | Payment history |
| GET | `/account/payments/:id` | Payment detail |
| GET | `/account/payments/:id/invoice` | Download invoice |

**GET /account/contracts Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Per page (default: 10, max: 50) |
| `uploadedAfter` | ISO date | Filter by upload date |
| `uploadedBefore` | ISO date | Filter by upload date |
| `status` | string | `analyzed` \| `pending` \| `failed` |
| `filename` | string | Partial filename search |
| `sortBy` | string | `uploadedAt` \| `analyzedAt` \| `riskLevel` |
| `sortOrder` | string | `asc` \| `desc` |

---

## Plans (`/api/plans`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/plans` | ❌ | List all active plans |
| GET | `/plans/:slug` | ❌ | Get plan by slug |

---

## Payments (`/api/payments`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments/checkout` | ✅ | Create Stripe checkout session |
| GET | `/payments/success` | ❌ | Stripe redirect after payment |
| GET | `/payments/cancel` | ❌ | Stripe redirect on cancel |
| POST | `/payments/webhook` | ❌ | Stripe webhook (raw body) |

---

## Admin (`/api/admin`) — All require Admin role ✅

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/accounts` | List all users (paginated) |
| GET | `/admin/accounts/:id` | User detail + usage stats |
| PATCH | `/admin/accounts/:id` | Update user plan/status/role |
| DELETE | `/admin/accounts/:id` | Hard delete user |
| GET | `/admin/contracts` | List all contracts (paginated) |
| GET | `/admin/payments` | List all payments (paginated) |
| GET | `/admin/stats` | Platform health metrics |
| GET | `/admin/dashboard` | Full dashboard aggregation |
| GET | `/admin/audit-logs` | Audit log viewer |
| GET | `/admin/audit-logs/actions` | List audit action types |
| GET | `/admin/audit-logs/stats` | Last 24h audit stats |

---

## Health (`/api/health`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Server health check |

---

## Error Responses

All errors follow this shape:
```json
{
  "success": false,
  "error": "Error message",
  "message": "Optional detail"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad Request — validation failed |
| 401 | Unauthorized — missing/invalid JWT |
| 402 | Payment Required — insufficient credits |
| 403 | Forbidden — wrong ownership or plan |
| 404 | Not Found |
| 409 | Conflict — e.g. email already exists |
| 422 | Unprocessable — e.g. empty contract text |
| 429 | Too Many Requests — rate limit hit |
| 500 | Internal Server Error |

**429 Response:**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 300
}
```
Headers: `Retry-After: <seconds>`
