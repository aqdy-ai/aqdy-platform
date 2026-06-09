// payment.integration.test.ts
// Integration tests for Stripe payment flow, webhook events, credit deductions, plan downgrade, and 402 enforcement.
// Uses mongodb-memory-server for an isolated DB and Stripe test mode (stripe-mock).

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Stripe from 'stripe';
import { jest } from '@jest/globals';
import { paymentService } from '../src/services/payment.service.js';
import { stripe } from '../src/services/payment.service.js';
import { Plan } from '../src/models/plan.model.js';

// Mock Stripe SDK methods used in tests
beforeAll(() => {
  jest.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({ url: 'https://checkout.test/session' } as any);
  jest.spyOn(stripe.customers, 'create').mockResolvedValue({ id: 'cus_test_123' } as any);
  jest.spyOn(stripe.subscriptions, 'retrieve').mockImplementation(async (subId: string) => {
    const now = Math.floor(Date.now() / 1000);
    return {
      id: subId,
      current_period_start: now,
      current_period_end: now + 30 * 24 * 60 * 60,
    } as any;
  });
});
import { creditsService, InsufficientCreditsError } from '../src/services/credits.service.js';
import { subscriptionService } from '../src/services/subscription.service.js';
import { User } from '../src/models/user.model.js';
import { env } from '../src/config/env.js';

let mongod: MongoMemoryServer;
let testUserId: string;
let freePlanId: string;
let proPlanId: string;

/** Helper: create a Stripe test event with a valid signature */
function buildStripeEvent(type: string, data: any): { payload: Buffer; signature: string } {
  const payloadObj = { id: 'evt_test', object: 'event', type, data: { object: data } };
  const payloadStr = JSON.stringify(payloadObj);
  const timestamp = Math.floor(Date.now() / 1000);
  // Use the Stripe instance to generate a test webhook header
  const testHeader = stripe.webhooks.generateTestHeaderString({
    payload: payloadStr,
    secret: env.STRIPE_WEBHOOK_SECRET,
    timestamp,
  });
  return { payload: Buffer.from(payloadStr), signature: testHeader };
}

beforeAll(async () => {
  // Start in‑memory MongoDB
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // Seed plans: free and pro
  const freePlan = await Plan.create({
    name: 'Free',
    slug: 'free',
    creditAllowance: 100,
    stripePriceId: null,
    isActive: true,
    billingCycle: 'monthly',
    analysisLimit: -1,
    storageLimit: -1,
    price: null,
  });
  const proPlan = await Plan.create({
    name: 'Pro',
    slug: 'pro',
    creditAllowance: 1000,
    stripePriceId: 'price_12345', // dummy price id – stripe‑mock accepts any string
    isActive: true,
    billingCycle: 'monthly',
    analysisLimit: -1,
    storageLimit: -1,
    price: 20,
  });
  freePlanId = freePlan._id.toString();
  proPlanId = proPlan._id.toString();

  // Create test user linked to free plan
  const user = await User.create({
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed',
    plan: 'free',
    planSlug: 'free',
    creditBalance: 0,
    stripeCustomerId: null,
  });
  testUserId = user._id.toString();
});

afterAll(async () => {


// Reset user state before each test to ensure isolation
beforeEach(async () => {
  await User.findByIdAndUpdate(testUserId, { creditBalance: 0, plan: 'free', planSlug: 'free' });
});


});

/**
 * 1️⃣ Full checkout flow – creates a session, simulates Stripe success, verifies subscription & credit top‑up.
 */
test('full checkout flow creates subscription and tops up credits', async () => {
  const session = await paymentService.createCheckoutSession(testUserId, 'pro');
  expect(session.url).toBeDefined();

  const fakeSession = {
    id: 'cs_test_123',
    object: 'checkout.session',
    payment_status: 'paid',
    metadata: { userId: testUserId, planId: proPlanId },
    amount_total: 2000,
    currency: 'usd',
    subscription: 'sub_test_123',
    customer: 'cus_test_123',
  } as any as Stripe.Checkout.Session;

  // Directly call the internal fulfillment logic (used by webhook & success handler)
  await (paymentService as any).fulfillSubscription(fakeSession);

  const sub = await subscriptionService.getUserSubscription(testUserId);
  expect(sub).toBeTruthy();
  expect(sub?.status).toBe('active');

  const balance = await creditsService.getBalance(testUserId);
  expect(balance).toBe(1000); // matches pro plan allowance
});

