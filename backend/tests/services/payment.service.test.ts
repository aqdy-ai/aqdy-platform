import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import { IPopulatedPayment } from "../../src/services/payment.service.js";

// 1. 🛡️ Define mocks BEFORE importing any modules (Required for ESM)
jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  User: { findById: jest.fn(), findByIdAndUpdate: jest.fn() }
}));
jest.unstable_mockModule("../../src/models/plan.model.js", () => ({
  Plan: { findOne: jest.fn(), findById: jest.fn() }
}));
jest.unstable_mockModule("../../src/models/subscription.model.js", () => {
  const mockSubscription = {
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn().mockImplementation(() => {
      const chain = {
        populate: jest.fn().mockResolvedValue(null),
      };
      return chain;
    }),
  };
  return { Subscription: mockSubscription };
});
jest.unstable_mockModule("../../src/models/payment.model.js", () => {
  const mockPayment = {
    create: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn().mockImplementation(() => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      return chain;
    }),
    findOne: jest.fn().mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(null),
    })),
  };
  return { default: mockPayment };
});
jest.unstable_mockModule("../../src/models/auditLog.model.js", () => ({
  AuditLog: { findOne: jest.fn(), create: jest.fn() }
}));
jest.unstable_mockModule("../../src/services/credits.service.js", () => ({
  creditsService: { getBalance: jest.fn(), topup: jest.fn(), topupForPlanAllowance: jest.fn() }
}));

// 2. 📦 Dynamically import models and service AFTER mocks are established
const { User } = await import("../../src/models/user.model.js");
const { Plan } = await import("../../src/models/plan.model.js");
const { Subscription } = await import("../../src/models/subscription.model.js");
const { default: Payment } = await import("../../src/models/payment.model.js");
const { AuditLog } = await import("../../src/models/auditLog.model.js");
const { creditsService } = await import("../../src/services/credits.service.js");
const { paymentService, stripe } = await import("../../src/services/payment.service.js");

// ✅ Fixes 'never' assignments, type arguments and ESLint 'any' rule cleanly
type GenericMock = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;

