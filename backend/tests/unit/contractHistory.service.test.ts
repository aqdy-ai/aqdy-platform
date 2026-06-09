import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';

const validUserId = new mongoose.Types.ObjectId().toString();
const validContractId = new mongoose.Types.ObjectId().toString();
const validAnalysisId = new mongoose.Types.ObjectId().toString();

const mockContractFind = jest.fn();
const mockContractFindOne = jest.fn();
const mockContractFindOneAndUpdate = jest.fn();
const mockContractCountDocuments = jest.fn();
const mockAnalysisFind = jest.fn();
const mockAnalysisFindOne = jest.fn();

jest.unstable_mockModule('../../src/models/contract.model.js', () => ({
    Contract: {
        find: mockContractFind,
        findOne: mockContractFindOne,
        findOneAndUpdate: mockContractFindOneAndUpdate,
        countDocuments: mockContractCountDocuments,
    },
}));

jest.unstable_mockModule('../../src/models/riskAnalysis.model.js', () => ({
    RiskAnalysis: {
        find: mockAnalysisFind,
        findOne: mockAnalysisFindOne,
    },
}));

const { ContractHistoryService } = await import('../../src/services/contractHistory.service.js');

// ── Helper: mock chain for Contract.find().sort().skip().limit().lean() ──
const mockContractFindChain = (contracts: any[]) => {
    mockContractFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(contracts),
                }),
            }),
        }),
    });
};

// ── Helper: mock chain for RiskAnalysis.find().sort().lean() ──
const mockAnalysisFindChain = (analyses: any[]) => {
    mockAnalysisFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(analyses),
        }),
    });
};

