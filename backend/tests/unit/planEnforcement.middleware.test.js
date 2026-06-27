import { describe, test, expect, jest } from "@jest/globals";
import mongoose from "mongoose";
const validUserId = new mongoose.Types.ObjectId().toString();
const mockFindOneSubscription = jest.fn();
const mockCountDocumentsContract = jest.fn();
jest.unstable_mockModule("../../src/models/subscription.model.js", () => ({
    Subscription: { findOne: mockFindOneSubscription },
}));
jest.unstable_mockModule("../../src/models/contract.model.js", () => ({
    Contract: { countDocuments: mockCountDocumentsContract },
}));
const { enforceStorageLimit } = await import("../../src/middlewares/planEnforcement.middleware.js");
// Helper: make a mock request and response
const mockReq = (userId) => ({
    user: { _id: userId },
    body: {},
    headers: {},
});
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
const mockNext = jest.fn();
// ── NOTE ──────────────────────────────────────────────────────────────────
// enforceAnalysisLimit has been removed. Analysis-count enforcement is now
// handled by credits — see creditsEnforcement.middleware.test.ts.
// ──────────────────────────────────────────────────────────────────────────
describe("enforceStorageLimit - Edge Cases", () => {
    beforeEach(() => jest.clearAllMocks());
    test("should allow upload if under storage limit", async () => {
        mockFindOneSubscription.mockReturnValue({
            populate: jest.fn().mockResolvedValue(null),
        });
        mockCountDocumentsContract.mockResolvedValue(3);
        const req = mockReq(validUserId);
        const res = mockRes();
        await enforceStorageLimit(req, res, mockNext);
        expect(mockNext).toHaveBeenCalled();
    });
    test("should block upload if storage limit reached", async () => {
        mockFindOneSubscription.mockReturnValue({
            populate: jest.fn().mockResolvedValue(null),
        });
        mockCountDocumentsContract.mockResolvedValue(10);
        const req = mockReq(validUserId);
        const res = mockRes();
        await enforceStorageLimit(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: "Storage limit reached",
        }));
        expect(mockNext).not.toHaveBeenCalled();
    });
    test("should allow unlimited storage (-1)", async () => {
        mockFindOneSubscription.mockReturnValue({
            populate: jest.fn().mockResolvedValue({
                status: "active",
                endDate: new Date(Date.now() + 100000),
                startDate: new Date(),
                planId: { analysisLimit: -1, storageLimit: -1, name: "Enterprise" },
            }),
        });
        const req = mockReq(validUserId);
        const res = mockRes();
        await enforceStorageLimit(req, res, mockNext);
        expect(mockNext).toHaveBeenCalled();
    });
    test("should call next if no userId", async () => {
        const req = { user: null, body: {}, headers: {} };
        const res = mockRes();
        await enforceStorageLimit(req, res, mockNext);
        expect(mockNext).toHaveBeenCalled();
    });
    test("should treat expired subscription as Free tier defaults", async () => {
        mockFindOneSubscription.mockReturnValue({
            populate: jest.fn().mockResolvedValue({
                status: "active",
                endDate: new Date(Date.now() - 100000), // expired
                startDate: new Date(),
                planId: { storageLimit: 100, name: "Pro" },
            }),
        });
        mockCountDocumentsContract.mockResolvedValue(3); // under free default of 10
        const req = mockReq(validUserId);
        const res = mockRes();
        await enforceStorageLimit(req, res, mockNext);
        expect(mockNext).toHaveBeenCalled();
    });
    test("should include upgradeUrl in 403 response", async () => {
        mockFindOneSubscription.mockReturnValue({
            populate: jest.fn().mockResolvedValue(null),
        });
        mockCountDocumentsContract.mockResolvedValue(10);
        const req = mockReq(validUserId);
        const res = mockRes();
        await enforceStorageLimit(req, res, mockNext);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            details: expect.objectContaining({
                upgradeUrl: expect.stringContaining("pricing"),
            }),
        }));
    });
});
//# sourceMappingURL=planEnforcement.middleware.test.js.map