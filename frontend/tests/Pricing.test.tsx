// src/pages/__tests__/Pricing.test.tsx
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Pricing from '@/pages/Pricing'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'

// Mock fetch globally for this test file
beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [
            {
              id: '1',
              name: 'Free',
              price: '0',
              limits: { analysis: '3', storage: '100MB' },
              features: ['Basic AI contract check', 'Standard support'],
            },
            {
              id: '2',
              name: 'Pro',
              price: '29',
              limits: { analysis: '50', storage: '2GB' },
              features: ['Advanced AI classification', 'Priority support'],
            },
            {
              id: '3',
              name: 'Enterprise',
              price: 'Custom',
              limits: { analysis: 'Unlimited', storage: 'Unlimited' },
              features: ['Custom fine-tuning'],
            },
          ],
        }),
    })
  ) as unknown as jest.Mock
})

afterEach(() => {
  jest.restoreAllMocks()
})

// 🌟 الحل الجذري: تحويل الـ ui إلى دالة تستقبل الـ props وتُرجع المكون مضبوط التايب بنسبة 100%
const renderWithProviders = (
  renderUi: (props: {
    isLoggedIn: boolean
    userPlan: string | null
  }) => React.ReactElement,
  {
    isLoggedIn = false,
    userPlan = null,
  }: { isLoggedIn?: boolean; userPlan?: string | null } = {}
) => {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{renderUi({ isLoggedIn, userPlan })}</MemoryRouter>
    </I18nextProvider>
  )
}

describe('Pricing Page', () => {
  test('shows loading state initially', async () => {
    // نمرر الـ component كـ دالة ترجع العنصر (Arrow Function)
    renderWithProviders((props) => <Pricing {...props} />)
    expect(screen.getByText(/loading|جاري/i)).toBeInTheDocument()
  })

  test('renders plan cards after fetching', async () => {
    renderWithProviders((props) => <Pricing {...props} />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /free|مجانية/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: /pro|برو/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: /enterprise|شركات/i })
      ).toBeInTheDocument()
    })
  })

  test('CTA links and navigation targets', async () => {
    renderWithProviders((props) => <Pricing {...props} />)

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /get started free|ابدأ مجاناً/i })
      ).toBeInTheDocument()
    })

    const freeLink = screen.getByRole('link', {
      name: /get started free|ابدأ مجاناً/i,
    })
    expect(freeLink).toHaveAttribute('href', '/register')

    const proLink = screen.getByRole('link', {
      name: /upgrade to pro|اشترك الآن/i,
    })
    expect(proLink).toHaveAttribute(
      'href',
      expect.stringContaining('/checkout?plan=pro')
    )

    const enterpriseLink = screen.getByRole('link', {
      name: /contact us|تواصل معنا/i,
    })
    expect(enterpriseLink).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:partnerships@aqdy.ai')
    )
  })

  test('disables current plan interactions when user is logged in', async () => {
    // تمرير الـ custom props بأمان تام والـ TS هيكمل الباقي بدون أخطاء
    renderWithProviders((props) => <Pricing {...props} />, {
      isLoggedIn: true,
      userPlan: 'pro',
    })

    await waitFor(() => {
      expect(screen.getByText(/current plan|خطتك الحالية/i)).toBeInTheDocument()
    })

    const proLink = screen.getByRole('link', {
      name: /upgrade to pro|اشترك الآن/i,
    })
    expect(proLink).toHaveClass('pointer-events-none')
  })
})
