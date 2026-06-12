// src/pages/__tests__/Pricing.test.tsx
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Pricing from '../src/pages/Pricing'
import { vi, beforeEach, afterEach, describe, test, expect } from 'vitest'

// 🌟 1. محاكاة (Mock) مكتبة الترجمة لتطابق الـ Keys المستعملة في الكومبوننت الجديد تماماً
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'pricing.title': 'Pricing Plans',
        'pricing.per_month': '/mo',
        'pricing.per_year': '/yr',
        'pricing.analysis_limit': 'Analysis Limit',
        'pricing.storage_limit': 'Storage Limit',
        'pricing.current_plan': 'Current Plan',
        'pricing.get_started': 'Get Started Free', // مطابقة للـ Pricing.tsx الجديد
        'pricing.upgrade': 'Upgrade to Pro', // مطابقة للـ Pricing.tsx الجديد
        'pricing.contact_us': 'Contact Us',
        'pricing.loading': 'Loading...',
      }
      return translations[key] || key
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}))

// 🌟 2. محاكاة الـ Global Fetch باستخدام spyOn والـ Double Casting الآمن للـ TypeScript
beforeEach(() => {
  vi.spyOn(global, 'fetch').mockResolvedValue({
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
            features: [
              'Basic AI contract check',
              'Standard support',
              'AR/EN interface',
            ],
          },
          {
            id: '2',
            name: 'Pro',
            price: '29',
            limits: { analysis: '50', storage: '2GB' },
            features: [
              'Advanced AI classification',
              'Priority support',
              'Deep risk assessment',
            ],
          },
          {
            id: '3',
            name: 'Enterprise',
            price: 'Custom',
            limits: { analysis: 'Unlimited', storage: 'Unlimited' },
            features: [
              'Custom fine-tuning',
              'Dedicated AI pipeline',
              '24/7 legal tech support',
            ],
          },
        ],
      }),
  } as unknown as Response)
})

afterEach(() => {
  vi.restoreAllMocks()
})

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
    <MemoryRouter>{renderUi({ isLoggedIn, userPlan })}</MemoryRouter>
  )
}

describe('Pricing Page', () => {
  test('shows loading state initially', async () => {
    renderWithProviders((props) => <Pricing {...props} />)
    // التيست بيفحص كلمة Loading المرتبطة بالترجمة
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    // Wait for the background update to complete to avoid act() warnings in stderr
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
  })

  test('renders plan cards after fetching', async () => {
    renderWithProviders((props) => <Pricing {...props} />)

    // الانتظار المرن لظهور أسماء الكروت الـ 3 بعد الـ Resolve
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /free/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /pro/i })).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: /enterprise/i })
      ).toBeInTheDocument()
    })
  })

  test('CTA links and navigation targets', async () => {
    renderWithProviders((props) => <Pricing {...props} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /free/i })).toBeInTheDocument()
    })

    const registerLink = screen.getByRole('link', { name: /get started free/i })
    expect(registerLink).toHaveAttribute('href', '/register')

    const upgradeButtons = screen.getAllByRole('button', {
      name: /upgrade to pro/i,
    })
    expect(upgradeButtons.length).toBeGreaterThanOrEqual(1)
    upgradeButtons.forEach((button) => {
      expect(button).not.toBeDisabled()
    })
  })

  test('disables current plan interactions when user is logged in', async () => {
    // محاكاة مستخدم مسجل بالفعل على باقة الـ Pro
    renderWithProviders((props) => <Pricing {...props} />, {
      isLoggedIn: true,
      userPlan: 'pro',
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /pro/i })).toBeInTheDocument()
    })

    const currentPlanButton = screen.getByRole('button', {
      name: /current plan/i,
    })
    expect(currentPlanButton).toBeDisabled()
  })
})