/**
 * 2️⃣ Webhook events handling.
 */
test('processes all relevant Stripe webhook events', async () => {
  // ----- checkout.session.completed -----
  const csCompleted = {
    id: 'cs_test_123',
    object: 'checkout.session',
    payment_status: 'paid',
    metadata: { userId: testUserId, planId: proPlanId },
    amount_total: 2000,
    currency: 'usd',
    subscription: 'sub_test_123',
    customer: 'cus_test_123',
  } as any as Stripe.Checkout.Session;
  const { payload: csPayload, signature: csSig } = buildStripeEvent(
    'checkout.session.completed',
    csCompleted,
  );
  await paymentService.handleWebhook(csPayload, csSig);
  let sub = await subscriptionService.getUserSubscription(testUserId);
  expect(sub?.status).toBe('active');

  // ----- invoice.paid (renewal) -----
  const invoicePaid = {
    id: 'in_test_paid',
    object: 'invoice',
    subscription: 'sub_test_123',
    amount_paid: 2000,
    currency: 'usd',
  } as any as Stripe.Invoice;
  const { payload: invPayload, signature: invSig } = buildStripeEvent(
    'invoice.paid',
    invoicePaid,
  );
  await paymentService.handleWebhook(invPayload, invSig);
  const balanceAfterRenew = await creditsService.getBalance(testUserId);
  expect(balanceAfterRenew).toBe(2000); // two top‑ups of 1000 each

  // ----- invoice.payment_failed -----
  const invoiceFailed = {
    id: 'in_test_failed',
    object: 'invoice',
    subscription: 'sub_test_123',
    amount_due: 2000,
    currency: 'usd',
  } as any as Stripe.Invoice;
  const { payload: failPayload, signature: failSig } = buildStripeEvent(
    'invoice.payment_failed',
    invoiceFailed,
  );
  await paymentService.handleWebhook(failPayload, failSig);
  const userAfterFail = await User.findById(testUserId);
  expect(userAfterFail?.status).toBe('suspended');

  // ----- customer.subscription.deleted (downgrade) -----
  const delEvent = {
    id: 'sub_test_123',
    object: 'subscription',
    status: 'canceled',
  } as any as Stripe.Subscription;
  const { payload: delPayload, signature: delSig } = buildStripeEvent(
    'customer.subscription.deleted',
    delEvent,
  );
  await paymentService.handleWebhook(delPayload, delSig);

  sub = await subscriptionService.getUserSubscription(testUserId);
  expect(sub?.status).toBe('cancelled');
  const userAfterCancel = await User.findById(testUserId);
  expect(userAfterCancel?.plan).toBe('free');
  const finalBalance = await creditsService.getBalance(testUserId);
  expect(finalBalance).toBe(100); // free plan allowance
});

/**
 * 3️⃣ Credit deduction for an analysis task with token metadata.
 */
test('analysis deduction creates proper ledger entry', async () => {
  await creditsService.topup(testUserId, 500, 'plan_topup');
  const cost = await creditsService.estimateCost(250);
  const entry = await creditsService.deduct(testUserId, cost, {
    tokensUsed: 250,
    reason: 'analysis_deduction',
  });
  expect(entry.delta).toBe(-cost);
  expect(entry.metadata.tokensUsed).toBe(250);
});

/**
 * 4️⃣ Chat deductions – three separate messages.
 */
test('chat deductions generate three ledger entries', async () => {
  await creditsService.topup(testUserId, 10, 'plan_topup');
  for (let i = 0; i < 3; i++) {
    await creditsService.deduct(testUserId, 1, { reason: 'chat_deduction' });
  }
  const balance = await creditsService.getBalance(testUserId);
  expect(balance).toBe(7);
  const ledger = await creditsService.getLedgerEntries(testUserId, 10);
  const chatEntries = ledger.filter((e) => e.reason === 'chat_deduction');
  expect(chatEntries.length).toBe(3);
});

/**
 * 5️⃣ Exhaust free‑plan credits – expect 402 error.
 */
test('exhausted free plan credits trigger 402', async () => {
  // Force user onto free plan with zero balance
  await User.findByIdAndUpdate(testUserId, { plan: 'free', planSlug: 'free', creditBalance: 0 });
  await expect(
    creditsService.deduct(testUserId, 1, { reason: 'analysis_deduction' }),
  ).rejects.toThrow(InsufficientCreditsError);
});
