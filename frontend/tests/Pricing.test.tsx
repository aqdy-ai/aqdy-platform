// src/pages/__tests__/Pricing.test.tsx
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Pricing from '@/pages/Pricing'
import { vi, beforeEach, afterEach, describe, test, expect } from 'vitest'

// 🌟 الحل: إضافة كائن i18n كامل ومعاه الـ language عشان كود الـ component يقراه بأمان
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'pricing.title': 'Pricing Plans',
        'pricing.per_month': '/mo',
        'pricing.analysis_limit': 'Analysis Limit',
        'pricing.storage_limit': 'Storage Limit',
        'pricing.current_plan': 'Current Plan',
        'pricing.get_started': 'Get Started Free',
        'pricing.upgrade': 'Upgrade to Pro',
        'pricing.contact_us': 'Contact Us',
      }
      return translations[key] || key
    },
    i18n: {
      language: 'en', // 👈 ضفنا الـ language هنا عشان نمنع الـ TypeError
      changeLanguage: vi.fn(),
    },
  }),
}))

// Mock fetch globally
// Mock fetch globally
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
            features: ['Basic AI contract check'],
            ctaKey: 'pricing.get_started',
          },
          {
            id: '2',
            name: 'Pro',
            price: '29',
            limits: { analysis: '50', storage: '2GB' },
            features: ['Advanced AI classification'],
            ctaKey: 'pricing.upgrade',
          },
          {
            id: '3',
            name: 'Enterprise',
            price: 'Custom',
            limits: { analysis: 'Unlimited', storage: 'Unlimited' },
            features: ['Custom fine-tuning'],
            ctaKey: 'pricing.contact_us',
          },
        ],
      }),
  } as unknown as Response) // 🌟 التعديل السحري هنا: الـ double casting بيفصل الـ type وبيخليه يقبله فوراً
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
    // التيست هيمر لأن الـ loader مش بيعتمد على الكروت
    expect(screen.getByText(/loading|جاري/i)).toBeInTheDocument()
  })

  test('renders plan cards after fetching', async () => {
    renderWithProviders((props) => <Pricing {...props} />)

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
      const links = screen.getAllByRole('link')
      const freeLink = links.find(
        (l) =>
          l.getAttribute('href') === '/register' ||
          l.textContent?.includes('Free')
      )
      expect(freeLink).toBeDefined()
    })

    const allLinks = screen.getAllByRole('link')

    const registerLink = allLinks.find(
      (l) => l.getAttribute('href') === '/register'
    )
    expect(registerLink).toBeInTheDocument()

    const checkoutLink = allLinks.find((l) =>
      l.getAttribute('href')?.includes('/checkout')
    )
    expect(checkoutLink).toBeInTheDocument()

    const mailtoLink = allLinks.find((l) =>
      l.getAttribute('href')?.includes('mailto:')
    )
    expect(mailtoLink).toBeInTheDocument()
  })

  test('disables current plan interactions when user is logged in', async () => {
    renderWithProviders((props) => <Pricing {...props} />, {
      isLoggedIn: true,
      userPlan: 'pro',
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /pro/i })).toBeInTheDocument()
    })

    const allLinks = screen.getAllByRole('link')
    const proLink = allLinks.find((l) =>
      l.getAttribute('href')?.includes('plan=pro')
    )

    if (proLink) {
      expect(proLink).toHaveClass('pointer-events-none')
    } else {
      expect(
        screen.queryByRole('link', { name: /upgrade/i })
      ).not.toBeInTheDocument()
    }
  })
})
