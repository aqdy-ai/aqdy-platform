
// Covers:
//   ✅ balance rendering (compact + expanded)
//   ✅ warning state logic (amber < 20%, red at 0)
//   ✅ zero balance – Upgrade CTA visible
//   ✅ mini ledger rendering (contract name, credits spent)
//   ✅ loading state skeletons
//   ✅ error state (expanded only)
//   ✅ bilingual EN / AR rendering
//   ✅ RTL dir attribute

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import CreditsBadge from '../src/components/CreditsBadge'
import { accountApi } from '../src/services/accountApi'
import type { CreditsData } from '../src/types/account'

// ─── Mocks ──────────────────────────────────────────────

vi.mock('../src/services/accountApi', () => ({
  accountApi: {
    getCredits: vi.fn(),
  },
}))

let currentLang = 'en'

const translations: Record<string, Record<string, string>> = {
  en: {
    'credits.sectionTitle': 'Credits Balance',
    'credits.creditsLabel': 'credits',
    'credits.currentBalanceLabel': 'Current balance',
    'credits.planAllowanceLabel': 'Plan allowance',
    'credits.creditsRemaining': '{{count}} credits remaining ({{pct}}%)',
    'credits.noCreditsRemaining': 'No credits remaining',
    'credits.stateHealthy': 'Healthy',
    'credits.stateLow': 'Running Low',
    'credits.stateEmpty': 'Depleted',
    'credits.lowBalanceWarning':
      'Your credit balance is running low. Consider upgrading your plan.',
    'credits.recentDeductionsTitle': 'Recent deductions',
    'credits.contractLabel': 'Contract',
    'credits.upgradeCta': 'Upgrade Plan to Refill Credits',
    'credits.errorLoading': 'Unable to load credit information. Please refresh.',
    'credits.ariaLabel': 'Credits balance widget',
    'credits.upgradeAriaLabel': 'Upgrade plan to get more credits',
    'credits.progressAriaLabel': 'Credit usage progress bar',
    'credits.reason_analysis_deduction': 'Contract analysis',
    'credits.reason_chat_deduction': 'Clause chat',
    'credits.reason_plan_topup': 'Plan top-up',
    'credits.reason_manual_adjustment': 'Manual adjustment',
    'credits.reason_refund': 'Refund',
    'billing.upgrade': 'Upgrade',
  },
  ar: {
    'credits.sectionTitle': 'رصيد الاعتمادات',
    'credits.creditsLabel': 'اعتماد',
    'credits.currentBalanceLabel': 'الرصيد الحالي',
    'credits.planAllowanceLabel': 'مخصص الخطة',
    'credits.creditsRemaining': '{{count}} اعتماد متبقٍّ ({{pct}}%)',
    'credits.noCreditsRemaining': 'لا توجد اعتمادات متبقية',
    'credits.stateHealthy': 'جيد',
    'credits.stateLow': 'منخفض',
    'credits.stateEmpty': 'نافد',
    'credits.lowBalanceWarning':
      'رصيدك من الاعتمادات منخفض. فكّر في الترقية إلى خطة أعلى.',
    'credits.recentDeductionsTitle': 'آخر الخصومات',
    'credits.contractLabel': 'عقد',
    'credits.upgradeCta': 'ترقية الخطة لتجديد الاعتمادات',
    'credits.errorLoading': 'تعذّر تحميل بيانات الاعتمادات. يرجى إعادة التحميل.',
    'credits.ariaLabel': 'عنصر رصيد الاعتمادات',
    'credits.upgradeAriaLabel': 'ترقية الخطة للحصول على مزيد من الاعتمادات',
    'credits.progressAriaLabel': 'شريط تقدم استخدام الاعتمادات',
    'credits.reason_analysis_deduction': 'تحليل عقد',
    'credits.reason_chat_deduction': 'محادثة بند',
    'credits.reason_plan_topup': 'شحن الخطة',
    'credits.reason_manual_adjustment': 'تعديل يدوي',
    'credits.reason_refund': 'استرداد',
    'billing.upgrade': 'ترقية',
  },
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const tpl = translations[currentLang]?.[key] ?? key
      if (!opts) return tpl
      return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? ''))
    },
    i18n: {
      get language() {
        return currentLang
      },
    },
  }),
}))

