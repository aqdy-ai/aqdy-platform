# Payments Integration (Stripe)

## Overview

Aqdy uses **Stripe** as the primary payment provider for handling subscriptions, billing, and invoice generation. The system is designed to be idempotent, auditable, and integrated with the credits system.

**Key Capabilities:**
- Stripe Checkout session creation for plan upgrades
- Webhook-driven subscription lifecycle management
- Automatic credit topup on successful payment
- Invoice generation and delivery
- Payment history and billing records
- Admin payment and subscription management

---

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Environment Configuration](#environment-configuration)
3. [Payment Flow](#payment-flow)
4. [Subscription Lifecycle](#subscription-lifecycle)
5. [Webhook Events](#webhook-events)
6. [API Endpoints](#api-endpoints)
7. [Stripe Checkout Integration](#stripe-checkout-integration)
8. [Invoice Generation](#invoice-generation)
9. [Error Handling & Idempotency](#error-handling--idempotency)
10. [Admin Operations](#admin-operations)
11. [Testing & Verification](#testing--verification)
12. [Security Best Practices](#security-best-practices)

---

## Installation & Setup

### 1. Install Stripe Package

```bash
cd backend
npm install stripe
```

### 2. Create Stripe Products and Prices

Use the seed script to create or update Stripe products (plans) in your test account:

```bash
npm run seed:plans
```

This script:
- Creates products for each plan (Free, Pro, Enterprise)
- Creates monthly and annual price IDs
- Stores Stripe IDs in the `Plan` database

### 3. Verify Stripe Connection

```bash
npm run verify:stripe
```

This verifies:
- Stripe API keys are valid
- Sandbox connection is working
- Can list products from Stripe

---

## Environment Configuration

### Required Environment Variables

Add these to `.env` in the backend folder:

```bash
# Stripe API Keys (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxx

# Frontend URL (for Stripe Checkout redirects)
FRONTEND_URL=http://localhost:5173
```

### Obtaining Stripe Keys

1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers** → **API Keys**
3. Copy:
   - **Secret Key** → `STRIPE_SECRET_KEY`
   - **Publishable Key** → `STRIPE_PUBLISHABLE_KEY`
4. Go to **Developers** → **Webhooks**
5. Create a webhook endpoint pointing to `{BACKEND_URL}/api/payments/webhook`
6. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

### Security Notes

- **Never commit real API keys** to version control
- Use environment variables only
- For production, use Stripe Live Mode keys
- Rotate keys if exposed
- Webhook secret is critical for signature verification

---

## Payment Flow

### High-Level User Journey

```
User Upgrades Plan
        ↓
Backend creates Stripe Checkout session
        ↓
User redirected to Stripe Checkout
        ↓
User enters payment details
        ↓
User completes payment on Stripe
        ↓
Stripe redirects to success URL
        ↓
Backend confirms checkout session
        ↓
Subscription created in database
        ↓
Credits topup granted to user
        ↓
User gains access to new plan features
```

### Detailed Flow

#### Step 1: User Initiates Checkout

**Request:**
```
POST /api/payments/checkout
Content-Type: application/json
Cookie: accessToken=...

{
  "planSlug": "pro",
  "billingCycle": "monthly"  // or "annual"
}
```

**Backend Processing:**
```typescript
// payment.controller.ts
const session = await paymentService.createCheckoutSession(
  userId,
  planId,
  billingCycle
);

// Returns Stripe session ID and checkout URL
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/pay/cs_test_1234567890"
  },
  "message": "Checkout session created successfully"
}
```

#### Step 2: User Completes Payment

- User is redirected to Stripe Checkout
- Enters payment details (card, billing address, etc.)
- Completes payment

#### Step 3: Stripe Confirms Payment

After successful payment, Stripe:
1. Creates a subscription in Stripe
2. Sends `checkout.session.completed` webhook event
3. Redirects user to success page

#### Step 4: Backend Processes Webhook

**Webhook Event:** `checkout.session.completed`

```typescript
// Stripe sends POST /api/payments/webhook
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_1234567890",
      "customer": "cus_test_1234567890",
      "metadata": {
        "userId": "507f1f77bcf86cd799439011",
        "planId": "507f1f77bcf86cd799439012",
        "planSlug": "pro",
        "billingCycle": "monthly"
      }
    }
  }
}
```

**Backend Processing (webhook or success callback):**
1. Verify webhook signature (webhook path only)
2. Retrieve Stripe subscription to get period dates
3. Idempotency check — bail if `stripeSubscriptionId` already recorded
4. Expire any existing active subscriptions for this user
5. Create new `Subscription` record with status `"active"`
6. Update `User.plan` / `User.planSlug` / `User.status` to `"active"`
7. Top up credits via `creditsService.topup(userId, plan.creditAllowance, "plan_topup")`
8. Record `Payment` document (handles duplicate key errors gracefully)
9. Log to `AuditLog` for idempotency (webhook path only)

**Result:** User now has an active subscription and credits.

---

## Subscription Lifecycle

### State Diagram

```
        ┌─────────────────────────────────────────────────────────────────┐
        │                      SUBSCRIPTION LIFECYCLE                      │
        └─────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │   Free      │  (Auto-created for new users)
    │ (status: -) │
    └──────┬──────┘
           │
           │ User upgrades
           ↓
    ┌─────────────┐
    │   Active    │  (After successful payment)
    │ (status: ✓) │
    └──────┬──────┘
           │
      ┌────┴─────────────┬──────────────────┐
      │                  │                  │
  Payment    Subscription     User
   fails      expires      cancels
      │         │              │
      ↓         ↓              ↓
   ┌─────────┐ ┌───────────┐ ┌──────────┐
   │Past Due │ │ Cancelled │ │Cancelled │
   │(status?)│ │(status:✗) │ │(status:✗)│
   └────┬────┘ └───────────┘ └──────────┘
        │
        │ Payment retry succeeds OR
        │ Manual intervention
        ↓
    ┌─────────────┐
    │   Active    │
    └─────────────┘
```

### Active Subscription

**Initial State:**
- User successfully completes payment
- `Subscription.status = "active"`
- `Subscription.startDate` = Today
- `Subscription.renewalDate` = Today + billing period (1 month or 1 year)

**Automatic Renewal:**
- Stripe attempts to charge on renewal date
- If successful, sends `invoice.paid` webhook
- Backend updates `renewalDate` and tops up credits

**During Active Period:**
- User has full access to plan features
- Can use allocated analyses and chat messages
- Credits refresh on renewal

### Renewal (invoice.paid)

**Stripe Webhook Event:**
```json
{
  "type": "invoice.paid",
  "data": {
    "object": {
      "id": "in_test_1234567890",
      "subscription": "sub_test_1234567890",
      "customer": "cus_test_1234567890"
    }
  }
}
```

**Backend Processing:**
1. Find subscription by Stripe subscription ID
2. Update `renewalDate` (add 1 month/year)
3. Update `endDate` accordingly
4. Top up credits: `creditsService.topupForPlanAllowance()`
5. Log renewal event

**User Experience:**
- Credits refilled on renewal date
- No interruption to service

### Payment Failure (invoice.payment_failed)

**Stripe Webhook Event:**
```json
{
  "type": "invoice.payment_failed",
  "data": {
    "object": {
      "id": "in_test_1234567890",
      "subscription": "sub_test_1234567890",
      "customer": "cus_test_1234567890"
    }
  }
}
```

**Backend Processing:**
1. Find subscription by Stripe subscription ID
2. Set `Subscription.status = "past_due"`
3. **Suspend user**: `User.status = "suspended"` — blocks analysis/chat
4. Record failed `Payment` event
5. Log failure to `AuditLog`

**Stripe Retry Logic:**
- Stripe automatically retries for 3-4 days
- Sends additional `invoice.payment_failed` events on retry attempts
- If successful after retry, sends `invoice.paid` webhook

**Subscription Recovery (invoice.paid after past_due):**
1. `handleSuccessfulRenewal()` updates `Subscription.status → "active"`
2. `User.status` is restored to `"active"` (user regains platform access)
3. Credits are topped up per plan allowance
4. Renewal payment is recorded
5. The `customer.subscription.updated` handler also restores `User.status` when
   Stripe reports the subscription transition from `past_due` back to `active`

**User Actions:**
- Update payment method in Stripe portal
- Or manually retry via dashboard

### Cancellation (customer.subscription.deleted)

**Scenarios:**
1. User cancels subscription
2. Admin cancels subscription
3. Stripe cancels due to repeated payment failures

**Stripe Webhook Event:**
```json
{
  "type": "customer.subscription.deleted",
  "data": {
    "object": {
      "id": "sub_test_1234567890",
      "customer": "cus_test_1234567890"
    }
  }
}
```

**Backend Processing:**
1. Find subscription by Stripe subscription ID
2. Set `Subscription.status = "cancelled"`
3. Set `Subscription.cancelledAt = now`
4. Downgrade user to Free plan: `User.plan = "free"`
5. Reset credits to free plan allowance
6. Log cancellation event

**User Experience:**
- Loses access to paid features
- Can view past analyses
- Can upgrade again anytime

### Downgrade / Plan Change

**User changes plan** (e.g. Pro to Enterprise or Pro to Free):

1. User initiates checkout for new plan
2. Stripe creates new subscription
3. Stripe cancels old subscription
4. Backend receives two webhook events (order **not** guaranteed):
   - `checkout.session.completed` (new plan)
   - `customer.subscription.deleted` (old plan)
5. The `customer.subscription.deleted` handler **checks whether the user already
   has a newer active subscription** before downgrading to Free. If a newer
   active subscription exists, the downgrade is skipped. This prevents a race
   condition where the deletion event arrives after activation.
6. New subscription becomes active; old one is marked `cancelled`
7. Credits are topped up based on new plan

---

## Webhook Events

### Supported Webhook Events

The backend listens for these Stripe events:

| Event | Handler | Action |
|-------|---------|--------|
| `checkout.session.completed` | `fulfillSubscription()` | Create subscription, topup credits |
| `invoice.paid` | `handleSuccessfulRenewal()` | Update renewal date, topup credits |
| `invoice.payment_failed` | `handleFailedPayment()` | Set past_due, suspend account |
| `customer.subscription.updated` | (inline) | Update status/dates |
| `customer.subscription.deleted` | (inline) | Cancel subscription, downgrade user |

### Webhook Security

**Stripe sends webhooks with a signature.** Backend must verify:

```typescript
// backend/src/services/payment.service.ts
const event = stripe.webhooks.constructEvent(
  req.body,           // Raw body (not JSON-parsed)
  signature,          // X-Stripe-Signature header
  webhookSecret       // From .env
);

// If signature invalid, throws error → 403 response
```

**Critical:** Express middleware must use `express.raw()` for webhook route:

```typescript
// backend/src/routes/payment.route.ts
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use("/api/payments", paymentsRouter);
```

Middleware order matters — `raw()` must come first!

### Webhook Idempotency

**Problem:** Webhook might be delivered multiple times (network retry).

**Solution:** Check AuditLog for duplicate events:

```typescript
// backend/src/services/payment.service.ts — handleWebhook()
const existingLog = await AuditLog.findOne({
  "metadata.stripeEventId": event.id,
});
if (existingLog) {
  logger.info(`Skipping already processed Stripe event: ${event.id}`);
  return;
}

// ... process webhook ...

await AuditLog.create({
  action: "STRIPE_WEBHOOK",
  outcome: "success",
  metadata: {
    stripeEventId: event.id,
    eventType: event.type,
  },
});
```

Each webhook is logged with Stripe event ID, preventing duplicate processing.

**Additional idempotency in `fulfillSubscription()`:**
- The `Subscription.stripeSubscriptionId` field has a **unique sparse index** in MongoDB, so duplicate `Subscription.create()` calls safely fail with E11000.
- The `Payment.providerTxId` field also has a **unique index** — duplicate payment records are caught and skipped.

---

## API Endpoints

### User Endpoints

#### 1. Create Checkout Session

**Endpoint:** `POST /api/payments/checkout`

**Authentication:** Required (cookie)

**Request:**
```json
{
  "planId": "507f1f77bcf86cd799439011",
  "billingCycle": "monthly"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/pay/cs_test_1234567890"
  },
  "message": "Checkout session created successfully"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Invalid plan ID",
  "statusCode": 400
}
```

**Status Codes:**
- **200** - Session created, redirect user to `url`
- **400** - Bad request (invalid plan, missing fields)
- **401** - Not authenticated
- **500** - Server error

---

#### 2. Confirm Payment (Success Callback)

**Endpoint:** `GET /api/payments/success`

**Query Parameters:**
- `session_id` - Stripe Checkout session ID

**Purpose:** Called by Stripe after user completes payment

**Backend Processing:**
1. Retrieve session from Stripe
2. Verify payment successful
3. Call `fulfillSubscription()`
4. Return confirmation page or redirect

**Response:**
```json
{
  "success": true,
  "message": "Payment successful! Your subscription is now active."
}
```

---

#### 3. Cancel Payment Callback

**Endpoint:** `GET /api/payments/cancel`

**Query Parameters:**
- `session_id` - Stripe Checkout session ID

**Purpose:** Called by Stripe if user cancels checkout

**Response:**
```json
{
  "success": false,
  "message": "Checkout was cancelled. You can try again anytime."
}
```

---

#### 4. Get Payment History

**Endpoint:** `GET /api/account/payments`

**Authentication:** Required (cookie)

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "userId": "507f1f77bcf86cd799439012",
        "amount": 9.99,
        "currency": "USD",
        "status": "success",
        "provider": "stripe",
        "providerTxId": "cs_test_1234567890",
        "planId": "507f1f77bcf86cd799439013",
        "billingCycle": "monthly",
        "createdAt": "2026-06-10T10:30:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "pages": 1
  },
  "message": "Payments retrieved successfully"
}
```

**Status Codes:**
- **200** - Success
- **401** - Not authenticated
- **500** - Server error

---

#### 5. Get Single Payment

**Endpoint:** `GET /api/account/payments/:id`

**Authentication:** Required (cookie)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "amount": 9.99,
    "currency": "USD",
    "status": "success",
    "provider": "stripe",
    "providerTxId": "cs_test_1234567890",
    "createdAt": "2026-06-10T10:30:00Z"
  },
  "message": "Payment retrieved successfully"
}
```

**Status Codes:**
- **200** - Success
- **401** - Not authenticated
- **403** - User cannot access another user's payment
- **404** - Payment not found
- **500** - Server error

---

#### 6. Download Invoice PDF

**Endpoint:** `GET /api/account/payments/:id/invoice`

**Authentication:** Required (cookie)

**Response:**
- Content-Type: `application/pdf`
- Filename: `invoice-{paymentId}.pdf`
- Returns PDF document

**Status Codes:**
- **200** - PDF returned
- **401** - Not authenticated
- **403** - User cannot access another user's invoice
- **404** - Payment or invoice not found
- **500** - Server error

---

### Admin Endpoints

#### Get All Payments (Admin)

**Endpoint:** `GET /api/admin/payments`

**Authentication:** Admin only

**Query Parameters:**
- `userId` (optional) - Filter by user
- `status` (optional) - "success", "failed", "pending"
- `startDate` (optional) - ISO date
- `endDate` (optional) - ISO date
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [{ ... }],
    "total": 150,
    "page": 1,
    "pages": 8
  }
}
```

---

## Stripe Checkout Integration

### Creating Checkout Session

**Location:** `backend/src/services/payment.service.ts`

```typescript
async createCheckoutSession(
  userId: string,
  planSlugOrId: string,
  billingCycle: "monthly" | "annual" = "monthly",
): Promise<{ url: string }> {
  // 1. Resolve plan by slug (or ObjectId fallback)
  // 2. Determine price ID (monthly or annual, falls back to monthly)
  // 3. Create or reuse Stripe customer
  // 4. Create Stripe session with metadata
  // 5. Return checkout URL
}
```

### Session Metadata

Stripe session stores user/plan info for later retrieval:

```json
{
  "metadata": {
    "userId": "507f1f77bcf86cd799439011",
    "planId": "507f1f77bcf86cd799439012",
    "planSlug": "pro",
    "billingCycle": "monthly"
  }
}
```

### Redirect URLs

**Success:**
```
https://frontend-url/payment/success?session_id=cs_test_1234567890
```

**Cancel:**
```
https://frontend-url/pricing
```

### Line Items

Each checkout session includes:
- Plan name
- Price (monthly or annual)
- Currency (USD by default)

---

## Invoice Generation

### Automatic Invoice Creation

**Trigger:** User completes successful payment

**Generated:** PDF document with:
- Invoice ID (Stripe transaction ID)
- Date
- Company branding
- Plan name and amount
- Payment status

**Location:** `backend/src/services/payment.service.ts`

```typescript
async generateInvoicePdf(payment: IPayment): Promise<Buffer> {
  // Uses PDFKit library
  // Creates professional invoice
  // Returns PDF as Buffer
}
```

### Invoice Access

**Endpoint:** `GET /api/account/payments/:id/invoice`

**Security:** Users can only download their own invoices

---

## Error Handling & Idempotency

### Idempotent Operations

**Problem:** Network issues can cause requests/webhooks to be replayed

**Solution:** All critical operations are idempotent

```typescript
// fulfillSubscription() is idempotent via:
// 1. Explicit findOne check for stripeSubscriptionId
// 2. MongoDB unique sparse index on stripeSubscriptionId (catches races)
// 3. Duplicate key error caught and ignored
async fulfillSubscription(session: Stripe.Checkout.Session): Promise<void> {
  const { userId, planId } = session.metadata || {};

  const stripeSubscriptionId = session.subscription as string;

  // Idempotency check
  const exists = await Subscription.findOne({ stripeSubscriptionId });
  if (exists) return;

  const plan = await Plan.findById(planId);
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

  // Expire old subscriptions
  await Subscription.updateMany(
    { userId, status: "active" },
    { status: "expired" },
  );

  // Create new subscription (duplicate-key-safe)
  try {
    await Subscription.create({ ... stripeSubscriptionId, ... });
  } catch (err: any) {
    if (err.code === 11000) return; // race winner already created it
    throw err;
  }

  // Update user's plan + restore status to active
  await User.findByIdAndUpdate(userId, {
    plan: plan.slug,
    planSlug: plan.slug,
    status: "active",
  });

  // Top up credits
  if (plan.creditAllowance > 0) {
    await creditsService.topup(userId, plan.creditAllowance, "plan_topup");
  }
}
```

### Error Handling

**PaymentError:**
```typescript
class PaymentError extends AppError {
  constructor(message: string) {
    super(402, message);
  }
}
```

**InsufficientCreditsError:**
```typescript
// Thrown when deduction fails
// Returns 402 status (Payment Required)
```

**Common Errors:**

| Condition | Status | Message |
|-----------|--------|---------|
| Invalid plan | 400 | "Plan not found" |
| Stripe failure | 500 | "Payment processing failed" |
| Invalid session | 400 | "Session not found or expired" |
| No credits after payment | 500 | "Failed to grant credits" |

---

## Admin Operations

### Manual Subscription Management

**Cancel Subscription:**
```typescript
await subscriptionService.cancelSubscription(userId);
```

**Check Usage:**
```typescript
const usage = await subscriptionService.getUsageStats(userId);
// Returns: { analysesUsed, analysisLimit, chatUsed, chatLimit }
```

---

## Testing & Verification

### Stripe Test Mode

All development uses **Stripe Test Mode** (sandbox):

**Test Card Numbers:**
- Visa (Success): `4242 4242 4242 4242`
- Visa (Decline): `4000 0000 0000 0002`
- Amex (Success): `3782 822463 10005`

**Test Expiry:** Any future date (e.g., 12/26)

**Test CVC:** Any 3-4 digits

### Verify Stripe Connection

```bash
npm run verify:stripe
```

Checks:
- API key validity
- Sandbox connectivity
- Can list products

### Webhook Testing Locally

Use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli

# Forward webhooks to local endpoint
stripe listen --forward-to localhost:3000/api/payments/webhook

# You'll get a webhook secret to add to .env
# STRIPE_WEBHOOK_SECRET=whsec_test_...
```

**Trigger Test Events:**
```bash
stripe trigger payment_intent.succeeded
stripe trigger invoice.paid
stripe trigger customer.subscription.deleted
```

---

## Security Best Practices

### 1. API Keys

- ✅ Store in environment variables only
- ✅ Use separate keys for dev/staging/prod
- ✅ Rotate keys if exposed
- ❌ Never commit to version control
- ❌ Never log or output keys

### 2. Webhook Signature Verification

- ✅ Always verify Stripe signature
- ✅ Use raw body for verification
- ✅ Reject unsigned requests
- ❌ Don't trust webhook data without verification

### 3. Payment Data

- ✅ Store only necessary fields (amount, status, Stripe IDs)
- ✅ Never store full card numbers
- ✅ Stripe handles PCI compliance
- ❌ Don't capture or log sensitive payment info

### 4. Rate Limiting

- ✅ Implement rate limits on payment endpoints
- ✅ Prevent checkout spam
- ❌ Don't allow unlimited checkout attempts

### 5. Error Messages

- ✅ Log full errors server-side
- ✅ Return generic errors to client
- ❌ Don't expose sensitive details in error messages

---

## Related Documentation

- [CREDITS.md](CREDITS.md) - Credits system (integrated with subscriptions)
- [USER_GUIDE.md](USER_GUIDE.md) - Plan upgrade flow and billing for end users
- [backend/src/services/payment.service.ts](../backend/src/services/payment.service.ts) - Full implementation
- [backend/src/models/payment.model.ts](../backend/src/models/payment.model.ts) - Schema definition
- [Stripe Documentation](https://stripe.com/docs)
* Billing dashboard
