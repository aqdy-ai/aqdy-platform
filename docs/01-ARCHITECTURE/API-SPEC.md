# API Specification

> OpenAPI 3.0 REST API endpoints, authorization strategies, and payload specifications for the Aqdy platform.

The Aqdy backend provides a RESTful API built on Express.js. This page details key endpoints, authentication rules, and request/response payloads.

---

## 🚀 Live API Documentation (Swagger UI)

A live, interactive Swagger UI is served directly from the backend server in development and staging environments:

*   **Endpoint:** `http://localhost:3000/api/docs` (or your corresponding environment base URL)
*   **Implementation:** Rendered dynamically using the `swagger-ui-express` and `swagger-jsdoc` packages.

---

## 🔒 Authentication & Authorization

Aqdy uses a cookie-based JWT authentication scheme to protect user data:
*   **Access Token (`accessToken`):** Passed via an `httpOnly`, secure cookie for standard authorization.
*   **Refresh Token (`refreshToken`):** Passed via an `httpOnly`, secure cookie to request fresh access tokens.
*   **Role-Based Access Control (RBAC):** Admin and management endpoints require specific role memberships (`admin`, `financial_admin`, `support_admin`, etc.).

---

## 🛣️ Core API Endpoints

### 1. Authentication (`/api/auth`)

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | No | Registers a new user. Sets access/refresh tokens in cookies. |
| `POST` | `/api/auth/login` | No | Authenticates with email and password. Sets cookies. |
| `POST` | `/api/auth/google` | No | Authenticates via Google ID token. Registers user if new. |
| `POST` | `/api/auth/logout` | No | Clears the refresh and access token cookies. |
| `POST` | `/api/auth/refresh` | No | Generates a new access token using a valid refresh token. |
| `GET` | `/api/auth/me` | Yes | Returns details of the currently authenticated user session. |

---

### 2. Account Management (`/api/account`)

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/account/profile` | Yes | Retrieves profile information for the current user. |
| `PATCH`| `/api/account/profile` | Yes | Updates user details (name, email, or password). |
| `DELETE`| `/api/account` | Yes | Soft-deletes the logged-in user account. |
| `GET` | `/api/account/subscription` | Yes | Fetches active subscription details and credit usage. |
| `POST` | `/api/account/subscription/cancel`| Yes | Cancels the current active recurring subscription plan. |

---

### 3. Contracts & Timeline (`/api/contracts` & `/api/account/contracts`)

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/contracts/upload` | Yes | Uploads a contract file, extracts raw text, and saves metadata. |
| `GET` | `/api/account/contracts` | Yes | Returns a paginated list of contracts owned by the user. |
| `GET` | `/api/account/contracts/{contractId}` | Yes | Retrieves full metadata and the latest analysis for a contract. |
| `DELETE`| `/api/account/contracts/{contractId}` | Yes | Soft-deletes a contract (hides it from the history list). |

#### Query Parameters for Listing Contracts (`GET /api/account/contracts`)
*   `page` (integer, default: `1`): Target page.
*   `limit` (integer, default: `10`, max: `50`): Results per page.
*   `status` (string: `analyzed`, `pending`, `failed`): Filters by analysis state.
*   `filename` (string): Partial, case-insensitive filename search.
*   `sortBy` (string, default: `uploadedAt`): Sort key (`uploadedAt`, `riskLevel`).
*   `sortOrder` (string, default: `desc`): Sort direction (`asc`, `desc`).

---