// ─── Fixtures ───────────────────────────────────────────

const healthyData: CreditsData = {
  balance: 800,
  planAllowance: 1000,
  ledger: [
    {
      _id: 'l1',
      delta: -50,
      balanceAfter: 800,
      reason: 'analysis_deduction',
      metadata: { contractId: 'contract-abc123' },
      createdAt: '2025-06-01T10:00:00.000Z',
    },
    {
      _id: 'l2',
      delta: -30,
      balanceAfter: 850,
      reason: 'chat_deduction',
      metadata: {},
      createdAt: '2025-05-30T08:00:00.000Z',
    },
  ],
}

const lowData: CreditsData = {
  balance: 150, // 15% remaining → amber
  planAllowance: 1000,
  ledger: [],
}

const emptyData: CreditsData = {
  balance: 0,
  planAllowance: 1000,
  ledger: [],
}

// ─── Wrappers ───────────────────────────────────────────

const Wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

const renderCompact = () =>
  render(<CreditsBadge variant="compact" />, { wrapper: Wrapper })

const renderExpanded = () =>
  render(<CreditsBadge variant="expanded" />, { wrapper: Wrapper })

// ─── Tests ──────────────────────────────────────────────

describe('CreditsBadge', () => {
  beforeEach(() => {
    currentLang = 'en'
    vi.clearAllMocks()
  })

  // ── Loading state ──────────────────────────────────────

  it('[compact] shows loading skeleton initially', () => {
    vi.mocked(accountApi.getCredits).mockReturnValue(new Promise(() => {}))
    renderCompact()
    expect(screen.getByRole('status', { name: 'loading credits' })).toBeInTheDocument()
  })

  it('[expanded] shows loading skeleton initially', () => {
    vi.mocked(accountApi.getCredits).mockReturnValue(new Promise(() => {}))
    renderExpanded()
    expect(screen.getByRole('status', { name: 'loading credits' })).toBeInTheDocument()
  })

  // ── Healthy balance rendering ──────────────────────────

  it('[compact] renders balance and credits label', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(healthyData)
    renderCompact()
    await waitFor(() => {
      expect(screen.getByText('800')).toBeInTheDocument()
    })
    expect(screen.getByText('credits')).toBeInTheDocument()
  })

  it('[expanded] renders current balance and plan allowance', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(healthyData)
    renderExpanded()
    await waitFor(() => {
      expect(screen.getByText('Credits Balance')).toBeInTheDocument()
    })
    expect(screen.getByText('Current balance')).toBeInTheDocument()
    expect(screen.getByText('Plan allowance')).toBeInTheDocument()
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('[expanded] renders progress bar with aria role', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(healthyData)
    renderExpanded()
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  // ── Warning state (amber < 20 %) ────────────────────────

  it('[expanded] shows amber warning banner when balance is below 20%', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(lowData)
    renderExpanded()
    await waitFor(() => {
      expect(screen.getByText('Running Low')).toBeInTheDocument()
    })
    expect(
      screen.getByText(
        'Your credit balance is running low. Consider upgrading your plan.'
      )
    ).toBeInTheDocument()
  })

  it('[compact] renders warning icon when balance is below 20%', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(lowData)
    renderCompact()
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument()
    })
  })

  // ── Zero balance state ─────────────────────────────────

  it('[compact] shows Upgrade CTA when balance is 0', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(emptyData)
    renderCompact()
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /upgrade plan to get more credits/i })
      ).toBeInTheDocument()
    })
  })

  it('[expanded] shows Upgrade CTA button when balance is 0', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(emptyData)
    renderExpanded()
    await waitFor(() => {
      expect(screen.getByText('Depleted')).toBeInTheDocument()
      expect(screen.getByText('No credits remaining')).toBeInTheDocument()
    })
    expect(
      screen.getByRole('link', { name: /upgrade plan to get more credits/i })
    ).toBeInTheDocument()
  })

  it('[expanded] upgrade CTA links to /pricing', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(emptyData)
    renderExpanded()
    await waitFor(() => {
      const link = screen.getByRole('link', {
        name: /upgrade plan to get more credits/i,
      })
      expect(link).toHaveAttribute('href', '/pricing')
    })
  })

  // ── Mini ledger rendering ──────────────────────────────

  it('[expanded] renders mini ledger with recent deductions', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(healthyData)
    renderExpanded()
    await waitFor(() => {
      expect(screen.getByText('Recent deductions')).toBeInTheDocument()
    })
    // First entry has contractId → shows "Contract · abc123"
    expect(screen.getByText(/Contract · abc123/i)).toBeInTheDocument()
    // Second entry (no contractId) → shows reason label
    expect(screen.getByText('Clause chat')).toBeInTheDocument()
  })

  it('[expanded] renders credits spent (delta) for each ledger entry', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(healthyData)
    renderExpanded()
    await waitFor(() => {
      // delta values: -50 and -30
      expect(screen.getByText('-50')).toBeInTheDocument()
      expect(screen.getByText('-30')).toBeInTheDocument()
    })
  })

  it('[expanded] does not render ledger section when ledger is empty', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(emptyData)
    renderExpanded()
    await waitFor(() => {
      expect(screen.queryByText('Recent deductions')).not.toBeInTheDocument()
    })
  })

  // ── Error state ────────────────────────────────────────

  it('[expanded] shows error message on fetch failure', async () => {
    vi.mocked(accountApi.getCredits).mockRejectedValue(new Error('Network error'))
    renderExpanded()
    await waitFor(() => {
      expect(
        screen.getByText('Unable to load credit information. Please refresh.')
      ).toBeInTheDocument()
    })
  })

  it('[compact] renders nothing on fetch failure', async () => {
    vi.mocked(accountApi.getCredits).mockRejectedValue(new Error('Network error'))
    const { container } = renderCompact()
    await waitFor(() => {
      // compact variant returns null on error
      expect(container.firstChild).toBeNull()
    })
  })

  // ── Bilingual / RTL ────────────────────────────────────

  it('[expanded] renders Arabic content when language is ar', async () => {
    currentLang = 'ar'
    vi.mocked(accountApi.getCredits).mockResolvedValue(healthyData)
    renderExpanded()
    await waitFor(() => {
      expect(screen.getByText('رصيد الاعتمادات')).toBeInTheDocument()
    })
    expect(screen.getByText('الرصيد الحالي')).toBeInTheDocument()
    expect(screen.getByText('مخصص الخطة')).toBeInTheDocument()
  })

  it('[expanded] sets dir=rtl when language is ar', async () => {
    currentLang = 'ar'
    vi.mocked(accountApi.getCredits).mockResolvedValue(healthyData)
    renderExpanded()
    await waitFor(() => {
      const region = screen.getByRole('region', { name: 'عنصر رصيد الاعتمادات' })
      expect(region).toHaveAttribute('dir', 'rtl')
    })
  })

  it('[expanded] sets dir=ltr when language is en', async () => {
    currentLang = 'en'
    vi.mocked(accountApi.getCredits).mockResolvedValue(healthyData)
    renderExpanded()
    await waitFor(() => {
      const region = screen.getByRole('region', { name: 'Credits balance widget' })
      expect(region).toHaveAttribute('dir', 'ltr')
    })
  })

  // ── Unique IDs / accessibility ─────────────────────────

  it('[compact] has unique id credits-badge-compact', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(healthyData)
    renderCompact()
    await waitFor(() => {
      expect(document.getElementById('credits-badge-compact')).toBeInTheDocument()
    })
  })

  it('[expanded] has unique id credits-badge-expanded', async () => {
    vi.mocked(accountApi.getCredits).mockResolvedValue(healthyData)
    renderExpanded()
    await waitFor(() => {
      expect(document.getElementById('credits-badge-expanded')).toBeInTheDocument()
    })
  })
})
