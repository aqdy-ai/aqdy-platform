// tests/Accessibility.test.tsx
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, test, expect, vi } from 'vitest'
import { axe } from 'vitest-axe'
import Navbar from '@/components/layout/Navbar'
import SubscriptionBadge from '@/components/SubscriptionBadge'

// 🌟 الحل الجذري: إعلام الـ TypeScript صراحة بوجود الميثود جوه موديول vitest
declare module 'vitest' {
  export interface Assertion {
    toHaveNoViolations(): void
  }
}

// عمل Mock للـ hooks والـ Translation لضمان استقرار بيئة الفحص الآلي
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isInitialLoading: false,
    userProfile: { plan: 'Premium' },
  }),
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar' },
  }),
}))

describe('إتاحة الوصول | Accessibility (WCAG 2.1 AA) Tests', () => {
  test('الـ Navbar يجب أن يخلو تماماً من أي انتهاكات لمعايير الإتاحة', async () => {
    const { container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )

    // تشغيل الـ Axe engine على الـ HTML الناتج
    const results = await axe(container)

    // التأكد من تحقيق معيار Zero Violations
    expect(results).toHaveNoViolations()
  })

  test('مكون حالة الاشتراك (SubscriptionBadge) بمود الـ Full يجب أن يكون متوافقاً مع الـ WCAG', async () => {
    // عمل mock للـ fetch الخاص بالـ API
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              planName: 'الباقة المتقدمة',
              usedAnalyses: 5,
              limitAnalyses: 10,
              renewalDate: '2026-07-01',
            },
          }),
      })
    )

    const { container } = render(
      <MemoryRouter>
        <SubscriptionBadge variant="full" />
      </MemoryRouter>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
