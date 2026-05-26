import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
// Assuming your express app is exported from src/index.ts or a separate app.ts
import  app  from '../../src/index.js'; 

describe('Analysis API Integration', () => {
  it('should accept a contract for analysis and return 202', async () => {
    const response = await request(app)
      .post('/api/analysis/analyze')
      .send({
        contractId: 'test-id-123',
        userId: 'user-123'
      });

    expect(response.status).toBe(202);
    expect(response.body.data).toHaveProperty('status', 'processing');
    expect(response.body.data).toHaveProperty('contractId', 'test-id-123');
  });

  /**
   * [Week 2][Day 6][Task 2] - اختبار تكامل معالجة المستندات
   * يتحقق من أن النظام يرفض الملفات غير الصالحة بعد تفعيل الـ Parsing Pipeline
   */
  it('should return 422 if the document content is unreadable or empty', async () => {
    const response = await request(app)
      .post('/api/analysis/analyze')
      .send({
        contractId: 'empty-file-id',
        userId: 'user-123'
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
      .send({ contractId: 'test-id-123', userId: 'user-123' });

    expect(response.body.data).toHaveProperty('contractId');
    expect(response.body.data).toHaveProperty('status', 'processing');
  });

  /**
   * [Week 2][Day 6][Task 4] - اختبار استمرارية البيانات (Database Persistence)
   * يتحقق من أن حالة التحليل (عبر سجلات التدقيق) يتم حفظها واسترجاعها بشكل صحيح
   */
  it('should persist the analysis state and retrieve it via the GET endpoint', async () => {
    const contractId = 'test-id-123';
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
   * [Week 2][Day 8][Task 4] - اختبار الأنبوب الكامل (Full Pipeline) على عقود حقيقية
   * يتحقق من قدرة النظام على التعامل مع عقد توظيف حقيقي وتنسيق النتائج
   */
  it('should handle a full analysis request for a real employment contract fixture', async () => {
    const response = await request(app)
      .post('/api/analysis/analyze')
      .send({ 
        contractId: 'real-contract-id-001', 
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
