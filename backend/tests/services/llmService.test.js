/**
 * LLM Service Unit Test (Mocked)
 * Location: backend/tests/services/llmService.test.js
 */
// نخرج مستويين للوصول لـ src/services
import llmService from '../../src/services/llmService.js';

// محاكاة وهمية لـ OpenAI لتقليل التكاليف أثناء الاختبار
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockRejectedValue(new Error('API Down')),
      },
    },
  }));
});

describe('LLM Service Logic', () => {
  test('should fallback to Gemini if GPT-4o fails', async () => {
    // هنا نختبر قدرة النظام على التحول لنموذج بديل عند الفشل
    const response = await llmService.analyze('Test contract text');
    
    // نتوقع أن يظل النظام مستقراً ويعيد نتيجة من النموذج البديل
    expect(response.source).toBe('gemini-fallback');
  });
});