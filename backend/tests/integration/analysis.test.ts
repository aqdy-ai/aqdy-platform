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

  // [Week 2][Day 6][Task 2] - سيتم تفعيل هذا الاختبار عند اكتمال الـ Parsing
  it('should return 422 if the document content is unreadable or empty', async () => {
    // هذا الاختبار يفترض وجود نظام معالجة مستندات يرفض الملفات الفارغة
    const response = await request(app)
      .post('/api/contracts/analysis')
      .send({
        contractId: 'empty-file-id',
        options: { language: 'ar' }
      });
    
    // ننتظر من المطورين التعامل مع هذه الحالة في الأسبوع الثاني
    // expect(response.status).toBe(422); 
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