describe("PaymentService Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("verifyConnection", () => {
    it("should return true when Stripe connection is successful", async () => {
      const mockProducts = { data: [{}, {}] };
      jest.spyOn(stripe.products, "list").mockResolvedValue(mockProducts as never);
      const result = await paymentService.verifyConnection();
      expect(result).toBe(true);
    });

    it("should return false and log error when Stripe connection fails", async () => {
      jest.spyOn(stripe.products, "list").mockRejectedValue(new Error("Connection failed") as never);
      const result = await paymentService.verifyConnection();
      expect(result).toBe(false);
    });
  });

  describe("createCheckoutSession", () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const planSlug = "premium";

    it("should throw 404 error if user is not found", async () => {
      (User.findById as unknown as GenericMock).mockResolvedValue(null);
      await expect(paymentService.createCheckoutSession(userId, planSlug)).rejects.toMatchObject({ statusCode: 404 });
    });

    it("should throw 400 error if plan is inactive or does not exist", async () => {
      (User.findById as unknown as GenericMock).mockResolvedValue({ _id: userId });
      (Plan.findOne as unknown as GenericMock).mockResolvedValue(null);
      await expect(paymentService.createCheckoutSession(userId, planSlug)).rejects.toMatchObject({ statusCode: 400 });
    });

    it("should create a Stripe customer if one does not exist for the user", async () => {
      const mockUser = { _id: userId, email: "test@aqdy.com", name: "Tester" };
      const mockPlan = { _id: "p1", slug: "premium", isActive: true, stripePriceId: "price_123" };

      (User.findById as unknown as GenericMock).mockResolvedValue(mockUser);
      (Plan.findOne as unknown as GenericMock).mockResolvedValue(mockPlan);
      (User.findByIdAndUpdate as unknown as GenericMock).mockResolvedValue({});

      jest.spyOn(stripe.customers, "create").mockResolvedValue({ id: "cus_new" } as never);
      jest.spyOn(stripe.checkout.sessions, "create").mockResolvedValue({ url: "https://stripe.com/session" } as never);

      await paymentService.createCheckoutSession(userId, planSlug);

      expect(stripe.customers.create).toHaveBeenCalled();
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(userId, { stripeCustomerId: "cus_new" });
    });

    it("should return checkout URL when session creation succeeds", async () => {
      const mockUser = { _id: userId, stripeCustomerId: "cus_old" };
      const mockPlan = { _id: "p1", slug: "premium", isActive: true, stripePriceId: "price_123" };

      (User.findById as unknown as GenericMock).mockResolvedValue(mockUser);
      (Plan.findOne as unknown as GenericMock).mockResolvedValue(mockPlan);
      jest.spyOn(stripe.checkout.sessions, "create").mockResolvedValue({ url: "https://stripe.com/session" } as never);

      const result = await paymentService.createCheckoutSession(userId, planSlug);
      expect(result.url).toBe("https://stripe.com/session");
    });
  });

  describe("confirmSession", () => {
    it("should fulfill subscription and return balance for paid status", async () => {
      const sessionId = "cs_123";
      const userId = "507f1f77bcf86cd799439011";
      const mockSession = {
        payment_status: "paid",
        metadata: { userId, planId: "507f1f77bcf86cd799439012" },
        subscription: "sub_stripe_1",
        amount_total: 2900,
        currency: "usd",
        id: "sess_1"
      };

      jest.spyOn(stripe.checkout.sessions, "retrieve").mockResolvedValue(mockSession as never);
      (Subscription.findOne as unknown as GenericMock).mockResolvedValue(null);
      (Plan.findById as unknown as GenericMock).mockResolvedValue({ _id: "p123", name: "Pro", creditAllowance: 10, slug: "pro" });

      const mockSubDetails = {
        id: "sub_stripe_1",
        current_period_start: 1000,
        current_period_end: 2000
      };
      jest.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(mockSubDetails as never);
      (Subscription.create as unknown as GenericMock).mockResolvedValue({ _id: "sub_local_1" });
      (creditsService.getBalance as unknown as GenericMock).mockResolvedValue(100);
      (Payment.create as unknown as GenericMock).mockResolvedValue({});
      (User.findByIdAndUpdate as unknown as GenericMock).mockResolvedValue({});

      const result = await paymentService.confirmSession(sessionId);
      expect(result.status).toBe("succeeded");
      if ("creditBalance" in result) {
        expect(result.creditBalance).toBe(100);
      }
      expect(Subscription.create).toHaveBeenCalled();
      expect(Payment.create).toHaveBeenCalled();
    });

    it("should return pending status if payment is not paid", async () => {
      jest.spyOn(stripe.checkout.sessions, "retrieve").mockResolvedValue({ payment_status: "unpaid" } as never);
      const result = await paymentService.confirmSession("cs_123");
      expect(result.status).toBe("pending");
    });
  });

  describe("handleWebhook", () => {
    it("should skip already processed events to ensure idempotency", async () => {
      const event = { id: "evt_1" };
      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue(event as never);
      (AuditLog.findOne as unknown as GenericMock).mockResolvedValue({ id: "log_1" });

      await paymentService.handleWebhook(Buffer.from(""), "sig");
      expect(AuditLog.findOne).toHaveBeenCalled();
      expect(AuditLog.create).not.toHaveBeenCalled();
    });

    it("should handle customer.subscription.deleted event and downgrade user", async () => {
      const event = {
        id: "evt_del",
        type: "customer.subscription.deleted",
        data: { object: { id: "sub_stripe_1" } }
      };

      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue(event as never);
      (AuditLog.findOne as unknown as GenericMock).mockResolvedValue(null);
      (Subscription.findOneAndUpdate as unknown as GenericMock).mockResolvedValue({ userId: "user_1" });
      (Plan.findOne as unknown as GenericMock).mockResolvedValue({ slug: "free", creditAllowance: 10 });
      (User.findByIdAndUpdate as unknown as GenericMock).mockResolvedValue({});
      (AuditLog.create as unknown as GenericMock).mockResolvedValue({});

      await paymentService.handleWebhook(Buffer.from(""), "sig");
      expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
        { stripeSubscriptionId: "sub_stripe_1" },
        expect.objectContaining({ status: "cancelled", cancelledAt: expect.any(Date) }),
        { new: true }
      );
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user_1", { plan: "free", planSlug: "free" });
      expect(creditsService.topup).toHaveBeenCalledWith("user_1", 10, "plan_topup");
    });

    it("should throw 400 if signature verification fails", async () => {
      jest.spyOn(stripe.webhooks, "constructEvent").mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await expect(paymentService.handleWebhook(Buffer.from(""), "invalid")).rejects.toMatchObject({
        statusCode: 400,
        message: "Webhook signature verification failed"
      });
    });

    it("should handle checkout.session.completed and topup credits", async () => {
      const event = {
        id: "evt_checkout",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            subscription: "sub_stripe_1",
            customer: "cus_123",
            amount_total: 2900,
            currency: "usd",
            metadata: {
              userId: "507f1f77bcf86cd799439011",
              planId: "507f1f77bcf86cd799439012",
            },
          },
        },
      };

      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue(event as never);

      (AuditLog.findOne as unknown as GenericMock).mockResolvedValue(null);
      (Subscription.findOne as unknown as GenericMock).mockResolvedValue(null);
      (Plan.findById as unknown as GenericMock).mockResolvedValue({
        _id: "plan_1",
        slug: "pro",
        name: "Pro",
        creditAllowance: 100,
      });

      const mockSubDetails = {
        current_period_start: 1000,
        current_period_end: 2000,
      };
      jest.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(mockSubDetails as never);

      (Subscription.create as unknown as GenericMock).mockResolvedValue({ _id: "sub_local" });
      (User.findByIdAndUpdate as unknown as GenericMock).mockResolvedValue({});
      (Payment.create as unknown as GenericMock).mockResolvedValue({});
      (AuditLog.create as unknown as GenericMock).mockResolvedValue({});

      await paymentService.handleWebhook(Buffer.from(""), "sig");

      expect(creditsService.topup).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        100,
        "plan_topup",
      );
      expect(Payment.create).toHaveBeenCalled();
    });

    it("should handle invoice.paid and renew subscription", async () => {
      const event = {
        id: "evt_paid",
        type: "invoice.paid",
        data: {
          object: {
            id: "inv_123",
            subscription: "sub_stripe_1",
            amount_paid: 2900,
            currency: "usd",
          },
        },
      };

      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue(event as never);

      (AuditLog.findOne as unknown as GenericMock).mockResolvedValue(null);

      const mockSubDetails = {
        current_period_end: 3000,
      };
      jest.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(mockSubDetails as never);

      (Subscription.findOneAndUpdate as unknown as GenericMock).mockResolvedValue({
        _id: "sub_local",
        userId: "user_1",
        planId: "plan_1",
      });

      (Plan.findById as unknown as GenericMock).mockResolvedValue({ creditAllowance: 50 });
      (Payment.create as unknown as GenericMock).mockResolvedValue({});
      (AuditLog.create as unknown as GenericMock).mockResolvedValue({});

      await paymentService.handleWebhook(Buffer.from(""), "sig");

      expect(creditsService.topup).toHaveBeenCalledWith("user_1", 50, "plan_topup");
      expect(Payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "succeeded",
          providerTxId: "inv_123",
        }),
      );
    });

    it("should handle invoice.payment_failed", async () => {
      const event = {
        id: "evt_failed",
        type: "invoice.payment_failed",
        data: {
          object: {
            id: "inv_failed",
            subscription: "sub_stripe_1",
            amount_due: 2900,
            currency: "usd",
          },
        },
      };

      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue(event as never);

      (AuditLog.findOne as unknown as GenericMock).mockResolvedValue(null);
      (Subscription.findOneAndUpdate as unknown as GenericMock).mockResolvedValue({
        _id: "sub_local",
        userId: "user_1",
      });
      (User.findByIdAndUpdate as unknown as GenericMock).mockResolvedValue({});
      (Payment.create as unknown as GenericMock).mockResolvedValue({});
      (AuditLog.create as unknown as GenericMock).mockResolvedValue({});

      await paymentService.handleWebhook(Buffer.from(""), "sig");

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user_1", { status: "suspended" });
      expect(Payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          providerTxId: "inv_failed",
        }),
      );
    });
  });

  describe("getUserPayments", () => {
    it("should return paginated payments for a user", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const mockPaymentsData = [{
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(userId),
        subscriptionId: {
          _id: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(),
          planId: {
            _id: new mongoose.Types.ObjectId(),
            name: "Pro Plan",
            slug: "pro",
            isActive: true,
            price: 29,
            billingCycle: "monthly",
            features: [],
            credits: 100,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        amount: 10,
        status: "succeeded" as const,
        currency: "usd",
        createdAt: new Date(),
        provider: "stripe",
        providerTxId: "tx_1",
        description: "Test Payment",
        updatedAt: new Date()
      }];
      const mockTotal = 1;

      (Payment.find as unknown as GenericMock).mockImplementationOnce(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockPaymentsData),
      }));
      (Payment.countDocuments as unknown as GenericMock).mockResolvedValue(mockTotal);

      const result = await paymentService.getUserPayments(userId);
      expect(result.payments).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("getPaymentById", () => {
    it("should return a single payment if owned by user", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const mockPayment = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(userId),
        status: "succeeded" as const,
        currency: "usd",
        createdAt: new Date(),
        subscriptionId: {
          _id: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(),
          planId: {
            _id: new mongoose.Types.ObjectId(),
            name: "Pro Plan",
            slug: "pro",
            isActive: true,
            price: 29,
            billingCycle: "monthly",
            features: [],
            credits: 100,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        amount: 100,
        provider: "stripe",
        providerTxId: "tx_1",
        description: "Test Payment",
        updatedAt: new Date()
      };

      (Payment.findOne as unknown as GenericMock).mockImplementationOnce(() => ({
        populate: jest.fn().mockResolvedValue(mockPayment),
      }));

      const result = await paymentService.getPaymentById(mockPayment._id.toString(), userId);
      expect(result).toEqual(mockPayment);
    });

    it("should throw 404 if payment not found or not owned by user", async () => {
      (Payment.findOne as unknown as GenericMock).mockImplementationOnce(() => ({
        populate: jest.fn().mockResolvedValue(null),
      }));

      await expect(paymentService.getPaymentById("pay_1", "user_1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("generateInvoicePdf", () => {
    it("should generate a PDF buffer", async () => {
      const userId = "user_1";
      const mockPayment = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId().toString(),
        subscriptionId: {
          _id: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(),
          planId: {
            _id: new mongoose.Types.ObjectId(),
            name: "Pro Plan",
            slug: "pro",
            isActive: true,
            price: 29,
            billingCycle: "monthly",
            features: [],
            credits: 100,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        amount: 29,
        currency: "usd",
        createdAt: new Date(),
        status: "succeeded" as const,
        provider: "stripe",
        providerTxId: "tx_123",
        description: "Test Payment",
        updatedAt: new Date(),
      };

      jest.spyOn(paymentService, "getPaymentById").mockResolvedValue(mockPayment as unknown as IPopulatedPayment);

      const buffer = await paymentService.generateInvoicePdf("pay_1", userId);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});