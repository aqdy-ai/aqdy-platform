/**
 * Payment routes
 *
 * IMPORTANT: The /webhook route must use express.raw() — NOT express.json() —
 * so Stripe can verify the payload signature. Register this router BEFORE any
 * body-parsing middleware in your app entry point, or configure the raw parser
 * only for this path.
 *
 * Example app.ts:
 *
 *   // Raw body for Stripe webhooks (must come before express.json())
 *   app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
 *   app.use(express.json());
 *   app.use("/api/payments", paymentsRouter);
 */

import { Router } from "express";
import express from "express";
import { paymentController } from "../controllers/payment.controller.js";
import {
  authenticateJwt,
  requireEmailVerified,
} from "../middlewares/auth.middleware.js";

const router = Router();

// ── Public (unauthenticated) ──────────────────────────────────────────────────

/**
 * POST /api/payments/webhook
 *
 * Stripe sends signed events here. Must receive the raw request body.
 * Apply express.raw() at the route level if not done globally.
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook.bind(paymentController),
);

/**
 * GET /api/payments/success?session_id=:id
 *
 * Stripe redirects the user here after a successful payment.
 * No auth required — session_id is the capability token.
 */
router.get(
  "/success",
  paymentController.confirmSession.bind(paymentController),
);

/**
 * GET /api/payments/cancel
 *
 * Stripe redirects the user here if they abandon checkout.
 * Read-only — no DB writes.
 */
router.get("/cancel", paymentController.cancelSession.bind(paymentController));

// ── Authenticated ─────────────────────────────────────────────────────────────

/**
 * POST /api/payments/checkout
 * Body: { planSlug: string }
 *
 * Creates a Stripe Checkout session and returns the URL to redirect to.
 */
router.post(
  "/checkout",
  authenticateJwt,
  requireEmailVerified,
  paymentController.createCheckoutSession.bind(paymentController),
);

export default router;
