import "dotenv/config";
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';

let app: any;
import { Contract } from '../../src/models/contract.model.js';
import { RiskAnalysis } from '../../src/models/riskAnalysis.model.js';
import { AuditLog } from '../../src/models/auditLog.model.js';
import { creditsService } from '../../src/services/credits.service.js';
import { jest } from '@jest/globals';

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI!.replace('aqdy_db', 'aqdy_test');
  await mongoose.connect(mongoURI);

  const imported = await import('../../src/index.js');
  app = imported.default;

  jest.spyOn(creditsService, 'getBalance').mockResolvedValue(10000);
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

// ── Contract Upload Endpoint ──────────────────────────────────────────────

describe('POST /api/contracts/upload', () => {

  test('should upload a contract successfully', async () => {
    const res = await request(app)
      .post('/api/contracts/upload')
      .send({
        filename: 'test.pdf',
        language: 'en',
        text: 'This is a sample contract text for testing purposes.',
        userId: 'user_123',
        fileSize: 1024,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.contractId).toBeDefined();
  });

  test('should reject upload with missing fields', async () => {
    const res = await request(app)
      .post('/api/contracts/upload')
      .send({
        filename: 'test.pdf',
        // missing language, text, userId, fileSize
      });

    expect(res.status).toBe(400);
  });

  test('should reject upload with invalid language', async () => {
    const res = await request(app)
      .post('/api/contracts/upload')
      .send({
        filename: 'test.pdf',
        language: 'fr', // invalid
        text: 'Contract text',
        userId: 'user_123',
        fileSize: 1024,
      });

    expect(res.status).toBe(400);
  });

  test('should upload Arabic contract successfully', async () => {
    const res = await request(app)
      .post('/api/contracts/upload')
      .send({
        filename: 'عقد.pdf',
        language: 'ar',
        text: 'هذا عقد عمل بين الطرفين',
        userId: 'user_123',
        fileSize: 2048,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('should create audit log on upload', async () => {
    await request(app)
      .post('/api/contracts/upload')
      .send({
        filename: 'test.pdf',
        language: 'en',
        text: 'Contract text for audit test',
        userId: 'user_audit',
        fileSize: 512,
      });

    const logs = await AuditLog.find({ "metadata.originalUserId": 'user_audit' });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('CONTRACT_UPLOADED');
  });
});

// ── Get Contract Endpoint ─────────────────────────────────────────────────

describe('GET /api/contracts/:id', () => {
  test('should get contract by ID', async () => {
    // Upload first
    const uploadRes = await request(app)
      .post('/api/contracts/upload')
      .send({
        filename: 'test.pdf',
        language: 'en',
        text: 'Contract text',
        userId: 'user_123',
        fileSize: 1024,
      });

    const contractId = uploadRes.body.data.contractId;

    const res = await request(app).get(`/api/contracts/${contractId}`);
    expect(res.status).toBe(200);
    expect(res.body.filename).toBe('test.pdf');
  });

  test('should return 404 for non-existent contract', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/contracts/${fakeId}`);
    expect(res.status).toBe(404);
  });
});

// ── Analysis Endpoint ─────────────────────────────────────────────────────

describe('POST /api/analysis/analyze', () => {
  let authToken: string;
  let authenticatedUserId: string;

  beforeEach(async () => {
    // Register + login عشان نجيب token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: `test_${Date.now()}@test.com`,
        password: 'Test@1234',
      });
    authToken = registerRes.body.data.token;
    authenticatedUserId = registerRes.body.data.user.id;
  });

  test('should start analysis for valid contract', async () => {
    // Upload first بالـ authenticated user
    const uploadRes = await request(app)
      .post('/api/contracts/upload')
      .send({
        filename: 'test.pdf',
        language: 'en',
        text: 'This contract includes unlimited liability clause.',
        userId: authenticatedUserId,
        fileSize: 1024,
      });

    const contractId = uploadRes.body.data.contractId;

    const res = await request(app)
      .post('/api/analysis/analyze')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ contractId, userId: authenticatedUserId });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('processing');
  });

  test('should return 404 for non-existent contract', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post('/api/analysis/analyze')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ contractId: fakeId, userId: authenticatedUserId });

    expect(res.status).toBe(404);
  });

  test('should reject analysis with missing contractId', async () => {
    const res = await request(app)
      .post('/api/analysis/analyze')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: authenticatedUserId });

    expect(res.status).toBe(400);
  });
});

// ── Get Analysis Results Endpoint ─────────────────────────────────────────

describe('GET /api/analysis/:contractId', () => {
  test('should return processing status when analysis not done', async () => {
    const uploadRes = await request(app)
      .post('/api/contracts/upload')
      .send({
        filename: 'test.pdf',
        language: 'en',
        text: 'Contract text',
        userId: 'user_123',
        fileSize: 1024,
      });

    const contractId = uploadRes.body.data.contractId;

    const res = await request(app).get(`/api/analysis/${contractId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('processing');
  });

  test('should return 404 for non-existent contract', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/analysis/${fakeId}`);
    expect(res.status).toBe(404);
  });
});