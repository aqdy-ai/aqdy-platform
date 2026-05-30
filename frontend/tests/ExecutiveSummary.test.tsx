/* tests/ExecutiveSummary.test.tsx */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ExecutiveSummary from '../src/components/features/ExecutiveSummary'

// عمل Mock لمكتبة الترجمة i18next عشان نتحكم في النصوص اللي بتطلع
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key, // بترجع الـ Key نفسه عشان نسهل الـ Assertion
    i18n: { language: 'en' },
  }),
}))

describe('ExecutiveSummary Component', () => {
  const mockSummaryData = {
    overallRisk: 'high' as const,
    totalClauses: 12,
    riskyClausesCount: 4,
    summary: { ar: 'ملخص عربي', en: 'English Summary' },
  }
  const mockDuration = 2500 // 2.5 seconds

  it('renders correctly with the provided props', () => {
    render(
      <ExecutiveSummary
        summaryData={mockSummaryData}
        analysisDuration={mockDuration}
      />
    )

    // Title renders via t('dashboard.analysis_result') which returns the key
    expect(screen.getByText('dashboard.analysis_result')).toBeInTheDocument()

    // Duration: (2500 / 1000).toFixed(2) => '2.50'
    expect(screen.getByText('2.50')).toBeInTheDocument()

    // Risk badge via t('risk.high') which returns the key
    expect(screen.getByText('risk.high')).toBeInTheDocument()

    // Counters
    expect(screen.getByText('12')).toBeInTheDocument() // Total clauses
    expect(screen.getByText('4')).toBeInTheDocument() // Risky clauses
  })

  it('displays the English summary text when language is en', () => {
    render(
      <ExecutiveSummary
        summaryData={mockSummaryData}
        analysisDuration={mockDuration}
      />
    )
    // isRtl = false (language='en'), so renders summary.en
    expect(screen.getByText('English Summary')).toBeInTheDocument()
  })
})
