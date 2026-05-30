/* tests/BilingualRendering.test.tsx */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RiskAnalysisDashboard from '../src/pages/RiskAnalysisDashboard'

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
}))

describe('Bilingual Rendering & RTL/LTR Layout Tests', () => {
  beforeEach(() => {
    currentTestLanguage = 'ar'
  })

  it('should render full Arabic UI layout with RTL directions', () => {
    currentTestLanguage = 'ar'
    render(<RiskAnalysisDashboard />)

    // The component renders: isRtl ? 'تحليل مخاطر العقد' : 'Contract Risk Analysis'
    expect(screen.getByText('تحليل مخاطر العقد')).toBeInTheDocument()
    // The filter button: isRtl ? 'كل الثغرات' + count
    expect(screen.getByText(/كل الثغرات/)).toBeInTheDocument()
  })

  it('should render full English UI layout with LTR directions', () => {
    currentTestLanguage = 'en'
    render(<RiskAnalysisDashboard />)

    // The component renders: isRtl ? 'تحليل مخاطر العقد' : 'Contract Risk Analysis'
    expect(screen.getByText('Contract Risk Analysis')).toBeInTheDocument()
    // The filter button: 'All Flaws' + count
    expect(screen.getByText(/All Flaws/)).toBeInTheDocument()
  })

  it('should render clause items from the internal mock data', () => {
    currentTestLanguage = 'ar'
    render(<RiskAnalysisDashboard />)

    // Verify known clause titles from MOCK_RISK_DATA are rendered
    expect(
      screen.getByText('شرط جزائي مفتوح وبدون حد أقصى')
    ).toBeInTheDocument()
    expect(
      screen.getByText('غموض في آلية إنهاء التعاقد المبكر')
    ).toBeInTheDocument()
  })
})
