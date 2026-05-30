/* tests/RiskAnalysisDashboard.integration.test.tsx */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RiskAnalysisDashboard from '../src/pages/RiskAnalysisDashboard'

// The real RiskAnalysisDashboard has NO props — it uses internal MOCK_RISK_DATA.
// Text is rendered conditionally: isRtl ? 'arabic text' : 'english text'
// Language is driven by i18n.language — mock it as 'ar' for Arabic test.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'ar',
      exists: () => true,
    },
  }),
}))

// Internal MOCK_RISK_DATA constants used in assertions
const INTERNAL_DATA = {
  totalItems: 4,
  highCount: 3,
  mediumCount: 5,
  lowCount: 8,
  overallScore: '68%',
  contractName: 'عقد توريد برمجيات وتشغيل صيانة.pdf',
  items: [
    {
      id: 'r1',
      title: 'شرط جزائي مفتوح وبدون حد أقصى',
      severity: 'high',
    },
    {
      id: 'r2',
      title: 'غموض في آلية إنهاء التعاقد المبكر',
      severity: 'high',
    },
    {
      id: 'r3',
      title: 'قانون فض النزاعات خارج الاختصاص المحلي',
      severity: 'medium',
    },
    {
      id: 'r4',
      title: 'عدم تحديد وثائق التأمين المطلوبة',
      severity: 'low',
    },
  ],
}

describe('RiskAnalysisDashboard Integration Test (Full Data Flow)', () => {
  it('should render the full dashboard with header, score, and clause cards', () => {
    render(<RiskAnalysisDashboard />)

    // Header title (Arabic since language = 'ar')
    expect(screen.getByText('تحليل مخاطر العقد')).toBeInTheDocument()

    // Contract name
    expect(screen.getByText(INTERNAL_DATA.contractName)).toBeInTheDocument()

    // Overall score
    expect(screen.getByText(INTERNAL_DATA.overallScore)).toBeInTheDocument()

    // Filter tabs
    expect(
      screen.getByText(new RegExp(`كل الثغرات.*${INTERNAL_DATA.totalItems}`))
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`مخاطر عالية.*${INTERNAL_DATA.highCount}`))
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`متوسطة.*${INTERNAL_DATA.mediumCount}`))
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`منخفضة.*${INTERNAL_DATA.lowCount}`))
    ).toBeInTheDocument()

    // All clause card titles visible
    INTERNAL_DATA.items.forEach((item) => {
      expect(screen.getByText(item.title)).toBeInTheDocument()
    })
  })

  it('should filter cards correctly when clicking filter tabs', () => {
    render(<RiskAnalysisDashboard />)

    // By default all 4 items shown
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(
      INTERNAL_DATA.totalItems
    )

    // Click "high" filter — should show only 2 high-severity items
    const highFilterBtn = screen.getByText(/مخاطر عالية/)
    fireEvent.click(highFilterBtn)

    const highItems = INTERNAL_DATA.items.filter((i) => i.severity === 'high')
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(
      highItems.length
    )
    expect(screen.getByText('شرط جزائي مفتوح وبدون حد أقصى')).toBeInTheDocument()
    expect(
      screen.getByText('غموض في آلية إنهاء التعاقد المبكر')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('قانون فض النزاعات خارج الاختصاص المحلي')
    ).not.toBeInTheDocument()
  })
})
