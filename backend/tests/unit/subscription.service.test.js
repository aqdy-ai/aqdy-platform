import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";
const validUserId = new mongoose.Types.ObjectId().toString();
const validPlanId = new mongoose.Types.ObjectId().toString();
const mockSave = jest.fn().mockResolvedValue(undefined);
const mockFindOne = jest.fn();
const mockFindById = jest.fn();
const mockCountDocuments = jest.fn();
jest.unstable_mockModule("../../src/models/subscription.model.js", () => ({
    Subscription: jest.fn().mockImplementation(() => ({ save: mockSave })),
}));
jest.unstable_mockModule("../../src/models/plan.model.js", () => ({
    Plan: {
        findOne: mockFindOne,
        findById: mockFindById,
    },
}));
jest.unstable_mockModule("../../src/models/riskAnalysis.model.js", () => ({
    RiskAnalysis: {
        countDocuments: mockCountDocuments,
    },
}));
const { SubscriptionService } = await import("../../src/services/subscription.service.js");
describe("SubscriptionService - createFreeSubscription", () => {
    let subscriptionService;
    beforeEach(() => {
        subscriptionService = new SubscriptionService();
        jest.clearAllMocks();
    });
    test("should throw error if free plan not found", async () => {
        mockFindOne.mockResolvedValue(null);
        await expect(subscriptionService.createFreeSubscription(validUserId)).rejects.toThrow("Free plan not found");
    });
    test("should create free subscription successfully", async () => {
        mockFindOne.mockResolvedValue({
            _id: validPlanId,
            name: "Free",
            slug: "free",
            analysisLimit: 3,
        });
        await subscriptionService.createFreeSubscription(validUserId);
        expect(mockSave).toHaveBeenCalled();
    });
});
describe("SubscriptionService - getUserSubscription", () => {
    let subscriptionService;
    beforeEach(() => {
        subscriptionService = new SubscriptionService();
        jest.clearAllMocks();
    });
    test("should return null if no active subscription", async () => {
        const { Subscription } = await import("../../src/models/subscription.model.js");
        const subscriptionMock = Subscription;
        subscriptionMock.findOne = jest
            .fn()
            .mockReturnValue({
            populate: jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(null),
            }),
        });
        const result = await subscriptionService.getUserSubscription(validUserId);
        expect(result).toBeNull();
    });
    test("should return subscription if found", async () => {
        const mockSubscription = {
            _id: new mongoose.Types.ObjectId().toString(),
            userId: validUserId,
            status: "active",
            planId: { name: "Free", analysisLimit: 3 },
        };
        const { Subscription } = await import("../../src/models/subscription.model.js");
        const subscriptionMock = Subscription;
        subscriptionMock.findOne = jest
            .fn()
            .mockReturnValue({
            populate: jest.fn().mockReturnValue({
                sort: jest
                    .fn()
                    .mockResolvedValue(mockSubscription),
            }),
        });
        const result = await subscriptionService.getUserSubscription(validUserId);
        expect(result).toEqual(mockSubscription);
    });
});
describe("SubscriptionService - getUsageStats", () => {
    let subscriptionService;
    beforeEach(() => {
        subscriptionService = new SubscriptionService();
        jest.clearAllMocks();
    });
    test("should return usage count", async () => {
        mockCountDocuments.mockResolvedValue(5);
        const result = await subscriptionService.getUsageStats(validUserId, new Date("2026-01-01"));
        expect(result).toBe(5);
    });
    test("should return 0 if no analyses", async () => {
        mockCountDocuments.mockResolvedValue(0);
        const result = await subscriptionService.getUsageStats(validUserId, new Date("2026-01-01"));
        expect(result).toBe(0);
    });
});
describe("SubscriptionService - cancelSubscription", () => {
    let subscriptionService;
    beforeEach(() => {
        subscriptionService = new SubscriptionService();
        jest.clearAllMocks();
    });
    test("should throw error if no active subscription", async () => {
        const { Subscription } = await import("../../src/models/subscription.model.js");
        const subscriptionMock = Subscription;
        subscriptionMock.findOne = jest
            .fn()
            .mockResolvedValue(null);
        await expect(subscriptionService.cancelSubscription(validUserId)).rejects.toThrow("No active subscription found.");
    });
    test("should cancel subscription, call Stripe, and set cancelledAt", async () => {
        const mockSubscription = {
            _id: new mongoose.Types.ObjectId().toString(),
            userId: validUserId,
            status: "active",
            stripeSubscriptionId: "sub_123",
            cancelledAt: undefined,
            save: mockSave,
        };
        const { Subscription } = await import("../../src/models/subscription.model.js");
        const subscriptionMock = Subscription;
        subscriptionMock.findOne = jest
            .fn()
            .mockResolvedValue(mockSubscription);
        const mockStripeUpdate = jest
            .fn()
            .mockResolvedValue({});
        jest.unstable_mockModule("../../src/services/payment.service.js", () => ({
            stripe: { subscriptions: { update: mockStripeUpdate } },
        }));
        await subscriptionService.cancelSubscription(validUserId);
        expect(mockSubscription.status).toBe("active");
        expect(mockSubscription.cancelledAt).toBeDefined();
        expect(mockSave).toHaveBeenCalled();
    });
    test("should set cancelledAt but keep status active", async () => {
        const mockSubscription = {
            _id: new mongoose.Types.ObjectId().toString(),
            status: "active",
            cancelledAt: undefined,
            save: mockSave,
        };
        const { Subscription } = await import("../../src/models/subscription.model.js");
        const subscriptionMock = Subscription;
        subscriptionMock.findOne = jest
            .fn()
            .mockResolvedValue(mockSubscription);
        const result = await subscriptionService.cancelSubscription(validUserId);
        expect(result.status).toBe("active");
        expect(result.cancelledAt).toBeDefined();
    });
});
//# sourceMappingURL=subscription.service.test.js.map