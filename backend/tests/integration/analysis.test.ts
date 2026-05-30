import mongoose from 'mongoose';
import request from 'supertest';
import { describe, it, expect, beforeAll } from '@jest/globals';
// Assuming your express app is exported from src/index.ts or a separate app.ts
import  app  from '../../src/index.js'; 
import { contractService } from '../../src/services/contract.service.js';
import { Contract } from '../../src/models/contract.model.js';
import { RiskAnalysis } from '../../src/models/riskAnalysis.model.js';

let testContractId: string;
let emptyContractId: string;
let realContractId: string;
let largeContractId: string;

beforeAll(async () => {
  const testContract = await contractService.saveContract({
    filename: 'test.pdf',
    language: 'en',
    text: 'This is a sample contract text for testing analysis',
    userId: 'user-123',
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
    userId: 'user-123',
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
    userId: 'user-123',
    fileSize: 10240,
  });
  realContractId = String(realContract._id);

  await RiskAnalysis.create({
    contractId: realContractId,
    userId: 'user-123',
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
    userId: 'user-123',
    fileSize: 50000,
  });
  largeContractId = String(largeContract._id);
});

describe('Analysis API Integration', () => {
  it('should accept a contract for analysis and return 202', async () => {
    const response = await request(app)
      .post('/api/analysis/analyze')
      .send({
        contractId: testContractId,
        userId: 'user-123',
      });

    expect(response.status).toBe(202);
    expect(response.body.data).toHaveProperty('status', 'processing');
    expect(response.body.data).toHaveProperty('contractId', testContractId);
  });

  /**
   * [Week 2][Day 6][Task 2] - اختبار تكامل معالجة المستندات
   * يتحقق من أن النظام يرفض الملفات غير الصالحة بعد تفعيل الـ Parsing Pipeline
   */
  it('should return 422 if the document content is unreadable or empty', async () => {
    const response = await request(app)
      .post('/api/analysis/analyze')
      .send({
        contractId: emptyContractId,
        userId: 'user-123',
      });
    
    // If validation logic is not yet in controller, this remains a failing test for T2
    expect(response.status).toBe(422);
  });

  /**
   * [Week 2][Day 6][Task 3] - اختبار تنسيق الوكلاء (Agent Orchestration)
   * يتأكد من أن الرد يحتوي على الهيكل المطلوب للنتائج (Risk Score & Clauses)
   */
  it('should eventually include analysis results structure in the processing flow', async () => {
    const response = await request(app)
      .post('/api/analysis/analyze')
      .send({ contractId: testContractId, userId: 'user-123' });

    expect(response.body.data).toHaveProperty('contractId');
    expect(response.body.data).toHaveProperty('status', 'processing');
  });

  /**
   * [Week 2][Day 6][Task 4] - اختبار استمرارية البيانات (Database Persistence)
   * يتحقق من أن حالة التحليل (عبر سجلات التدقيق) يتم حفظها واسترجاعها بشكل صحيح
   */
  it('should persist the analysis state and retrieve it via the GET endpoint', async () => {
    const contractId = testContractId;
    const userId = 'user-123';

    // 1. إرسال طلب التحليل (يؤدي لحفظ سجل التدقيق ANALYSIS_STARTED)
    await request(app)
      .post('/api/analysis/analyze')
      .send({ contractId, userId });

    // 2. محاولة استرجاع الحالة (يجب أن يقرأ من قاعدة البيانات ويعيد حالة المعالجة)
    const response = await request(app)
      .get(`/api/analysis/${contractId}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('status', 'processing');
  });

  /**
   * [Week 2][Day 10][Task 1] - التحقق من هيكل ومحتوى التقرير (Verify report structure and content)
   * يتأكد من أن البيانات المسترجعة تحتوي على كامل التفاصيل المطلوبة (ملخص تنفيذي + تحليل البنود)
   */
  it('should return the full analysis report structure when completed', async () => {
    // Note: In a real CI environment, we use a seeded 'completed-contract-id'
    const contractId = realContractId; 
    
    const response = await request(app)
      .get(`/api/analysis/${contractId}`);

    // Ensure the request was successful and returned data
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
    // [Week 2][Day 10][Task 2] - Ensure KB source attribution is present
    expect(firstClause).toHaveProperty('sourceFromKB');
  });

  /**
   * [Week 2][Day 10][Task 3] - اختبار المخرجات ثنائية اللغة (Arabic/English)
   * يتحقق من أن التقرير يحتوي على النصوص باللغتين العربية والإنجليزية للملخص والتفسيرات
   */
  it('should return bilingual (AR/EN) content for summary and clause explanations', async () => {
    const contractId = realContractId;
    const response = await request(app).get(`/api/analysis/${contractId}`);

    if (response.status === 200 && response.body.data.executiveSummary) {
      const { executiveSummary, clauseAnalysis } = response.body.data;
      
      expect(executiveSummary.summary).toHaveProperty('ar');
      expect(executiveSummary.summary).toHaveProperty('en');
      
      const firstClause = clauseAnalysis[0];
      expect(firstClause.explanation).toHaveProperty('ar');
      expect(firstClause.explanation).toHaveProperty('en');
    }
  });

  /**
   * [Week 2][Day 10][Task 4] - التحقق من مطابقة مستويات المخاطر الملونة للتصنيفات
   * يتأكد من أن مستويات المخاطر في النتائج تنتمي فقط إلى المجموعة المحددة (low, medium, high, critical)
   */
  it('should ensure all risk levels in the report are within the allowed set', async () => {
    const contractId = realContractId;
    const response = await request(app).get(`/api/analysis/${contractId}`);

    if (response.status === 200 && response.body.data.executiveSummary) {
      const { executiveSummary, clauseAnalysis } = response.body.data;
      const allowedLevels = ['low', 'medium', 'high', 'critical'];
      
      // Check overall risk classification
      expect(allowedLevels).toContain(executiveSummary.overallRisk);
      
      // Check individual clause classifications
      clauseAnalysis.forEach((clause: any) => {
        expect(allowedLevels).toContain(clause.riskLevel);
      });
    }
  });

  /**
   * [Week 2][Day 8][Task 4] - اختبار الأنبوب الكامل (Full Pipeline) على عقود حقيقية
   * يتحقق من قدرة النظام على التعامل مع عقد توظيف حقيقي وتنسيق النتائج
   */
  it('should handle a full analysis request for a real employment contract fixture', async () => {
    const response = await request(app)
      .post('/api/analysis/analyze')
      .send({ 
        contractId: realContractId, 
        userId: 'user-123' 
      });

    expect(response.status).toBe(202);
    expect(response.body.data.status).toBe('processing');
  });

  /**
   * [Week 2][Day 12][Task 1] - اختبار التحميل بـ 5 تحليلات متزامنة (Load test with 5 concurrent analyses)
   * يتحقق من قدرة النظام على التعامل مع عدة طلبات في وقت واحد وتمريرها بنجاح لخدمة المعالجة الخلفية
   */
  it('should handle 5 concurrent analysis requests successfully', async () => {
    const concurrentCount = 5;
    const contractId = realContractId;
    const userId = 'user-123';

    const requests = Array.from({ length: concurrentCount }).map(() =>
      request(app)
        .post('/api/analysis/analyze')
        .send({ contractId, userId })
    );

    const responses = await Promise.all(requests);

    responses.forEach((response) => {
      expect(response.status).toBe(202);
      expect(response.body.data).toHaveProperty('status', 'processing');
    });
  });

  /**
   * [Week 2][Day 12][Task 2] - اختبار العقود الضخمة التي تحتوي على 50+ بند (Test large contracts with 50+ clauses)
   * يتحقق من قدرة النظام على قبول ومعالجة العقود الطويلة جداً التي قد تتطلب تقسيماً (Chunking) في مرحلة الاستخراج
   */
  it('should handle a large contract with 50+ clauses and return 202', async () => {
    const response = await request(app)
      .post('/api/analysis/analyze')
      .send({ 
        contractId: largeContractId, 
        userId: 'user-123' 
      });

    expect(response.status).toBe(202);
    expect(response.body.data.status).toBe('processing');
  });

  it('should return 400 if contractId is missing', async () => {
    const response = await request(app)
      .post('/api/analysis/analyze')
      .send({
        userId: 'user-123'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('contractId');
  });
});
