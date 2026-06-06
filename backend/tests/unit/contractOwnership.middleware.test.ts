import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';

const validUserId = new mongoose.Types.ObjectId().toString();
const otherUserId = new mongoose.Types.ObjectId().toString();
const validContractId = new mongoose.Types.ObjectId().toString();

const mockFindById = jest.fn();

jest.unstable_mockModule('../../src/models/contract.model.js', () => ({
  Contract: { findById: mockFindById },
}));

const { verifyContractOwnership } = await import(
  '../../src/middlewares/contractOwnership.middleware.js'
);

const mockReq = (userId: string, contractId: string, fromParams = false) => ({
  user: { _id: userId },
  body: fromParams ? {} : { contractId },
  params: fromParams ? { contractId } : {},
  headers: {},
}) as any;

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('verifyContractOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  test('should call next if user owns the contract', async () => {
    mockFindById.mockResolvedValue({
      _id: validContractId,
      userId: validUserId,
    });

    const req = mockReq(validUserId, validContractId);
    const res = mockRes();

    await verifyContractOwnership(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  test('should return 403 if user does not own the contract', async () => {
    mockFindById.mockResolvedValue({
      _id: validContractId,
      userId: otherUserId,
    });

    const req = mockReq(validUserId, validContractId);
    const res = mockRes();

    await verifyContractOwnership(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  test('should return 404 if contract not found', async () => {
    mockFindById.mockResolvedValue(null);

    const req = mockReq(validUserId, validContractId);
    const res = mockRes();

    await verifyContractOwnership(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  test('should return 400 if contractId is missing', async () => {
    const req = {
      user: { _id: validUserId },
      body: {},
      params: {},
      headers: {},
    } as any;
    const res = mockRes();

    await verifyContractOwnership(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  test('should work with contractId from params', async () => {
    mockFindById.mockResolvedValue({
      _id: validContractId,
      userId: validUserId,
    });

    const req = mockReq(validUserId, validContractId, true);
    const res = mockRes();

    await verifyContractOwnership(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  test('should return 400 if userId is missing', async () => {
    const req = {
      user: null,
      body: { contractId: validContractId },
      params: {},
      headers: {},
    } as any;
    const res = mockRes();

    await verifyContractOwnership(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });
});