describe('ContractHistoryService - getContractList', () => {
    let service: InstanceType<typeof ContractHistoryService>;

    beforeEach(() => {
        service = new ContractHistoryService();
        jest.clearAllMocks();
    });

    test('should return paginated contract list', async () => {
        const mockContracts = [
            { _id: validContractId, filename: 'test.pdf', uploadedAt: new Date(), language: 'en', fileSize: 1024, userId: validUserId },
        ];

        mockContractCountDocuments.mockResolvedValue(1);
        mockContractFindChain(mockContracts);
        mockAnalysisFindChain([]);

        const result = await service.getContractList(validUserId, { page: 1, limit: 10 });

        expect(result.contracts).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.page).toBe(1);
    });

    test('should filter by filename', async () => {
        mockContractCountDocuments.mockResolvedValue(0);
        mockContractFindChain([]);
        mockAnalysisFindChain([]);

        const result = await service.getContractList(validUserId, {
            filters: { filename: 'employment' },
        });

        expect(mockContractFind).toHaveBeenCalledWith(
            expect.objectContaining({
                filename: expect.objectContaining({ $regex: 'employment' }),
            }),
        );
        expect(result.contracts).toHaveLength(0);
    });

    test('should filter by date range', async () => {
        const uploadedAfter = new Date('2026-01-01');
        const uploadedBefore = new Date('2026-12-31');

        mockContractCountDocuments.mockResolvedValue(0);
        mockContractFindChain([]);
        mockAnalysisFindChain([]);

        await service.getContractList(validUserId, {
            filters: { uploadedAfter, uploadedBefore },
        });

        expect(mockContractFind).toHaveBeenCalledWith(
            expect.objectContaining({
                uploadedAt: expect.objectContaining({
                    $gte: uploadedAfter,
                    $lte: uploadedBefore,
                }),
            }),
        );
    });

    test('should filter by status analyzed', async () => {
        const mockContracts = [
            { _id: validContractId, filename: 'test.pdf', uploadedAt: new Date(), language: 'en', fileSize: 1024, userId: validUserId },
        ];
        const mockAnalyses = [
            {
                _id: validAnalysisId,
                contractId: validContractId,
                executiveSummary: { overallRisk: 'high' },
            },
        ];

        mockContractCountDocuments.mockResolvedValue(1);
        mockContractFindChain(mockContracts);
        mockAnalysisFindChain(mockAnalyses);

        const result = await service.getContractList(validUserId, {
            filters: { status: 'analyzed' },
        });

        expect(result.contracts[0].status).toBe('analyzed');
        expect(result.contracts[0].riskLevel).toBe('high');
    });

    test('should filter by status pending', async () => {
        const mockContracts = [
            { _id: validContractId, filename: 'test.pdf', uploadedAt: new Date(), language: 'en', fileSize: 1024, userId: validUserId },
        ];

        mockContractCountDocuments.mockResolvedValue(1);
        mockContractFindChain(mockContracts);
        mockAnalysisFindChain([]);

        const result = await service.getContractList(validUserId, {
            filters: { status: 'pending' },
        });

        expect(result.contracts[0].status).toBe('pending');
    });

    test('should sort by riskLevel descending', async () => {
        const mockContracts = [
            { _id: new mongoose.Types.ObjectId().toString(), filename: 'a.pdf', uploadedAt: new Date(), language: 'en', fileSize: 1024, userId: validUserId },
            { _id: new mongoose.Types.ObjectId().toString(), filename: 'b.pdf', uploadedAt: new Date(), language: 'en', fileSize: 1024, userId: validUserId },
        ];
        const mockAnalyses = [
            { _id: validAnalysisId, contractId: mockContracts[0]._id, executiveSummary: { overallRisk: 'low' } },
            { _id: new mongoose.Types.ObjectId().toString(), contractId: mockContracts[1]._id, executiveSummary: { overallRisk: 'critical' } },
        ];

        mockContractCountDocuments.mockResolvedValue(2);
        mockContractFindChain(mockContracts);
        mockAnalysisFindChain(mockAnalyses);

        const result = await service.getContractList(validUserId, {
            sort: { field: 'riskLevel', order: 'desc' },
        });

        expect(result.contracts[0].riskLevel).toBe('critical');
        expect(result.contracts[1].riskLevel).toBe('low');
    });

    test('should sort by analyzedAt descending', async () => {
        const id1 = new mongoose.Types.ObjectId().toString();
        const id2 = new mongoose.Types.ObjectId().toString();
        const mockContracts = [
            { _id: id1, filename: 'old-analysis.pdf', uploadedAt: new Date(), language: 'en', fileSize: 1024, userId: validUserId },
            { _id: id2, filename: 'new-analysis.pdf', uploadedAt: new Date(), language: 'en', fileSize: 1024, userId: validUserId },
        ];
        const mockAnalyses = [
            { _id: new mongoose.Types.ObjectId().toString(), contractId: id1, executiveSummary: { overallRisk: 'low' }, createdAt: new Date('2026-01-01') },
            { _id: new mongoose.Types.ObjectId().toString(), contractId: id2, executiveSummary: { overallRisk: 'high' }, createdAt: new Date('2026-06-01') },
        ];

        mockContractCountDocuments.mockResolvedValue(2);
        mockContractFindChain(mockContracts);
        mockAnalysisFindChain(mockAnalyses);

        const result = await service.getContractList(validUserId, {
            sort: { field: 'analyzedAt', order: 'desc' },
        });

        // The contract with newer analysis (2026-06-01) should come first
        expect(result.contracts[0].filename).toBe('new-analysis.pdf');
        expect(result.contracts[1].filename).toBe('old-analysis.pdf');
    });

    test('should sort by analyzedAt ascending', async () => {
        const id1 = new mongoose.Types.ObjectId().toString();
        const id2 = new mongoose.Types.ObjectId().toString();
        const mockContracts = [
            { _id: id1, filename: 'old-analysis.pdf', uploadedAt: new Date(), language: 'en', fileSize: 1024, userId: validUserId },
            { _id: id2, filename: 'new-analysis.pdf', uploadedAt: new Date(), language: 'en', fileSize: 1024, userId: validUserId },
        ];
        const mockAnalyses = [
            { _id: new mongoose.Types.ObjectId().toString(), contractId: id1, executiveSummary: { overallRisk: 'low' }, createdAt: new Date('2026-01-01') },
            { _id: new mongoose.Types.ObjectId().toString(), contractId: id2, executiveSummary: { overallRisk: 'high' }, createdAt: new Date('2026-06-01') },
        ];

        mockContractCountDocuments.mockResolvedValue(2);
        mockContractFindChain(mockContracts);
        mockAnalysisFindChain(mockAnalyses);

        const result = await service.getContractList(validUserId, {
            sort: { field: 'analyzedAt', order: 'asc' },
        });

        // The contract with older analysis (2026-01-01) should come first
        expect(result.contracts[0].filename).toBe('old-analysis.pdf');
        expect(result.contracts[1].filename).toBe('new-analysis.pdf');
    });

    test('should have consistent total and totalPages when status filter is applied', async () => {
        // 3 contracts: 2 analyzed, 1 pending
        const id1 = new mongoose.Types.ObjectId().toString();
        const id2 = new mongoose.Types.ObjectId().toString();
        const id3 = new mongoose.Types.ObjectId().toString();
        const mockContracts = [
            { _id: id1, filename: 'a.pdf', uploadedAt: new Date(), language: 'en', fileSize: 1024, userId: validUserId },
            { _id: id2, filename: 'b.pdf', uploadedAt: new Date(), language: 'en', fileSize: 1024, userId: validUserId },
            { _id: id3, filename: 'c.pdf', uploadedAt: new Date(), language: 'en', fileSize: 1024, userId: validUserId },
        ];
        const mockAnalyses = [
            { _id: new mongoose.Types.ObjectId().toString(), contractId: id1, executiveSummary: { overallRisk: 'low' } },
            { _id: new mongoose.Types.ObjectId().toString(), contractId: id2, executiveSummary: { overallRisk: 'high' } },
            // id3 has no analysis → pending
        ];

        mockContractCountDocuments.mockResolvedValue(3);
        mockContractFindChain(mockContracts);
        mockAnalysisFindChain(mockAnalyses);

        const result = await service.getContractList(validUserId, {
            filters: { status: 'analyzed' },
            limit: 10,
        });

        // Only 2 contracts are analyzed
        expect(result.contracts).toHaveLength(2);
        expect(result.total).toBe(2);
        // totalPages should be consistent with the filtered total
        expect(result.totalPages).toBe(Math.ceil(2 / 10));
    });

    test('should only return contracts for the authenticated user', async () => {
        mockContractCountDocuments.mockResolvedValue(0);
        mockContractFindChain([]);
        mockAnalysisFindChain([]);

        await service.getContractList(validUserId);

        expect(mockContractFind).toHaveBeenCalledWith(
            expect.objectContaining({ userId: validUserId }),
        );
    });
});

