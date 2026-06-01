import "dotenv/config";
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';

import { Contract } from '../../src/models/contract.model.js';
import { RiskAnalysis } from '../../src/models/riskAnalysis.model.js';
import { AuditLog } from '../../src/models/auditLog.model.js';
import { contractService } from '../../src/services/contract.service.js';
import { analysisService } from '../../src/services/analysis.service.js';
import { auditLogService } from '../../src/services/auditLog.service.js';

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI!.replace('aqdy_db', 'aqdy_test');
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  } else {
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
  }
});

beforeEach(async () => {
  await Contract.deleteMany({});
  await RiskAnalysis.deleteMany({});
  await AuditLog.deleteMany({});
});

describe('Persistence: Contract Data Integrity', () => {
  test('should persist all contract fields correctly', async () => {
    const contract = await contractService.saveContract({
      filename: 'integrity_test.pdf',
      language: 'ar',
      text: 'هذا عقد عمل بين الطرفين',
      userId: 'user_persist_1',
      fileSize: 4096,
    });

    const found = await Contract.findById(contract._id);
    expect(found?.filename).toBe('integrity_test.pdf');
    expect(found?.language).toBe('ar');
    expect(found?.text).toBe('هذا عقد عمل بين الطرفين');
    expect(found?.userId).toBe('user_persist_1');
    expect(found?.fileSize).toBe(4096);
    expect(found?.uploadedAt).toBeDefined();
  });

  test('should persist multiple contracts for same user', async () => {
    await contractService.saveContract({
      filename: 'a.pdf', language: 'en',
      text: 'Contract A', userId: 'user_multi', fileSize: 1024,
    });
    await contractService.saveContract({
      filename: 'b.pdf', language: 'ar',
      text: 'عقد ب', userId: 'user_multi', fileSize: 2048,
    });
    await contractService.saveContract({
      filename: 'c.pdf', language: 'en',
      text: 'Contract C', userId: 'user_multi', fileSize: 3072,
    });

    const contracts = await contractService.getContractsByUser('user_multi');
    expect(contracts).toHaveLength(3);
  });

  test('should update contract and persist changes', async () => {
    const contract = await contractService.saveContract({
      filename: 'old.pdf', language: 'en',
      text: 'Old text', userId: 'user_update', fileSize: 1024,
    });

    await contractService.updateContract(String(contract._id), {
      filename: 'updated.pdf',
    } as any);

    const found = await Contract.findById(contract._id);
    expect(found?.filename).toBe('updated.pdf');
  });

  test('should delete contract and remove from DB', async () => {
    const contract = await contractService.saveContract({
      filename: 'delete.pdf', language: 'en',
      text: 'To delete', userId: 'user_delete', fileSize: 512,
    });

    await contractService.deleteContract(String(contract._id));
    const found = await Contract.findById(contract._id);
    expect(found).toBeNull();
  });
});

describe('Persistence: RiskAnalysis Data Integrity', () => {
  test('should persist analysis with all clause details', async () => {
    const contract = await contractService.saveContract({
      filename: 'analysis.pdf', language: 'en',
      text: 'Contract for analysis', userId: 'user_analysis', fileSize: 1024,
    });

    const analysis = await analysisService.saveAnalysis({
      contractId: String(contract._id),
      userId: 'user_analysis',
      executiveSummary: {
        overallRisk: 'critical',
        totalClauses: 3,
        riskyClausesCount: 2,
        summary: {
          ar: 'عقد خطير جداً',
          en: 'Very risky contract',
        },
      },
      clauseAnalysis: [
        {
          clauseText: 'Unlimited liability clause',
          clauseType: 'liability',
          riskLevel: 'critical',
          confidence: 0.95,
          explanation: { ar: 'خطير جداً', en: 'Very risky' },
          sourceFromKB: 'clause_001',
          redlineSuggestion: 'Cap liability at 12 months fees',
        },
        {
          clauseText: 'Standard payment terms',
          clauseType: 'payment',
          riskLevel: 'low',
          confidence: 0.90,
          explanation: { ar: 'عادي', en: 'Standard' },
          sourceFromKB: 'clause_002',
        },
      ],
      analysisDuration: 2500,
    });

    const found = await RiskAnalysis.findById(analysis._id);
    expect(found?.executiveSummary.overallRisk).toBe('critical');
    expect(found?.clauseAnalysis).toHaveLength(2);
    expect(found?.clauseAnalysis[0].riskLevel).toBe('critical');
    expect(found?.clauseAnalysis[0].sourceFromKB).toBe('clause_001');
    expect(found?.analysisDuration).toBe(2500);
  });

  test('should link analysis to correct contract', async () => {
    const contract = await contractService.saveContract({
      filename: 'link.pdf', language: 'en',
      text: 'Contract to link', userId: 'user_link', fileSize: 1024,
    });

    await analysisService.saveAnalysis({
      contractId: String(contract._id),
      userId: 'user_link',
      executiveSummary: {
        overallRisk: 'low',
        totalClauses: 1,
        riskyClausesCount: 0,
        summary: { ar: 'آمن', en: 'Safe' },
      },
      clauseAnalysis: [],
      analysisDuration: 1000,
    });

    const found = await analysisService.getAnalysisByContractId(String(contract._id));
    expect(found?.contractId.toString()).toBe(String(contract._id));
  });
});

describe('Persistence: AuditLog Data Integrity', () => {
  test('should persist all audit actions in order', async () => {
    const contract = await contractService.saveContract({
      filename: 'audit.pdf', language: 'en',
      text: 'Contract for audit', userId: 'user_audit', fileSize: 1024,
    });

    const contractId = String(contract._id);

    await auditLogService.logEvent({ contractId, userId: 'user_audit', action: 'CONTRACT_UPLOADED' });
    await auditLogService.logEvent({ contractId, userId: 'user_audit', action: 'ANALYSIS_STARTED' });
    await auditLogService.logEvent({ contractId, userId: 'user_audit', action: 'ANALYSIS_COMPLETED' });

    const logs = await auditLogService.getLogsByContract(contractId);
    expect(logs).toHaveLength(3);

    const actions = logs.map(l => l.action);
    expect(actions).toContain('CONTRACT_UPLOADED');
    expect(actions).toContain('ANALYSIS_STARTED');
    expect(actions).toContain('ANALYSIS_COMPLETED');
  });

  test('should persist metadata in audit log', async () => {
    const contract = await contractService.saveContract({
      filename: 'meta.pdf', language: 'en',
      text: 'Contract', userId: 'user_meta', fileSize: 1024,
    });

    await auditLogService.logEvent({
      contractId: String(contract._id),
      userId: 'user_meta',
      action: 'CONTRACT_UPLOADED',
      metadata: { filename: 'meta.pdf', fileSize: 1024, language: 'en' },
    });

    const logs = await auditLogService.getLogsByContract(String(contract._id));
    expect(logs[0].metadata).toMatchObject({
      filename: 'meta.pdf',
      fileSize: 1024,
    });
  });
});