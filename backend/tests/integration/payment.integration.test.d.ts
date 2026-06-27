/**
 * Integration tests for the Plan Upgrade / Checkout flow
 *
 * Run with:  npx jest payment --testPathPattern=payment.integration
 *
 * Requirements:
 * - STRIPE_SECRET_KEY set to a Stripe **test** key (sk_test_...)
 * - STRIPE_WEBHOOK_SECRET set to the webhook signing secret
 * - MongoDB test instance available (MONGODB_URI_TEST or MONGODB_URI)
 * - A seeded "premium" Plan document with a valid stripePriceId
 *
 * The tests use Stripe test-mode cards and mock the webhook signature so
 * they do not require an actual network-reachable webhook endpoint.
 */
export {};
//# sourceMappingURL=payment.integration.test.d.ts.map