describe('ContractHistoryService - getContractDetail', () => {
    let service: InstanceType<typeof ContractHistoryService>;

    beforeEach(() => {
        service = new ContractHistoryService();
        jest.clearAllMocks();
    });

    test('should return contract with analysis', async () => {
        const mockContract = { _id: validContractId, filename: 'test.pdf', userId: validUserId };
        const mockAnalysis = { _id: validAnalysisId, contractId: validContractId };

        mockContractFindOne.mockResolvedValue(mockContract);
        mockAnalysisFindOne.mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockAnalysis),
        });

        const result = await service.getContractDetail(validContractId, validUserId);

        expect(result).not.toBeNull();
        expect(result?.contract).toEqual(mockContract);
        expect(result?.analysis).toEqual(mockAnalysis);
    });

    test('should return null if contract not found', async () => {
        mockContractFindOne.mockResolvedValue(null);

        const result = await service.getContractDetail(validContractId, validUserId);
        expect(result).toBeNull();
    });

    test('should enforce ownership - query includes userId', async () => {
        mockContractFindOne.mockResolvedValue(null);

        await service.getContractDetail(validContractId, validUserId);

        expect(mockContractFindOne).toHaveBeenCalledWith(
            expect.objectContaining({ userId: validUserId }),
        );
    });

    test('should exclude soft deleted contracts - query includes deletedAt: null', async () => {
        mockContractFindOne.mockResolvedValue(null);

        await service.getContractDetail(validContractId, validUserId);

        expect(mockContractFindOne).toHaveBeenCalledWith(
            expect.objectContaining({ deletedAt: null }),
        );
    });
});

describe('ContractHistoryService - softDeleteContract', () => {
    let service: InstanceType<typeof ContractHistoryService>;

    beforeEach(() => {
        service = new ContractHistoryService();
        jest.clearAllMocks();
    });

    test('should soft delete contract successfully', async () => {
        mockContractFindOneAndUpdate.mockResolvedValue({
            _id: validContractId,
            deletedAt: new Date(),
        });

        const result = await service.softDeleteContract(validContractId, validUserId);
        expect(result).toBe(true);
    });

    test('should return false if contract not found', async () => {
        mockContractFindOneAndUpdate.mockResolvedValue(null);

        const result = await service.softDeleteContract(validContractId, validUserId);
        expect(result).toBe(false);
    });

    test('should set deletedAt on soft delete', async () => {
        mockContractFindOneAndUpdate.mockResolvedValue({ _id: validContractId });

        await service.softDeleteContract(validContractId, validUserId);

        expect(mockContractFindOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ _id: validContractId, userId: validUserId, deletedAt: null }),
            expect.objectContaining({ deletedAt: expect.any(Date) }),
            expect.anything(),
        );
    });

    test('should not delete contract owned by another user', async () => {
        mockContractFindOneAndUpdate.mockResolvedValue(null);

        const otherUserId = new mongoose.Types.ObjectId().toString();
        const result = await service.softDeleteContract(validContractId, otherUserId);

        expect(result).toBe(false);
    });

    test('should hide soft deleted contract from list queries', async () => {
        mockContractCountDocuments.mockResolvedValue(0);
        mockContractFindChain([]);
        mockAnalysisFindChain([]);

        await service.getContractList(validUserId);

        expect(mockContractFind).toHaveBeenCalledWith(
            expect.objectContaining({ deletedAt: null }),
        );
    });
});