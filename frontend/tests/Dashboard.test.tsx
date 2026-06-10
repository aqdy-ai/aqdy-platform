import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Mock } from 'vitest'
import { toast } from 'sonner'
import { accountApi } from '../src/services/accountApi'
import Dashboard from '../src/pages/Dashboard'

// Mock dependencies
const mockedToast = toast as unknown as {
  success: Mock
  error: Mock
  info: Mock
}

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('../src/services/accountApi', () => ({
  accountApi: {
    getSubscription: vi.fn(),
  },
}))

vi.mock('../src/pages/RiskAnalysisDashboard', () => ({
  default: () => <div data-testid="risk-analysis-dashboard">Risk Analysis Dashboard</div>,
}))

vi.mock('../src/components/SubscriptionBadge', () => ({
  default: () => <div data-testid="subscription-badge">Subscription Badge</div>,
}))

const translations: Record<string, Record<string, string>> = {
  en: {
    'dashboard.payment_failed': 'Payment Failed',
    'dashboard.retry_payment': 'Retry Payment',
    'dashboard.subscription_expired': 'Subscription Expired',
    'dashboard.subscription_expired_desc': 'Your subscription has expired.',
    'dashboard.upgrade_to_continue': 'Upgrade to Continue',
    'dashboard.grace_period_warning': 'Grace Period: {{days}} days',
    'billing.cancellationConfirmed': 'Cancellation Confirmed',
    'billing.creditTopupSuccess': 'Credit Topup Success',
  },
  ar: {
    'dashboard.payment_failed': 'فشلت عملية الدفع',
    'dashboard.retry_payment': 'إعادة المحاولة',
    'dashboard.subscription_expired': 'انتهى الاشتراك',
    'dashboard.subscription_expired_desc': 'لقد انتهى اشتراكك.',
    'dashboard.upgrade_to_continue': 'ترقية للاستمرار',
    'dashboard.grace_period_warning': 'فترة السماح: {{days}} أيام',
    'billing.cancellationConfirmed': 'تم تأكيد الإلغاء',
    'billing.creditTopupSuccess': 'تم شحن الرصيد بنجاح',
  },
}

let currentTestLanguage = 'en'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const val = translations[currentTestLanguage]?.[key] ?? key
      if (options?.days !== undefined) {
        return val.replace('{{days}}', options.days.toString())
      }
      return val
    },
    i18n: {
      get language() {
        return currentTestLanguage
      },
    },
  }),
}))

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  })

const renderWithProviders = (ui: React.ReactNode, initialEntries = ['/']) => {
  const queryClient = createQueryClient()
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  )
}

describe('Dashboard Component', () => {
  beforeEach(() => {
    currentTestLanguage = 'en'
    vi.clearAllMocks()
    mockedToast.success.mockClear()
    // Reset to a default active subscription
    vi.mocked(accountApi.getSubscription).mockResolvedValue({
      planName: 'Pro',
      analysesUsed: 5,
      analysesAllowed: 100,
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'paid',
    })
  })

  it('renders correctly with an active subscription', async () => {
    renderWithProviders(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByTestId('risk-analysis-dashboard')).toBeInTheDocument()
    })
    
    expect(screen.getByTestId('subscription-badge')).toBeInTheDocument()
    expect(screen.queryByText('Payment Failed')).not.toBeInTheDocument()
    expect(screen.queryByText('Subscription Expired')).not.toBeInTheDocument()
    expect(screen.queryByText(/Grace Period/i)).not.toBeInTheDocument()
  })

  it('displays payment failed banner when paymentStatus is failed', async () => {
    vi.mocked(accountApi.getSubscription).mockResolvedValue({
      planName: 'Pro',
      analysesUsed: 5,
      analysesAllowed: 100,
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'failed',
    })

    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Payment Failed')).toBeInTheDocument()
    })
    expect(screen.getByText('Retry Payment')).toBeInTheDocument()
  })

  it('displays grace period warning when endDate is within 3 days', async () => {
    vi.mocked(accountApi.getSubscription).mockResolvedValue({
      planName: 'Pro',
      analysesUsed: 5,
      analysesAllowed: 100,
      renewalDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'paid',
    })

    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Grace Period: \d days/i)).toBeInTheDocument()
    })
  })

  it('displays expired state and blocks RiskAnalysisDashboard when subscription is expired', async () => {
    vi.mocked(accountApi.getSubscription).mockResolvedValue({
      planName: 'Pro',
      analysesUsed: 5,
      analysesAllowed: 100,
      renewalDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'paid',
    })

    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Subscription Expired')).toBeInTheDocument()
    })
    expect(screen.getByText('Upgrade to Continue')).toBeInTheDocument()
    expect(screen.queryByTestId('risk-analysis-dashboard')).not.toBeInTheDocument()
  })

  it('triggers toast for cancel_success URL parameter', async () => {
    renderWithProviders(<Dashboard />, ['/?cancel_success=true'])
    
    await waitFor(() => {
      expect(mockedToast.success).toHaveBeenCalledWith('Cancellation Confirmed')
    })
  })

  it('triggers toast for topup_success URL parameter', async () => {
    renderWithProviders(<Dashboard />, ['/?topup_success=true'])
    
    await waitFor(() => {
      expect(mockedToast.success).toHaveBeenCalledWith('Credit Topup Success')
    })
  })

  it('supports bilingual rendering (Arabic)', async () => {
    currentTestLanguage = 'ar'
    vi.mocked(accountApi.getSubscription).mockResolvedValue({
      planName: 'Pro',
      analysesUsed: 5,
      analysesAllowed: 100,
      renewalDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // Expired
      endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'failed',
    })

    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('فشلت عملية الدفع')).toBeInTheDocument()
      expect(screen.getByText('إعادة المحاولة')).toBeInTheDocument()
      expect(screen.getByText('انتهى الاشتراك')).toBeInTheDocument()
      expect(screen.getByText('ترقية للاستمرار')).toBeInTheDocument()
    })
    
    expect(document.querySelector('div[dir="rtl"]')).toBeInTheDocument()
  })
})
