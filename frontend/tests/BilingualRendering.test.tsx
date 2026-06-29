/* tests/BilingualRendering.test.tsx */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import RiskAnalysisDashboard from '../src/pages/RiskAnalysisDashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0, gcTime: 0 },
  },
})

function WithQueryClient({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const renderWithProviders = (ui: ReactNode) =>
  render(<WithQueryClient>{ui}</WithQueryClient>)

// متغير محلي للتحكم في اللغة النشطة
let currentTestLanguage = 'ar'

// The real RiskAnalysisDashboard renders text using isRtl (i18n.language === 'ar')
// conditionally — NOT via t(). So we mock the language here.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      get language() {
        return currentTestLanguage
      },
      exists: () => true,
    },
  }),
}))

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(''), () => {}],
  useLocation: () => ({ search: '', pathname: '/' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}))

describe('Bilingual Rendering & RTL/LTR Layout Tests', () => {
  beforeEach(() => {
    currentTestLanguage = 'ar'
  })

  it('should render full Arabic UI layout with RTL directions', () => {
    currentTestLanguage = 'ar'
    renderWithProviders(<RiskAnalysisDashboard />)

    // The component renders: isRtl ? 'تحليل مخاطر العقد' : 'Contract Risk Analysis'
    expect(screen.getByText('تحليل مخاطر العقد')).toBeInTheDocument()
    // The filter button: isRtl ? 'كل الثغرات' + count
    expect(screen.getByText(/كل الثغرات/)).toBeInTheDocument()
  })

  it('should render full English UI layout with LTR directions', () => {
    currentTestLanguage = 'en'
    renderWithProviders(<RiskAnalysisDashboard />)

    // The component renders: isRtl ? 'تحليل مخاطر العقد' : 'Contract Risk Analysis'
    expect(screen.getByText('Contract Risk Analysis')).toBeInTheDocument()
    // The filter button: 'All Flaws' + count
    expect(screen.getByText(/All Flaws/)).toBeInTheDocument()
  })

  it('should render clause items from the internal mock data', () => {
    currentTestLanguage = 'ar'
    renderWithProviders(<RiskAnalysisDashboard />)

    // Verify known clause titles from MOCK_RISK_DATA are rendered
    expect(
      screen.getByText('شرط جزائي مفتوح وبدون حد أقصى')
    ).toBeInTheDocument()
    expect(
      screen.getByText('غموض في آلية إنهاء التعاقد المبكر')
    ).toBeInTheDocument()
  })
})
