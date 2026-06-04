import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { beforeAll, afterEach, afterAll, expect } from 'vitest'
import { server } from './mocks/server'
import i18n from '../src/lib/i18n'
import * as axeMatchers from 'vitest-axe/matchers' // 🌟 الاستيراد الصحيح للـ matchers كاملة كـ object

// 🎯 دمج جميع ميثودز الفحص (بما فيها toHaveNoViolations) جوه الـ expect بتاع Vitest
expect.extend(axeMatchers)

// تهيئة بيئة الاختبار بشكل شامل
beforeAll(async () => {
  // تشغيل MSW Server
  server.listen({ onUnhandledRequest: 'error' })

  // التأكد من تهيئة i18n قبل بدء أي اختبار
  if (!i18n.isInitialized) {
    await i18n.init()
  }
})

// التنظيف بعد كل اختبار لضمان عدم تداخل الـ DOM أو الـ Handlers
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// إغلاق جميع الموارد بعد انتهاء الاختبارات
afterAll(() => {
  server.close()
})
