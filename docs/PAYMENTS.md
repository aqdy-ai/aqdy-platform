# Payments Integration (Stripe)

## Overview

Aqdy uses Stripe as the primary payment provider for subscriptions and billing.

Current implementation covers:

* Stripe SDK initialization
* Secure environment variable configuration
* Sandbox connection verification
* Foundation for future subscription and billing features

---

## Installation

Install Stripe in the backend project:

```bash
npm install stripe
```

---

## Environment Variables

Add the following variables to `.env`:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxx
```

### Notes

* Never commit real API keys to Git.
* Store production keys in deployment secrets.
* Use Stripe test keys during development.

---

## Stripe Client Initialization

```ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

---

## Sandbox Verification

Run:

```bash
npm run verify:stripe
```

The verification performs:

```ts
await stripe.products.list({ limit: 1 });
```

A successful response confirms connectivity with Stripe Test Mode.

---

## Payment Flow (Initial Draft)

1. User selects a subscription plan.
2. Backend creates a Stripe Checkout Session.
3. User completes payment on Stripe Checkout.
4. Stripe sends webhook events.
5. Backend updates subscription status.
6. Billing records are stored in the database.
7. User gains access to paid features.

---

## Security Guidelines

* Do not hardcode Stripe keys.
* Use environment variables only.
* Validate webhook signatures.
* Use Stripe Test Mode for development.
* Rotate keys if exposed.

---

## Future Enhancements

* Subscription management
* Webhook processing
* Payment history
* Invoice generation
* Refund handling
* Billing dashboard
