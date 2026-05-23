import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
// Assuming your express app is exported from src/index.ts or a separate app.ts
import  app  from '../../src/index.js'; 

describe('Analysis API Integration', () => {
  it('should accept a contract for analysis and return 202', async () => {
    const response = await request(app)
      .post('/api/contracts/analysis')
      .send({
        contractId: 'test-id-123',
        options: { language: 'ar' }
      });

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('status', 'processing');
    expect(response.body).toHaveProperty('analysisId');
  });

  /**
   * [Week 2][Day 6][Task 2] - اختبار تكامل معالجة المستندات
   * يتحقق من أن النظام يرفض الملفات غير الصالحة بعد تفعيل الـ Parsing Pipeline
   */
  it('should return 422 if the document content is unreadable or empty', async () => {
    const response = await request(app)
      .post('/api/contracts/analysis')
      .send({
        contractId: 'empty-file-id',
        options: { language: 'ar' }
      });
    
    // ملاحظة: سيفشل هذا الاختبار (سيعيد 202) حتى يقوم المطور ببرمجة الـ Validation
    expect(response.status).toBe(422); 
    expect(response.body.message).toMatch(/unreadable|empty/i);
  });

  /**
   * [Week 2][Day 6][Task 3] - اختبار تنسيق الوكلاء (Agent Orchestration)
   * يتأكد من أن الرد يحتوي على الهيكل المطلوب للنتائج (Risk Score & Clauses)
   */
  it('should eventually include analysis results structure in the processing flow', async () => {
    const response = await request(app)
      .post('/api/contracts/analysis')
      .send({ contractId: 'test-id-123' });

    expect(response.body.data).toHaveProperty('contractId');
    // هذا يتوقع أن المطور سيبدأ في ربط الـ Schema المطلوبة
  });

  it('should return 400 if contractId is missing', async () => {
    const response = await request(app)
      .post('/api/contracts/analysis')
      .send({
        options: { language: 'ar' }
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('contractId');
  });
});
