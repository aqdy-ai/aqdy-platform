{
  /* tests/ExecutiveSummary.test.tsx */
}
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ExecutiveSummary from '../src/components/dashboard/ExecutiveSummary'

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

    // التأكد من عرض عنوان التقرير
    expect(screen.getByText('dashboard.analysis_result')).toBeInTheDocument()

    // التأكد من تحويل الوقت لثواني (2500ms -> 2.52) بناءً على الـ .toFixed(2)
    expect(screen.getByText('2.50')).toBeInTheDocument()

    // التأكد من عرض الـ Risk Level والـ Counters
    expect(screen.getByText('risk.high')).toBeInTheDocument()
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
    expect(screen.getByText('English Summary')).toBeInTheDocument()
  })
})
