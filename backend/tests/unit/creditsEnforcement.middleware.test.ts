import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import mongoose from "mongoose";

// ── Test fixtures ──────────────────────────────────────────────────────────
const validUserId = new mongoose.Types.ObjectId().toString();
const validContractId = new mongoose.Types.ObjectId().toString();

// ── Mock: creditsService ───────────────────────────────────────────────────
const mockGetBalance = jest.fn<() => Promise<number>>();
const mockCalculateAnalysisCost =
  jest.fn<(inputTokens: number, outputTokens: number) => number>();
const mockDeduct = jest.fn<() => Promise<unknown>>();

jest.unstable_mockModule("../../src/services/credits.service.js", () => ({
  creditsService: {
    getBalance: mockGetBalance,
    calculateAnalysisCost: mockCalculateAnalysisCost,
    deduct: mockDeduct,
  },
  InsufficientCreditsError: class InsufficientCreditsError extends Error {
    statusCode = 402;
    constructor(msg = "Insufficient credits available.") {
      super(msg);
    }
  },
}));

// ── Mock: contractService ──────────────────────────────────────────────────
const mockGetContractById = jest.fn<() => Promise<{ text: string } | null>>();

jest.unstable_mockModule("../../src/services/contract.service.js", () => ({
  contractService: {
    getContractById: mockGetContractById,
  },
}));

// ── Mock: logger (suppress output during tests) ───────────────────────────
jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ── Import SUT after mocks are set up ─────────────────────────────────────
const { enforceCreditsBeforeAnalysis } =
  await import("../../src/middlewares/creditsEnforcement.middleware.js");

// ── Helpers ────────────────────────────────────────────────────────────────
const mockReq = (
  userId: string | null,
  contractId?: string,
  extras: Record<string, unknown> = {},
) =>
  ({
    user: userId ? { _id: userId } : undefined,
    body: { contractId: contractId ?? validContractId },
    headers: {},
    ...extras,
  }) as any;

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// ── Tests ──────────────────────────────────────────────────────────────────

describe("enforceCreditsBeforeAnalysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: contract text of 2000 chars → ~500 tokens
    mockGetContractById.mockResolvedValue({ text: "x".repeat(2000) });
    // Default estimated cost: 5 credits
    mockCalculateAnalysisCost.mockReturnValue(5);
  });

  // ── Test 1: Sufficient balance passes ─────────────────────────────────

  test("should call next() when user has sufficient balance", async () => {
    mockGetBalance.mockResolvedValue(100); // plenty of credits

    const req = mockReq(validUserId, validContractId);
    const res = mockRes();

    await enforceCreditsBeforeAnalysis(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("should attach estimatedCreditCost and estimatedTokens to req", async () => {
    mockGetBalance.mockResolvedValue(100);
    mockCalculateAnalysisCost.mockReturnValue(7.5);

    const req = mockReq(validUserId, validContractId);
    const res = mockRes();

    await enforceCreditsBeforeAnalysis(req, res, mockNext);

    expect(req.estimatedCreditCost).toBe(7.5);
    expect(typeof req.estimatedTokens).toBe("number");
    expect(req.estimatedTokens).toBeGreaterThan(0);
  });

  // ── Test 2: Insufficient balance returns 402 ──────────────────────────

  test("should return HTTP 402 when user has insufficient credits", async () => {
    mockGetBalance.mockResolvedValue(2); // balance < estimatedCost (5)

    const req = mockReq(validUserId, validContractId);
    const res = mockRes();

    await enforceCreditsBeforeAnalysis(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Insufficient credits",
        details: expect.objectContaining({
          currentBalance: 2,
          requiredCredits: 5,
        }),
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("402 response body should contain a human-readable message", async () => {
    mockGetBalance.mockResolvedValue(1);
    mockCalculateAnalysisCost.mockReturnValue(10);

    const req = mockReq(validUserId, validContractId);
    const res = mockRes();

    await enforceCreditsBeforeAnalysis(req, res, mockNext);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.details.message).toMatch(/credit/i);
  });

  // ── Test 3: Exact balance edge case passes ────────────────────────────

  test("should call next() when balance exactly equals estimated cost", async () => {
    const exactCost = 5;
    mockCalculateAnalysisCost.mockReturnValue(exactCost);
    mockGetBalance.mockResolvedValue(exactCost); // balance == requiredCredits

    const req = mockReq(validUserId, validContractId);
    const res = mockRes();

    await enforceCreditsBeforeAnalysis(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Test 4: No userId passes through ─────────────────────────────────

  test("should call next() without balance check when user is not set", async () => {
    const req = mockReq(null); // no authenticated user
    const res = mockRes();

    await enforceCreditsBeforeAnalysis(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockGetBalance).not.toHaveBeenCalled();
    expect(mockCalculateAnalysisCost).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Test 5: Falls back to default token estimate if contract not found ─

  test("should use default token estimate and still enforce when contract lookup fails", async () => {
    mockGetContractById.mockResolvedValue(null); // contract not found
    mockGetBalance.mockResolvedValue(0); // zero balance → should block
    mockCalculateAnalysisCost.mockReturnValue(3);

    const req = mockReq(validUserId, validContractId);
    const res = mockRes();

    await enforceCreditsBeforeAnalysis(req, res, mockNext);

    // Should still attempt cost check using default estimate
    expect(mockCalculateAnalysisCost).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(402);
  });

  // ── Test 6: Fails open on unexpected service error ────────────────────

  test("should call next() (fail-open) when creditsService throws unexpectedly", async () => {
    mockGetBalance.mockRejectedValue(new Error("DB connection lost"));

    const req = mockReq(validUserId, validContractId);
    const res = mockRes();

    await enforceCreditsBeforeAnalysis(req, res, mockNext);

    // Fail-open: do not block the request
    expect(mockNext).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });
});
