import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { PaymentService } from "../../src/services/payment.service.js";
import { User } from "../../src/models/user.model.js";
import { Plan } from "../../src/models/plan.model.js";
import { Subscription } from "../../src/models/subscription.model.js";
import { Payment } from "../../src/models/payment.model.js";
import { AuditLog } from "../../src/models/auditLog.model.js";
import { AppError } from "../../src/middlewares/errorHandler.js";


// ── Mock Stripe ───────────────────────────────────
const mockStripeInstance = {
  products: { list: jest.fn() },
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
  subscriptions: { retrieve: jest.fn() },
};

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => mockStripeInstance);
});

// ── Mock Models ───────────────────────────────────
jest.mock("../../src/models/user.model.js");
jest.mock("../../src/models/plan.model.js");
jest.mock("../../src/models/subscription.model.js");
jest.mock("../../src/models/payment.model.js");
jest.mock("../../src/models/auditLog.model.js");

describe("PaymentService", () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentService = new PaymentService();
  });

  describe("verifyConnection", () => {
    test("should return true when Stripe is reachable", async () => {
      (mockStripeInstance.products.list as jest.Mock).mockResolvedValue({ data: [{}, {}] });
      const result = await paymentService.verifyConnection();
      expect(result).toBe(true);
      expect(mockStripeInstance.products.list).toHaveBeenCalledWith({ limit: 1 });
    });

    test("should return false when Stripe call fails", async () => {
      (mockStripeInstance.products.list as jest.Mock).mockRejectedValue(new Error("API Error"));
      const result = await paymentService.verifyConnection();
      expect(result).toBe(false);
    });
  });

  describe("createCheckoutSession", () => {
    const userId = "user123";
    const planId = "plan456";

    test("should throw 404 if user is not found", async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);
      await expect(paymentService.createCheckoutSession(userId, planId)).rejects.toThrow(AppError);
    });

    test("should throw 400 if plan is invalid or inactive", async () => {
      (User.findById as jest.Mock).mockResolvedValue({ email: "test@test.com" });
      (Plan.findById as jest.Mock).mockResolvedValue(null);
      await expect(paymentService.createCheckoutSession(userId, planId)).rejects.toThrow(AppError);
    });

    test("should create a new Stripe customer if user doesn't have one", async () => {
      const mockUser = {
        _id: userId,
        email: "test@test.com",
        name: "Test User",
        stripeCustomerId: undefined,
        set: jest.fn(),
        save: jest.fn(),
      };
      const mockPlan = { _id: planId, isActive: true, stripePriceId: "price_abc", slug: "pro" };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Plan.findById as jest.Mock).mockResolvedValue(mockPlan);
      (mockStripeInstance.customers.create as jest.Mock).mockResolvedValue({ id: "cus_new" });
      (mockStripeInstance.checkout.sessions.create as jest.Mock).mockResolvedValue({ url: "<https://stripe.com/pay>" });

      const result = await paymentService.createCheckoutSession(userId, planId);

      expect(mockStripeInstance.customers.create).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.url).toBe("<https://stripe.com/pay>");
    });

    test("should return session URL for existing customer", async () => {
      const mockUser = { _id: userId, stripeCustomerId: "cus_existing" };
      const mockPlan = { _id: planId, isActive: true, stripePriceId: "price_abc" };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Plan.findById as jest.Mock).mockResolvedValue(mockPlan);
      (mockStripeInstance.checkout.sessions.create as jest.Mock).mockResolvedValue({ url: "<https://stripe.com/pay>" });

      const result = await paymentService.createCheckoutSession(userId, planId);

      expect(mockStripeInstance.customers.create).not.toHaveBeenCalled();
      expect(result.url).toBe("<https://stripe.com/pay>");
    });
  });

  describe("handleWebhook", () => {
    const signature = "sig_123";
    const payload = Buffer.from('{"id": "evt_123"}');

    test("should throw 400 if signature verification fails", async () => {
      (mockStripeInstance.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await expect(paymentService.handleWebhook(payload, signature)).rejects.toThrow(AppError);
    });

    test("should skip processing if event was already handled (idempotency)", async () => {
      (mockStripeInstance.webhooks.constructEvent as jest.Mock).mockReturnValue({ id: "evt_duplicate" });
      (AuditLog.findOne as jest.Mock).mockResolvedValue({ _id: "log123" });

      await paymentService.handleWebhook(payload, signature);

      expect(AuditLog.create).not.toHaveBeenCalled();
    });

    test("should process checkout.session.completed and fulfill subscription", async () => {
      const mockSession = {
        object: "checkout.session",
        metadata: { userId: "u1", planId: "p1" },
        subscription: "sub_123",
        customer: "cus_123",
        amount_total: 2000,
        currency: "usd",
        id: "sess_123",
      };
      const mockEvent = { id: "evt_new", type: "checkout.session.completed", data: { object: mockSession } };
      const mockStripeSub = { id: "sub_123", current_period_start: 1000, current_period_end: 2000 };

      (mockStripeInstance.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
      (AuditLog.findOne as jest.Mock).mockResolvedValue(null);
      (Subscription.findOne as jest.Mock).mockResolvedValue(null); // No duplicate fulfillment
      (Plan.findById as jest.Mock).mockResolvedValue({ _id: "p1", name: "Pro", slug: "pro" });
      (mockStripeInstance.subscriptions.retrieve as jest.Mock).mockResolvedValue(mockStripeSub);
      (Subscription.create as jest.Mock).mockResolvedValue({ _id: "new_sub_id" });

      await paymentService.handleWebhook(payload, signature);

      expect(Subscription.create).toHaveBeenCalled();
      expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({
        amount: 20,
        status: "succeeded"
      }));
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith("u1", expect.objectContaining({
        planSlug: "pro",
        status: "active"
      }));
      expect(AuditLog.create).toHaveBeenCalled();
    });

    test("should process invoice.paid and record renewal payment", async () => {
      const mockInvoice = {
        id: "inv_123",
        subscription: "sub_123",
        amount_paid: 1500,
        currency: "egp"
      };
      const mockEvent = { id: "evt_invoice", type: "invoice.paid", data: { object: mockInvoice } };
      const mockStripeSub = { current_period_end: 3000 };
      const mockDbSub = { _id: "sub_db_123", userId: "u1" };

      (mockStripeInstance.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
      (AuditLog.findOne as jest.Mock).mockResolvedValue(null);
      (mockStripeInstance.subscriptions.retrieve as jest.Mock).mockResolvedValue(mockStripeSub);
      (Subscription.findOneAndUpdate as jest.Mock).mockResolvedValue(mockDbSub);

      await paymentService.handleWebhook(payload, signature);

      expect(Subscription.findOneAndUpdate).toHaveBeenCalled();
      expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({
        amount: 15,
        providerTxId: "inv_123"
      }));
    });

    test("should process invoice.payment_failed and update status to past_due", async () => {
      const mockInvoice = {
        id: "inv_fail",
        subscription: "sub_123",
        amount_due: 1500,
        currency: "egp"
      };
      const mockEvent = { id: "evt_fail", type: "invoice.payment_failed", data: { object: mockInvoice } };

      (mockStripeInstance.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
      (AuditLog.findOne as jest.Mock).mockResolvedValue(null);
      (Subscription.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: "sub1", userId: "u1" });

      await paymentService.handleWebhook(payload, signature);

      expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
        { stripeSubscriptionId: "sub_123" },
        { status: "past_due" }
      );
      expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({
        status: "failed"
      }));
    });

    test("should process customer.subscription.deleted and cancel local record", async () => {
      const mockStripeSub = { id: "sub_del" };
      const mockEvent = { id: "evt_del", type: "customer.subscription.deleted", data: { object: mockStripeSub } };

      (mockStripeInstance.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
      (AuditLog.findOne as jest.Mock).mockResolvedValue(null);

      await paymentService.handleWebhook(payload, signature);

      expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
        { stripeSubscriptionId: "sub_del" },
        expect.objectContaining({ status: "cancelled" })
      );
    });
  });
});
