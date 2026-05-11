/**
 * نموذج لاختبارات الوحدات (Unit Testing Template)
 * هذا الملف يساعد المطورين على فهم كيفية كتابة اختبارات للكود الخاص بهم
 * Path: backend/tests/sample.test.js
 */

import { calculateRiskScore } from '../src/services/contractService.js';

describe('Contract Service - Unit Tests', () => {

  test('يجب أن يعيد نتيجة 100 إذا كان العقد يحتوي على كلمات خطيرة جداً', () => {
    const sampleText = "This contract allows unlimited liability for the provider.";
    const result = calculateRiskScore(sampleText);
    expect(result).toBe(100);
  });

  test('يجب أن يعيد صفر إذا كان النص فارغاً', () => {
    const result = calculateRiskScore("");
    expect(result).toBe(0);
  });

  test('مثال على استخدام Mock لخدمة خارجية', async () => {
    const mockDatabaseFetch = jest.fn().mockReturnValue({ id: 1, status: 'active' });
    const data = mockDatabaseFetch();
    expect(data.status).toBe('active');
    expect(mockDatabaseFetch).toHaveBeenCalledTimes(1);
  });
});

/**
 * نصائح لزملائك:
 * 1. اجعل اسم الاختبار واضحاً.
 * 2. اختبر حالة واحدة فقط في كل test block.
 * 3. استخدم Mocks دائماً.
 */