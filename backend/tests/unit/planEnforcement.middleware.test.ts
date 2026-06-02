import { describe, test, expect, jest } from '@jest/globals';
import mongoose from 'mongoose';

const validUserId = new mongoose.Types.ObjectId().toString();

const mockFindOneSubscription = jest.fn();
const mockCountDocumentsAnalysis = jest.fn();
const mockCountDocumentsContract = jest.fn();

jest.unstable_mockModule('../../src/models/subscription.model.js', () => ({
  Subscription: { findOne: mockFindOneSubscription },
}));

jest.unstable_mockModule('../../src/models/riskAnalysis.model.js', () => ({
  RiskAnalysis: { countDocuments: mockCountDocumentsAnalysis },
}));

jest.unstable_mockModule('../../src/models/contract.model.js', () => ({
  Contract: { countDocuments: mockCountDocumentsContract },
}));

const { enforceAnalysisLimit, enforceStorageLimit } = await import(
  '../../src/middlewares/planEnforcement.middleware.js'
);

// Helper: عمل mock request و response
const mockReq = (userId: string) => ({
  user: { _id: userId },
  body: {},
  headers: {},
}) as any;

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('enforceAnalysisLimit - Edge Cases', () => {
  beforeEach(() => jest.clearAllMocks());

  test('should allow request if no subscription (Free tier defaults)', async () => {
    mockFindOneSubscription.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    mockCountDocumentsAnalysis.mockResolvedValue(0);

    const req = mockReq(validUserId);
    const res = mockRes();

    await enforceAnalysisLimit(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  test('should block if analysesUsed >= analysisLimit', async () => {
    mockFindOneSubscription.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    mockCountDocumentsAnalysis.mockResolvedValue(5);

    const req = mockReq(validUserId);
    const res = mockRes();

    await enforceAnalysisLimit(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Analysis limit reached',
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should block immediately if analysisLimit = 0', async () => {
    mockFindOneSubscription.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        status: 'active',
        endDate: new Date(Date.now() + 100000),
        startDate: new Date(),
        planId: { analysisLimit: 0, storageLimit: 0, name: 'Free' },
      }),
    });

    const req = mockReq(validUserId);
    const res = mockRes();

    await enforceAnalysisLimit(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should allow unlimited plan (-1)', async () => {
    mockFindOneSubscription.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        status: 'active',
        endDate: new Date(Date.now() + 100000),
        startDate: new Date(),
        planId: { analysisLimit: -1, storageLimit: -1, name: 'Enterprise' },
      }),
    });

    const req = mockReq(validUserId);
    const res = mockRes();

    await enforceAnalysisLimit(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  test('should treat expired subscription as Free tier', async () => {
    mockFindOneSubscription.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        status: 'active',
        endDate: new Date(Date.now() - 100000), // expired
        startDate: new Date(),
        planId: { analysisLimit: 100, storageLimit: 100, name: 'Pro' },
      }),
    });
    mockCountDocumentsAnalysis.mockResolvedValue(0);

    const req = mockReq(validUserId);
    const res = mockRes();

    await enforceAnalysisLimit(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  test('should include upgradeUrl in 403 response', async () => {
    mockFindOneSubscription.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    mockCountDocumentsAnalysis.mockResolvedValue(5);

    const req = mockReq(validUserId);
    const res = mockRes();

    await enforceAnalysisLimit(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          upgradeUrl: expect.stringContaining('pricing'),
        }),
      }),
    );
  });

  test('should call next if no userId', async () => {
    const req = { user: null, body: {}, headers: {} } as any;
    const res = mockRes();

    await enforceAnalysisLimit(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('enforceStorageLimit - Edge Cases', () => {
  beforeEach(() => jest.clearAllMocks());

  test('should allow upload if under storage limit', async () => {
    mockFindOneSubscription.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    mockCountDocumentsContract.mockResolvedValue(3);

    const req = mockReq(validUserId);
    const res = mockRes();

    await enforceStorageLimit(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  test('should block upload if storage limit reached', async () => {
    mockFindOneSubscription.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    mockCountDocumentsContract.mockResolvedValue(10);

    const req = mockReq(validUserId);
    const res = mockRes();

    await enforceStorageLimit(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Storage limit reached',
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should allow unlimited storage (-1)', async () => {
    mockFindOneSubscription.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        status: 'active',
        endDate: new Date(Date.now() + 100000),
        startDate: new Date(),
        planId: { analysisLimit: -1, storageLimit: -1, name: 'Enterprise' },
      }),
    });

    const req = mockReq(validUserId);
    const res = mockRes();

    await enforceStorageLimit(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  test('should call next if no userId', async () => {
    const req = { user: null, body: {}, headers: {} } as any;
    const res = mockRes();

    await enforceStorageLimit(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});