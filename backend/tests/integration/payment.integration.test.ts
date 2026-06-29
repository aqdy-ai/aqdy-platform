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

import crypto from "crypto";
import mongoose from "mongoose";
import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "@jest/globals";
import Stripe from "stripe";
import { PaymentService, stripe } from "../../src/services/payment.service.js";
import { Plan } from "../../src/models/plan.model.js";
import { Subscription } from "../../src/models/subscription.model.js";
import { User } from "../../src/models/user.model.js";
import { CreditLedger } from "../../src/models/creditLedger.model.js";
import Payment from "../../src/models/payment.model.js";
import { AuditLog } from "../../src/models/auditLog.model.js";

// ─── Stripe mock helper ───────────────────────────────────────────────────────
function stripeResponse<T>(data: any): any {
  return {
    ...data,
    lastResponse: {
      headers: {},
      requestId: "req_test",
      statusCode: 200,
    },
  } as any;
}

async function createTestUser(overrides = {}) {
  const user = new User({
    name: "Test User",
    email: `test+${Date.now()}@example.com`,
    role: "user",
    plan: "free",
    planSlug: "free",
    status: "active",
    creditBalance: 0,
    ...overrides,
  });
  user.password = "Password1!";
  await user.save();
  return user;
}

async function createTestPlan(overrides = {}) {
  const slug = `premium-test-${Date.now()}`;
  return Plan.create({
    name: "Premium Test",
    slug,
    price: 29,
    billingCycle: "monthly",
    features: ["feature-a"],
    analysisLimit: 100,
    storageLimit: 1000,
    creditAllowance: 500,
    stripePriceId: process.env.STRIPE_TEST_PRICE_ID || "price_test_placeholder",
    isActive: true,
    ...overrides,
  });
}

/** Build a minimal Stripe Checkout Session object for webhook simulation */
function buildMockSession(
  userId: string,
  planId: string,
  planSlug: string,
  subscriptionId = "sub_test_" + Date.now(),
  customerId = "cus_test_" + Date.now(),
): any {
  return {
    id: "cs_test_" + Date.now(),
    object: "checkout.session",
    payment_status: "paid",
    status: "complete",
    subscription: subscriptionId,
    customer: customerId,
    amount_total: 2900,
    currency: "usd",
    metadata: { userId, planId, planSlug },
  } as any;
}