### 4. Risk Analysis Pipeline (`/api/analysis`)

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/analysis/analyze` | Yes | Starts contract analysis. Enqueues a BullMQ background job. |
| `GET` | `/api/analysis/{contractId}` | Yes | Retrieves analysis results (scores, diffs, clauses) by contract ID. |

#### Start Analysis Request (`POST /api/analysis/analyze`)
```json
{
  "contractId": "64abc123def456",
  "userId": "user_123"
}
```

#### Example Analysis Output (`GET /api/analysis/{contractId}`)
```json
{
  "_id": "64abc789ghi012",
  "contractId": "64abc123def456",
  "userId": "user_123",
  "version": 1,
  "executiveSummary": {
    "overallRisk": "high",
    "totalClauses": 12,
    "riskyClausesCount": 3,
    "summary": {
      "ar": "هذا العقد يحتوي على بنود مسؤولية عالية المخاطر...",
      "en": "This contract contains high-risk liability clauses..."
    }
  },
  "clauseAnalysis": [
    {
      "clauseText": "يقوم الطرف الأول بتعويض الطرف الثاني عن كافة الأضرار...",
      "clauseType": "indemnity",
      "riskLevel": "high",
      "confidence": 0.94,
      "lowConfidenceWarning": false,
      "kbCitationMissing": false,
      "explanation": {
        "ar": "هذا البند يفرض التزاماً غير محدود للتعويض باللغة العربية...",
        "en": "This clause imposes an unlimited indemnity obligation..."
      },
      "sourceFromKB": "EG-CIVIL-2024-ND-102",
      "redlineSuggestion": "يقوم الطرف الأول بتعويض الطرف الثاني عن الأضرار المباشرة فقط بحد أقصى..."
    }
  ],
  "diffSummary": null,
  "analysisDuration": 2100
}
```

---

### 5. Clause Interactive Chat (`/api/contracts/.../chat`)

Supports real-time interactive questioning regarding specific clauses in a contract.

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/contracts/{contractId}/clauses/{clauseIndex}/chat` | Yes | SSE (Server-Sent Events) chat stream about a clause. Deducts usage credits. |

#### Request Structure
```json
{
  "message": "هل هناك سقف مالي للتعويض في هذا البند؟",
  "history": [
    { "role": "user", "content": "ما طبيعة هذا البند؟" },
    { "role": "assistant", "content": "هذا بند تعويض قانوني..." }
  ]
}
```

---

### 6. Billing, Plans & Payments (`/api/plans` & `/api/payments`)

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/plans` | No | Returns a list of all active subscription plans. |
| `GET` | `/api/plans/{slug}` | No | Returns plan configuration details by its slug identifier. |
| `POST` | `/api/payments/checkout` | Yes | Initiates a Stripe Checkout session to purchase/upgrade. |
| `GET` | `/api/payments/success` | No | Redirect target upon successful checkout confirmation. |
| `GET` | `/api/payments/cancel` | No | Redirect target when user cancels payment flow. |
| `POST` | `/api/payments/webhook` | No | Webhook handler receiving direct transaction payloads from Stripe. |
| `GET` | `/api/account/payments` | Yes | Retrieves user's paginated invoice payments list. |
| `GET` | `/api/account/payments/{id}` | Yes | Retrieves invoice details by ID. |
| `GET` | `/api/account/payments/{id}/invoice` | Yes | Downloads invoice receipt PDF. |

---

### 7. Administrative Controls (`/api/admin`)

Requires `admin` role authorization cookies.

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Yes (Admin) | Returns platform-wide usage metrics, active counts, and monthly revenue. |
| `GET` | `/api/admin/accounts` | Yes (Admin) | Lists all user accounts (filterable, searchable, paginated). |
| `GET` | `/api/admin/accounts/{id}` | Yes (Admin) | Retrieves a user's full account history, subscription, and actions. |
| `PATCH`| `/api/admin/accounts/{id}` | Yes (Admin) | Modifies user tier details, status, or role levels. |
| `DELETE`| `/api/admin/accounts/{id}` | Yes (Admin) | Hard-deletes a user account and associated documents from the DB. |
| `GET` | `/api/admin/payments` | Yes (Admin) | Returns a global history of all payments made on the platform. |
| `GET` | `/api/admin/evaluations/stats` | Yes (Admin) | Retrieves average evaluation metrics (faithfulness, relevancy) over time. |
| `GET` | `/api/admin/evaluations/low-scores` | Yes (Admin) | Lists evaluation scores that fell below the quality threshold (< 3). |
| `POST` | `/api/admin/evaluations/re-evaluate/{id}`| Yes (Admin) | Force triggers a fresh Judge evaluation run. |
| `POST` | `/api/admin/evaluations/backfill` | Yes (Admin) | Triggers evaluations for all analyses that lack scorecards. |
