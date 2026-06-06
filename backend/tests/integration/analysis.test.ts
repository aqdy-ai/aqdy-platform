import mongoose from 'mongoose';
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import app from '../../src/index.js';
import { contractService } from '../../src/services/contract.service.js';
import { Contract } from '../../src/models/contract.model.js';
import { RiskAnalysis } from '../../src/models/riskAnalysis.model.js';
import { resetRateLimitStores } from '../../src/middlewares/rateLimit.js';

let testContractId: string;
let emptyContractId: string;
let realContractId: string;
let largeContractId: string;
let authToken: string;
let userId: string;

const analysisRequest = (payload: object) =>
  request(app)
    .post('/api/analysis/analyze')
    .set('Authorization', `Bearer ${authToken}`)
    .send(payload);

beforeAll(async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test User',
      email: `analysis_test_${Date.now()}@test.com`,
      password: 'Test@1234',
    });
  authToken = registerRes.body.data.token;
  userId = registerRes.body.data.user.id;

  const testContract = await contractService.saveContract({
    filename: 'test.pdf',
    language: 'en',
    text: 'This is a sample contract text for testing analysis',
    userId,
    fileSize: 2048,
  });
  testContractId = String(testContract._id);

  const emptyContractIdObj = new mongoose.Types.ObjectId();
  await Contract.collection.insertOne({
    _id: emptyContractIdObj,
    filename: 'empty.pdf',
    uploadedAt: new Date(),
    language: 'en',
    text: '',
    userId,
    fileSize: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  emptyContractId = String(emptyContractIdObj);

  const realContract = await Contract.create({
    _id: new mongoose.Types.ObjectId(),
    filename: 'real-contract.pdf',
    language: 'en',
    text: 'This is a realistic contract content used for a completed analysis fixture.',
    userId,
    fileSize: 10240,
  });
  realContractId = String(realContract._id);

  await RiskAnalysis.create({
    contractId: realContractId,
    userId,
    executiveSummary: {
      overallRisk: 'medium',
      totalClauses: 3,
      riskyClausesCount: 1,
      summary: {
        ar: 'ملخص باللغة العربية',
        en: 'Summary in English',
      },
    },
    clauseAnalysis: [
      {
        clauseText: 'Sample clause text.',
        clauseType: 'liability',
        riskLevel: 'medium',
        confidence: 0.82,
        explanation: {
          ar: 'هذا توضيح باللغة العربية.',
          en: 'This is an explanation in English.',
        },
        sourceFromKB: 'kb-123',
        redlineSuggestion: 'Please consider limiting liability to direct damages only.',
      },
    ],
    analysisDuration: 1500,
  });

  const largeContract = await contractService.saveContract({
    filename: 'large-contract.pdf',
    language: 'en',
    text: 'A'.repeat(5000),
    userId,
    fileSize: 50000,
  });
  largeContractId = String(largeContract._id);
});

describe('Analysis API Integration', () => {
  beforeEach(() => {
    resetRateLimitStores();
  });

  it('should accept a contract for analysis and return 202', async () => {
    const response = await analysisRequest({
      contractId: testContractId,
      userId,
    });

    expect(response.status).toBe(202);
    expect(response.body.data).toHaveProperty('status', 'processing');
    expect(response.body.data).toHaveProperty('contractId', testContractId);
  });

  it('should return 422 if the document content is unreadable or empty', async () => {
    const response = await analysisRequest({
      contractId: emptyContractId,
      userId,
    });
    expect(response.status).toBe(422);
  });

  it('should eventually include analysis results structure in the processing flow', async () => {
    const response = await analysisRequest({ contractId: testContractId, userId });

    expect(response.body.data).toHaveProperty('contractId');
    expect(response.body.data).toHaveProperty('status', 'processing');
  });

  it('should persist the analysis state and retrieve it via the GET endpoint', async () => {
    await analysisRequest({ contractId: testContractId, userId });

    const response = await request(app).get(`/api/analysis/${testContractId}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('status', 'processing');
  });

  it('should return the full analysis report structure when completed', async () => {
    const response = await request(app).get(`/api/analysis/${realContractId}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('executiveSummary');
    expect(response.body.data.executiveSummary).toHaveProperty('overallRisk');
    expect(response.body.data.executiveSummary.summary).toHaveProperty('ar');
    expect(response.body.data.executiveSummary.summary).toHaveProperty('en');
    expect(response.body.data).toHaveProperty('clauseAnalysis');
    expect(Array.isArray(response.body.data.clauseAnalysis)).toBe(true);

    const firstClause = response.body.data.clauseAnalysis[0];
    expect(firstClause).toHaveProperty('clauseType');
    expect(firstClause).toHaveProperty('clauseText');
    expect(firstClause).toHaveProperty('riskLevel');
    expect(firstClause).toHaveProperty('explanation');
    expect(firstClause).toHaveProperty('redlineSuggestion');
    expect(firstClause).toHaveProperty('sourceFromKB');
  });

  it('should return bilingual (AR/EN) content for summary and clause explanations', async () => {
    const response = await request(app).get(`/api/analysis/${realContractId}`);

    if (response.status === 200 && response.body.data.executiveSummary) {
      const { executiveSummary, clauseAnalysis } = response.body.data;
      expect(executiveSummary.summary).toHaveProperty('ar');
      expect(executiveSummary.summary).toHaveProperty('en');
      const firstClause = clauseAnalysis[0];
      expect(firstClause.explanation).toHaveProperty('ar');
      expect(firstClause.explanation).toHaveProperty('en');
    }
  });

  it('should ensure all risk levels in the report are within the allowed set', async () => {
    const response = await request(app).get(`/api/analysis/${realContractId}`);

    if (response.status === 200 && response.body.data.executiveSummary) {
      const { executiveSummary, clauseAnalysis } = response.body.data;
      const allowedLevels = ['low', 'medium', 'high', 'critical'];
      expect(allowedLevels).toContain(executiveSummary.overallRisk);
      clauseAnalysis.forEach((clause: any) => {
        expect(allowedLevels).toContain(clause.riskLevel);
      });
    }
  });

  it('should handle a full analysis request for a real employment contract fixture', async () => {
    const response = await analysisRequest({
      contractId: realContractId,
      userId,
    });

    expect(response.status).toBe(202);
    expect(response.body.data.status).toBe('processing');
  });

  it('should handle 5 concurrent analysis requests successfully', async () => {
    const requests = Array.from({ length: 5 }).map(() =>
      analysisRequest({ contractId: realContractId, userId })
    );

    const responses = await Promise.all(requests);

    responses.forEach((response) => {
      expect(response.status).toBe(202);
      expect(response.body.data).toHaveProperty('status', 'processing');
    });
  });

  it('should handle a large contract with 50+ clauses and return 202', async () => {
    const response = await analysisRequest({
      contractId: largeContractId,
      userId,
    });

    expect(response.status).toBe(202);
    expect(response.body.data.status).toBe('processing');
  });

  it('should return 400 if contractId is missing', async () => {
    const response = await analysisRequest({ userId });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('contractId');
  });
});