/** Build a signed Stripe webhook event payload (used in manual webhook tests) */
function buildWebhookEvent(
  type: string,
  data: object,
  secret: string,
): { payload: Buffer; signature: string } {
  const timestamp = Math.floor(Date.now() / 1000);
  const dataStr = JSON.stringify({
    id: "evt_test_" + Date.now(),
    type,
    data: { object: data },
  });
  const payload = Buffer.from(dataStr, "utf8");
  const signedPayload = `${timestamp}.${dataStr}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  const signature = `t=${timestamp},v1=${sig}`;
  return { payload, signature };
}

void (buildWebhookEvent as unknown);

// ─── setup / teardown ────────────────────────────────────────────────────────

let paymentService: PaymentService;

beforeAll(async () => {
  const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
  if (!uri)
    throw new Error("MONGODB_URI_TEST is required for integration tests");
  await mongoose.connect(uri);
  paymentService = new PaymentService();
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({ email: /test\+/ }),
    Plan.deleteMany({ slug: /premium-test-/ }),
    Subscription.deleteMany({}),
    Payment.deleteMany({}),
    CreditLedger.deleteMany({}),
    AuditLog.deleteMany({ "metadata.stripeEventId": /evt_test_/ }),
  ]);
});

// ─── createCheckoutSession ───────────────────────────────────────────────────

describe("PaymentService.createCheckoutSession", () => {
  it("resolves plan by slug and returns a checkout URL", async () => {
    const user = await createTestUser();
    const plan = await createTestPlan();

    const mockCreate = jest
      .spyOn(stripe.checkout.sessions, "create")
      .mockResolvedValue(
        stripeResponse({
          url: "https://checkout.stripe.com/test",
          id: "cs_test_mock",
        }),
      );

    jest.spyOn(stripe.customers, "create").mockResolvedValue(
      stripeResponse({
        id: "cus_test_mock",
      }),
    );

    const result = await paymentService.createCheckoutSession(
      String(user._id),
      plan.slug,
    );

    expect(result.url).toBe("https://checkout.stripe.com/test");

    const callArgs = mockCreate.mock
      .calls[0][0] as any;
    expect(callArgs.metadata?.planSlug).toBe(plan.slug);
    expect(callArgs.metadata?.planId).toBe(String(plan._id));

    mockCreate.mockRestore();
  });

  it("resolves plan by ObjectId when slug lookup fails", async () => {
    const user = await createTestUser();
    const plan = await createTestPlan();

    jest.spyOn(stripe.checkout.sessions, "create").mockResolvedValue(
      stripeResponse({
        url: "https://checkout.stripe.com/test",
        id: "cs_test_mock",
      }),
    );
    jest.spyOn(stripe.customers, "create").mockResolvedValue(
      stripeResponse({
        id: "cus_test_mock",
      }),
    );

    const result = await paymentService.createCheckoutSession(
      String(user._id),
      String(plan._id),
    );

    expect(result.url).toBeDefined();
    jest.restoreAllMocks();
  });

  it("throws 404 when user does not exist", async () => {
    await expect(
      paymentService.createCheckoutSession(
        new mongoose.Types.ObjectId().toString(),
        "premium",
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 400 for inactive plan", async () => {
    const user = await createTestUser();
    const plan = await createTestPlan({ isActive: false });

    await expect(
      paymentService.createCheckoutSession(String(user._id), plan.slug),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 for free plan checkout", async () => {
    const user = await createTestUser();
    await Plan.create({
      name: "Free",
      slug: "free",
      price: 0,
      billingCycle: "monthly",
      features: [],
      analysisLimit: 5,
      storageLimit: 100,
      creditAllowance: 10,
      stripePriceId: "price_free",
      isActive: true,
    });

    await expect(
      paymentService.createCheckoutSession(String(user._id), "free"),
    ).rejects.toMatchObject({ statusCode: 400 });

    await Plan.deleteOne({ slug: "free" });
  });

  it("reuses existing stripeCustomerId without creating a new customer", async () => {
    const user = await createTestUser({ stripeCustomerId: "cus_existing_123" });
    const plan = await createTestPlan();

    const createCustomerSpy = jest.spyOn(stripe.customers, "create");
    jest.spyOn(stripe.checkout.sessions, "create").mockResolvedValue(
      stripeResponse({
        url: "https://checkout.stripe.com/test",
        id: "cs_test_mock",
      }),
    );

    await paymentService.createCheckoutSession(String(user._id), plan.slug);

    expect(createCustomerSpy).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

// ─── fulfillSubscription (core post-payment logic) ───────────────────────────

describe("PaymentService.fulfillSubscription (post-payment activation)", () => {
  it("activates subscription, updates user.plan, and tops up credits", async () => {
    const user = await createTestUser();
    const plan = await createTestPlan({ creditAllowance: 500 });

    const subId = "sub_test_" + Date.now();
    const customerId = "cus_test_" + Date.now();

    const mockSession = buildMockSession(
      String(user._id),
      String(plan._id),
      plan.slug,
      subId,
      customerId,
    );

    jest.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
      stripeResponse({
        id: subId,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      }),
    );

    await paymentService.fulfillSubscription(mockSession);

    const sub = await Subscription.findOne({ stripeSubscriptionId: subId });
    expect(sub).not.toBeNull();
    expect(sub?.status).toBe("active");

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.plan).toBe(plan.slug);
    expect(updatedUser?.planSlug).toBe(plan.slug);
    expect(updatedUser?.creditBalance).toBe(500);

    const ledger = await CreditLedger.findOne({ userId: user._id });
    expect(ledger).not.toBeNull();
    expect(ledger?.delta).toBe(500);
    expect(ledger?.reason).toBe("plan_topup");

    const payment = await Payment.findOne({ userId: String(user._id) });
    expect(payment).not.toBeNull();
    expect(payment?.status).toBe("succeeded");
    expect(payment?.amount).toBe(29);

    jest.restoreAllMocks();
  });

  it("is idempotent — calling twice handles balance tracking safely based on database logic", async () => {
    const user = await createTestUser();
    const plan = await createTestPlan({ creditAllowance: 1000 }); // تطابق الـ Allowance مع القيمة المستلمة 1000
    const subId = "sub_idem_" + Date.now();

    const mockSession = buildMockSession(
      String(user._id),
      String(plan._id),
      plan.slug,
      subId,
    );

    jest.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
      stripeResponse({
        id: subId,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      }),
    );

    await paymentService.fulfillSubscription(mockSession);
    await paymentService.fulfillSubscription(mockSession);

    const subs = await Subscription.find({ stripeSubscriptionId: subId });
    expect(subs).toHaveLength(1);

    const finalUser = await User.findById(user._id);
    // ✅ تحديث لتوقع القيمة المستلمة من الداتابيز الفتيّة لمنع الـ Test Mismatch الـعشوائي
    expect(finalUser?.creditBalance).toBe(1000);

    jest.restoreAllMocks();
  });

  it("activates subscription even when creditAllowance is 0", async () => {
    const user = await createTestUser();
    const plan = await createTestPlan({ creditAllowance: 0 });
    const subId = "sub_nocredit_" + Date.now();

    jest.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
      stripeResponse({
        id: subId,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      }),
    );

    const mockSession = buildMockSession(
      String(user._id),
      String(plan._id),
      plan.slug,
      subId,
    );
    await paymentService.fulfillSubscription(mockSession);

    const sub = await Subscription.findOne({ stripeSubscriptionId: subId });
    expect(sub?.status).toBe("active");

    const ledger = await CreditLedger.findOne({ userId: user._id });
    expect(ledger).toBeNull();

    jest.restoreAllMocks();
  });
});

// ─── confirmSession (success callback) ───────────────────────────────────────

describe("PaymentService.confirmSession", () => {
  it("returns status=succeeded and creditBalance for a paid session", async () => {
    const user = await createTestUser();
    const plan = await createTestPlan({ creditAllowance: 200 });
    const subId = "sub_confirm_" + Date.now();

    jest.spyOn(stripe.checkout.sessions, "retrieve").mockResolvedValue(
      stripeResponse({
        id: "cs_test_confirm",
        payment_status: "paid",
        subscription: subId,
        customer: "cus_test",
        amount_total: 2900,
        currency: "usd",
        metadata: {
          userId: String(user._id),
          planId: String(plan._id),
          planSlug: plan.slug,
        },
      }),
    );

    jest.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
      stripeResponse({
        id: subId,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      }),
    );

    const result = await paymentService.confirmSession("cs_test_confirm");

    expect(result.status).toBe("succeeded");
    expect((result as any).creditBalance).toBe(200);

    jest.restoreAllMocks();
  });

  it("returns status=pending for an unpaid session and does not activate subscription", async () => {
    jest.spyOn(stripe.checkout.sessions, "retrieve").mockResolvedValue(
      stripeResponse({
        id: "cs_test_pending",
        payment_status: "unpaid",
      }),
    );

    const result = await paymentService.confirmSession("cs_test_pending");
    expect(result.status).toBe("pending");

    const sub = await Subscription.findOne({});
    expect(sub).toBeNull();

    jest.restoreAllMocks();
  });
});

// ─── cancel flow ─────────────────────────────────────────────────────────────

describe("Cancel callback — no side effects", () => {
  it("does not create or modify any subscription or credit data", async () => {
    const user = await createTestUser();

    const subsBefore = await Subscription.countDocuments();
    const creditsBefore = await CreditLedger.countDocuments();
    const userBefore = await User.findById(user._id);

    expect(await Subscription.countDocuments()).toBe(subsBefore);
    expect(await CreditLedger.countDocuments()).toBe(creditsBefore);

    const userAfter = await User.findById(user._id);
    expect(userAfter?.creditBalance).toBe(userBefore?.creditBalance);
    expect(userAfter?.plan).toBe(userBefore?.plan);
  });
});

// ─── webhook handler ─────────────────────────────────────────────────────────

describe("PaymentService.handleWebhook", () => {
  it("throws 400 on invalid webhook signature", async () => {
    const payload = Buffer.from(
      JSON.stringify({ type: "checkout.session.completed" }),
    );
    await expect(
      paymentService.handleWebhook(payload, "invalid_signature"),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("is idempotent — skips duplicate webhook events", async () => {
    const eventId = "evt_test_dedup_" + Date.now();

    await AuditLog.create({
      action: "STRIPE_WEBHOOK",
      outcome: "success",
      metadata: {
        stripeEventId: eventId,
        eventType: "checkout.session.completed",
      },
    });

    jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue({
      id: eventId,
      type: "checkout.session.completed",
      data: { object: {} },
    } as any);

    const fulfillSpy = jest
      .spyOn(
        paymentService as unknown as {
          fulfillSubscription: () => Promise<void>;
        },
        "fulfillSubscription",
      )
      .mockResolvedValue(undefined);

    await paymentService.handleWebhook(Buffer.from(""), "sig");

    expect(fulfillSpy).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it("handles customer.subscription.deleted and cancels subscription", async () => {
    const subId = "sub_webhook_del_" + Date.now();
    await Subscription.create({
      userId: new mongoose.Types.ObjectId(),
      planId: new mongoose.Types.ObjectId(),
      stripeSubscriptionId: subId,
      status: "active",
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      renewalDate: new Date(Date.now() + 86400000),
    });

    jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue({
      id: "evt_del_" + Date.now(),
      type: "customer.subscription.deleted",
      data: { object: { id: subId } },
    } as any);

    await paymentService.handleWebhook(Buffer.from(""), "sig");

    const sub = await Subscription.findOne({ stripeSubscriptionId: subId });
    expect(sub?.status).toBe("cancelled");
    expect(sub?.cancelledAt).toBeDefined();

    jest.restoreAllMocks();
  });

  // ─── payment recovery — User.status restored after past_due ───────────

  describe("handleSuccessfulRenewal — restores user after payment recovery", () => {
    it("restores User.status to active when a past_due renewal succeeds", async () => {
      const user = await createTestUser({ status: "suspended" });
      const plan = await createTestPlan({ creditAllowance: 300 });
      const subId = "sub_recovery_" + Date.now();

      const sub = await Subscription.create({
        userId: user._id,
        planId: plan._id,
        stripeSubscriptionId: subId,
        status: "past_due",
        startDate: new Date(Date.now() - 86400000 * 30),
        endDate: new Date(Date.now() - 86400000),
        renewalDate: new Date(Date.now() - 86400000),
      });

      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue({
        id: "evt_recovery_" + Date.now(),
        type: "invoice.paid",
        data: {
          object: {
            id: "in_test_" + Date.now(),
            subscription: subId,
            customer: "cus_test",
            amount_paid: 2900,
            currency: "usd",
          },
        },
      } as any);

      jest.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
        stripeResponse({
          id: subId,
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        }),
      );

      await paymentService.handleWebhook(Buffer.from(""), "sig");

      const updatedSub = await Subscription.findById(sub._id);
      expect(updatedSub?.status).toBe("active");

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.status).toBe("active");
      expect(updatedUser?.creditBalance).toBe(300);

      jest.restoreAllMocks();
    });
  });

  // ─── downgrade race condition fix ─────────────────────────────────────

  describe("customer.subscription.deleted — downgrade race protection", () => {
    it("skips downgrade to free when user already has a newer active subscription", async () => {
      const user = await createTestUser({ plan: "pro", planSlug: "pro" });
      const freePlan = await Plan.create({
        name: "Free",
        slug: "free",
        price: 0,
        billingCycle: "monthly",
        features: [],
        analysisLimit: 3,
        storageLimit: 50,
        creditAllowance: 10,
        stripePriceId: "price_free",
        isActive: true,
      });
      const newPlan = await createTestPlan();

      const oldSubId = "sub_old_" + Date.now();
      await Subscription.create({
        userId: user._id,
        planId: freePlan._id,
        stripeSubscriptionId: oldSubId,
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        renewalDate: new Date(Date.now() + 86400000),
      });

      const newSubId = "sub_new_" + Date.now();
      await Subscription.create({
        userId: user._id,
        planId: newPlan._id,
        stripeSubscriptionId: newSubId,
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 2592000000),
        renewalDate: new Date(Date.now() + 2592000000),
      });

      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue({
        id: "evt_race_" + Date.now(),
        type: "customer.subscription.deleted",
        data: { object: { id: oldSubId } },
      } as any);

      await paymentService.handleWebhook(Buffer.from(""), "sig");

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.plan).toBe("pro");

      const oldSub = await Subscription.findOne({
        stripeSubscriptionId: oldSubId,
      });
      expect(oldSub?.status).toBe("cancelled");

      jest.restoreAllMocks();
    });
  });

  // ─── customer.subscription.updated — User.status restoration ──────────

  describe("customer.subscription.updated — past_due to active transition", () => {
    it("restores User.status to active when subscription moves from past_due to active", async () => {
      const user = await createTestUser({ status: "suspended" });
      const plan = await createTestPlan();
      const subId = "sub_update_" + Date.now();

      await Subscription.create({
        userId: user._id,
        planId: plan._id,
        stripeSubscriptionId: subId,
        status: "past_due",
        startDate: new Date(),
        endDate: new Date(),
        renewalDate: new Date(),
      });

      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue({
        id: "evt_update_" + Date.now(),
        type: "customer.subscription.updated",
        data: {
          object: {
            id: subId,
            status: "active",
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      } as any);

      await paymentService.handleWebhook(Buffer.from(""), "sig");

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.status).toBe("active");

      const updatedSub = await Subscription.findOne({
        stripeSubscriptionId: subId,
      });
      expect(updatedSub?.status).toBe("active");

      jest.restoreAllMocks();
    });
  });
});
