import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import { IPopulatedPayment } from "../../src/services/payment.service.js"; // Import IPopulatedPayment
import { IPlan } from "../../src/models/plan.model.js"; // Import IPlan
import { ISubscription } from "../../src/models/subscription.model.js"; // Import ISubscription
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
  };
  (mockSubscription as any).findOne = jest.fn().mockImplementation(() => {
    const chain = {
      populate: jest.fn().mockResolvedValue(null),
    };
    return chain;
  });
  return { Subscription: mockSubscription };
});
jest.unstable_mockModule("../../src/models/payment.model.js", () => {
  const mockPayment = {
    create: jest.fn(),
    countDocuments: jest.fn(),
  };

  // Mock Payment.find to return a chainable object
  (mockPayment as any).find = jest.fn().mockImplementation(() => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue([]), // Default resolved value
    };
    return chain;
  });
  (mockPayment as any).findOne = jest.fn().mockImplementation(() => ({
    populate: jest.fn().mockResolvedValue(null), // Default resolved value
  }));
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

describe("PaymentService Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("verifyConnection", () => {
    it("should return true when Stripe connection is successful", async () => {
      jest.spyOn(stripe.products, "list").mockResolvedValue({ data: [{}, {}] } as any);
      const result = await paymentService.verifyConnection();
      expect(result).toBe(true);
    });

    it("should return false and log error when Stripe connection fails", async () => {
      jest.spyOn(stripe.products, "list").mockRejectedValue(new Error("Connection failed"));
      const result = await paymentService.verifyConnection();
      expect(result).toBe(false);
    });
  });

  describe("createCheckoutSession", () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const planSlug = "premium";

    it("should throw 404 error if user is not found", async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);
      await expect(paymentService.createCheckoutSession(userId, planSlug)).rejects.toMatchObject({ statusCode: 404 });
    });

    it("should throw 400 error if plan is inactive or does not exist", async () => {
      (User.findById as jest.Mock).mockResolvedValue({ _id: userId });
      (Plan.findOne as jest.Mock).mockResolvedValue(null);
      await expect(paymentService.createCheckoutSession(userId, planSlug)).rejects.toMatchObject({ statusCode: 400 });
    });

    it("should create a Stripe customer if one does not exist for the user", async () => {
      const mockUser = { _id: userId, email: "test@aqdy.com", name: "Tester" };
      const mockPlan = { _id: "p1", slug: "premium", isActive: true, stripePriceId: "price_123" };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Plan.findOne as jest.Mock).mockResolvedValue(mockPlan);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      jest.spyOn(stripe.customers, "create").mockResolvedValue({ id: "cus_new" } as any);
      jest.spyOn(stripe.checkout.sessions, "create").mockResolvedValue({ url: "https://stripe.com/session" } as any);

      await paymentService.createCheckoutSession(userId, planSlug);

      expect(stripe.customers.create).toHaveBeenCalled();
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(userId, { stripeCustomerId: "cus_new" });
    });

    it("should return checkout URL when session creation succeeds", async () => {
      const mockUser = { _id: userId, stripeCustomerId: "cus_old" };
      const mockPlan = { _id: "p1", slug: "premium", isActive: true, stripePriceId: "price_123" };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Plan.findOne as jest.Mock).mockResolvedValue(mockPlan);
      jest.spyOn(stripe.checkout.sessions, "create").mockResolvedValue({ url: "https://stripe.com/session" } as any);

      const result = await paymentService.createCheckoutSession(userId, planSlug);
      expect(result.url).toBe("https://stripe.com/session");
    });
  });

  describe("confirmSession", () => {
    it("should fulfill subscription and return balance for paid status", async () => {
      const sessionId = "cs_123";
      const userId = "507f1f77bcf86cd799439011"; // Valid MongoDB hex string
      const mockSession = { 
        payment_status: "paid", 
        metadata: { userId, planId: "507f1f77bcf86cd799439012" },
        subscription: "sub_stripe_1",
        amount_total: 2900,
        currency: "usd",
        id: "sess_1"
      };

      jest.spyOn(stripe.checkout.sessions, "retrieve").mockResolvedValue(mockSession as any);
      (Subscription.findOne as jest.Mock).mockResolvedValue(null); // Idempotency: not processed yet
      (Plan.findById as jest.Mock).mockResolvedValue({ _id: "p123", name: "Pro", creditAllowance: 10, slug: "pro" });
      jest.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue({
        id: "sub_stripe_1",
        current_period_start: 1000,
        current_period_end: 2000
      } as any);
      (Subscription.create as jest.Mock).mockResolvedValue({ _id: "sub_local_1" });
      (creditsService.getBalance as jest.Mock).mockResolvedValue(100);
      (Payment.create as jest.Mock).mockResolvedValue({});
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      const result = await paymentService.confirmSession(sessionId);
      expect(result.status).toBe("succeeded");
      expect(result.creditBalance).toBe(100);
      expect(Subscription.create).toHaveBeenCalled();
      expect(Payment.create).toHaveBeenCalled();
    });

    it("should return pending status if payment is not paid", async () => {
      jest.spyOn(stripe.checkout.sessions, "retrieve").mockResolvedValue({ payment_status: "unpaid" } as any);
      const result = await paymentService.confirmSession("cs_123");
      expect(result.status).toBe("pending");
    });
  });

  describe("handleWebhook", () => {
    it("should skip already processed events to ensure idempotency", async () => {
      const event = { id: "evt_1" };
      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue(event as any);
      (AuditLog.findOne as jest.Mock).mockResolvedValue({ id: "log_1" });

      await paymentService.handleWebhook(Buffer.from(""), "sig");
      expect(AuditLog.findOne).toHaveBeenCalled();
      expect(AuditLog.create).not.toHaveBeenCalled();
    });

    it("should handle customer.subscription.deleted event", async () => {
      const event = {
        id: "evt_del",
        type: "customer.subscription.deleted",
        data: { object: { id: "sub_stripe_1" } }
      };

      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue(event as any);
      (AuditLog.findOne as jest.Mock).mockResolvedValue(null);
      (Subscription.findOneAndUpdate as jest.Mock).mockResolvedValue({});
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      await paymentService.handleWebhook(Buffer.from(""), "sig");
      expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
        { stripeSubscriptionId: "sub_stripe_1" },
        expect.objectContaining({ status: "cancelled" }),
        { new: true }
      );
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

      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue(event as any);

      (AuditLog.findOne as jest.Mock).mockResolvedValue(null);

      (Subscription.findOne as jest.Mock).mockResolvedValue(null);

      (Plan.findById as jest.Mock).mockResolvedValue({
        _id: "plan_1",
        slug: "pro",
        name: "Pro",
        creditAllowance: 100,
      });

      jest.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue({
        current_period_start: 1000,
        current_period_end: 2000,
      } as any);

      (Subscription.create as jest.Mock).mockResolvedValue({
        _id: "sub_local",
      });

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (Payment.create as jest.Mock).mockResolvedValue({});
      (AuditLog.create as jest.Mock).mockResolvedValue({});

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

      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue(event as any);

      (AuditLog.findOne as jest.Mock).mockResolvedValue(null);

      jest.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue({
        current_period_end: 3000,
      } as any);

      (Subscription.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: "sub_local",
        userId: "user_1",
        planId: "plan_1",
      });

      (Plan.findById as jest.Mock).mockResolvedValue({
        creditAllowance: 50,
      });

      (Payment.create as jest.Mock).mockResolvedValue({});
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      await paymentService.handleWebhook(Buffer.from(""), "sig");

      expect(creditsService.topup).toHaveBeenCalledWith(
        "user_1",
        50,
        "plan_topup",
      );

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

      jest.spyOn(stripe.webhooks, "constructEvent").mockReturnValue(event as any);

      (AuditLog.findOne as jest.Mock).mockResolvedValue(null);

      (Subscription.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: "sub_local",
        userId: "user_1",
      });

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      (Payment.create as jest.Mock).mockResolvedValue({});
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      await paymentService.handleWebhook(Buffer.from(""), "sig");

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "user_1",
        { status: "suspended" },
      );

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
      const mockPaymentsData: IPopulatedPayment[] = [{
        _id: new mongoose.Types.ObjectId(), // Corrected to ObjectId
        userId,
        subscriptionId: { _id: new mongoose.Types.ObjectId(), userId: new mongoose.Types.ObjectId(), planId: { _id: new mongoose.Types.ObjectId(), name: "Pro Plan", slug: "pro", isActive: true }, status: "active", startDate: new Date(), endDate: new Date(), renewalDate: new Date(), stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test" },
        amount: 10, status: "succeeded", currency: "usd", createdAt: new Date(), provider: "stripe", providerTxId: "tx_1", description: "Test Payment"
      }];
      const mockTotal = 1;

      // Get the mock chainable object returned by Payment.find
      const mockFindChain = (Payment.find as jest.Mock)();
      mockFindChain.populate.mockResolvedValue(mockPaymentsData); // Mock populate on this specific chain
      (Payment.countDocuments as jest.Mock).mockResolvedValue(mockTotal);

      // Ensure the mock is reset for this test
      (Payment.find as jest.Mock).mockImplementationOnce(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockPaymentsData),
      }));
      const result = await paymentService.getUserPayments(userId);
      expect(result.payments).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("getPaymentById", () => {
    it("should return a single payment if owned by user", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const mockPayment: IPopulatedPayment = {
        _id: new mongoose.Types.ObjectId(), userId: new mongoose.Types.ObjectId(userId), status: "succeeded", currency: "usd", createdAt: new Date(), // Corrected userId to ObjectId
        subscriptionId: { _id: new mongoose.Types.ObjectId(), userId: new mongoose.Types.ObjectId(), planId: { _id: new mongoose.Types.ObjectId(), name: "Pro Plan", slug: "pro", isActive: true }, status: "active", startDate: new Date(), endDate: new Date(), renewalDate: new Date(), stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test" },
        amount: 100, provider: "stripe", providerTxId: "tx_1", description: "Test Payment", updatedAt: new Date()
      };

      // Get the mock chainable object returned by Payment.findOne
      const mockFindOneChain = (Payment.findOne as jest.Mock)();
      mockFindOneChain.populate.mockResolvedValue(mockPayment); // Mock populate on this specific chain

      // Ensure the mock is reset for this test
      (Payment.findOne as jest.Mock).mockImplementationOnce(() => ({
        populate: jest.fn().mockResolvedValue(mockPayment),
      }));

      const result = await paymentService.getPaymentById(mockPayment._id.toString(), userId);
      expect(result).toEqual(mockPayment);
    });

    it("should throw 404 if payment not found or not owned by user", async () => {
      (Payment.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      // Ensure the mock is reset for this test
      (Payment.findOne as jest.Mock).mockImplementationOnce(() => ({
        populate: jest.fn().mockResolvedValue(null), // Mock populate on this specific chain
      }));

      await expect(paymentService.getPaymentById("pay_1", "user_1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("generateInvoicePdf", () => {
    it("should generate a PDF buffer", async () => {
      const userId = "user_1";
      const mockPayment: IPopulatedPayment = {
        _id: new mongoose.Types.ObjectId(), // Corrected to ObjectId
        userId,
        subscriptionId: {
          _id: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(),
          planId: { _id: new mongoose.Types.ObjectId(), name: "Pro Plan", slug: "pro", isActive: true }, // Mock IPlan properties
          status: "active", startDate: new Date(), endDate: new Date(), renewalDate: new Date(), stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test",
        },
        amount: 29, currency: "usd", createdAt: new Date(), status: "succeeded",
        provider: "stripe", providerTxId: "tx_123", description: "Test Payment", updatedAt: new Date(),
      };

      jest.spyOn(paymentService, "getPaymentById").mockResolvedValue(mockPayment);

      const buffer = await paymentService.generateInvoicePdf("pay_1", userId);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});