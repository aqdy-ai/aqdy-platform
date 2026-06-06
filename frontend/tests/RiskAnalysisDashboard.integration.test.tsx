/* tests/RiskAnalysisDashboard.integration.test.tsx */
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RiskAnalysisDashboard from '../src/pages/RiskAnalysisDashboard'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'ar',
      exists: () => true,
    },
  }),
}))

const mockSearchParams = new URLSearchParams()

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, () => {}],
}))

describe('RiskAnalysisDashboard Integration Test (Full Data Flow)', () => {
  beforeEach(() => {
    mockSearchParams.delete('id')
    vi.clearAllMocks()
  })

  it('should render the redesigned dashboard with executive summary, negotiation priority, and table rows', () => {
    render(<RiskAnalysisDashboard />)

    // Header title (Arabic)
    expect(screen.getByText('تحليل مخاطر العقد')).toBeInTheDocument()

    // Executive summary section title
    expect(screen.getByText('النتائج والملخص العام للتحليل')).toBeInTheDocument()

    // Estimated negotiation priority label
    expect(screen.getByText('أولوية تفاوضية: عالية')).toBeInTheDocument()

    // Overall Risk badge (High risk)
    expect(screen.getByText('مخاطر عالية')).toBeInTheDocument()

    // Check table headers
    expect(screen.getByText('البند')).toBeInTheDocument()
    expect(screen.getByText('درجة الخطورة')).toBeInTheDocument()

    // Ensure all 4 mock items are rendered in the table rows
    expect(screen.getByText('شرط جزائي مفتوح وبدون حد أقصى')).toBeInTheDocument()
    expect(screen.getByText('غموض في آلية إنهاء التعاقد المبكر')).toBeInTheDocument()
    expect(screen.getByText('قانون فض النزاعات خارج الاختصاص المحلي')).toBeInTheDocument()
    expect(screen.getByText('عدم تحديد وثائق التأمين المطلوبة')).toBeInTheDocument()

    // Verify keyboard focusability and ARIA accessibility attributes
    const firstRowElement = screen.getByText('شرط جزائي مفتوح وبدون حد أقصى').closest('[role="button"]')!
    expect(firstRowElement).toHaveAttribute('tabIndex', '0')
    expect(firstRowElement).toHaveAttribute('aria-expanded', 'false')
    expect(firstRowElement).toHaveAttribute('aria-controls', 'clause-details-r1')

    // Verify risk level color mapping (High = red, Medium = orange, Low = green/emerald)
    const highBadge = screen.getAllByText('عالية')[0]
    const mediumBadge = screen.getByText('متوسطة')
    const lowBadge = screen.getByText('منخفضة')

    expect(highBadge.className).toContain('text-red-500')
    expect(mediumBadge.className).toContain('text-orange-500')
    expect(lowBadge.className).toContain('text-emerald-500')
  })

  it('should toggle row expansion and enforce accordion behavior', () => {
    render(<RiskAnalysisDashboard />)

    const firstRowExp = 'هذا البند يفرض التزامات مالية غير محدودة قد تؤدي لتعثر الطرف الثاني ماليًا.'
    const secondRowExp = 'الإنهاء الفوري بدون سبب يضر بالاستقرار التشغيلي والتخطيط المالي للطرف الثاني.'

    // Initially, explanation appears exactly once (in the table row one-line summary)
    expect(screen.getAllByText(firstRowExp)).toHaveLength(1)
    expect(screen.getAllByText(secondRowExp)).toHaveLength(1)

    // Find first row title and click it
    const firstRow = screen.getByText('شرط جزائي مفتوح وبدون حد أقصى')
    fireEvent.click(firstRow)

    // After expansion, it should appear twice (one in the table row, one in the details panel)
    expect(screen.getAllByText(firstRowExp)).toHaveLength(2)
    expect(screen.getByText('kb_penalty_cap_01')).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()

    // Expand second row
    const secondRow = screen.getByText('غموض في آلية إنهاء التعاقد المبكر')
    fireEvent.click(secondRow)

    // Accordion enforcement: Second row should be expanded, first row collapsed
    expect(screen.getAllByText(secondRowExp)).toHaveLength(2)
    expect(screen.getAllByText(firstRowExp)).toHaveLength(1)

    // Click second row again to collapse it
    fireEvent.click(secondRow)
    expect(screen.getAllByText(secondRowExp)).toHaveLength(1)
  })

  it('should support keyboard accessibility for expand/collapse (Enter & Space)', () => {
    render(<RiskAnalysisDashboard />)

    const firstRowExp = 'هذا البند يفرض التزامات مالية غير محدودة قد تؤدي لتعثر الطرف الثاني ماليًا.'
    const firstRow = screen.getByText('شرط جزائي مفتوح وبدون حد أقصى').closest('[role="button"]')!

    // Enter key triggers expand
    fireEvent.keyDown(firstRow, { key: 'Enter' })
    expect(screen.getAllByText(firstRowExp)).toHaveLength(2)

    // Space key triggers collapse
    fireEvent.keyDown(firstRow, { key: ' ' })
    expect(screen.getAllByText(firstRowExp)).toHaveLength(1)
  })

  it('should handle jump links in executive summary to filter/scroll to rows', () => {
    render(<RiskAnalysisDashboard />)

    // Click "High" jump link
    const highLink = screen.getByText(/3 عالية/i)
    fireEvent.click(highLink)

    // Table should filter to show only high severity items (2 items)
    expect(screen.getByText('شرط جزائي مفتوح وبدون حد أقصى')).toBeInTheDocument()
    expect(screen.getByText('غموض في آلية إنهاء التعاقد المبكر')).toBeInTheDocument()
    expect(screen.queryByText('قانون فض النزاعات خارج الاختصاص المحلي')).not.toBeInTheDocument()
  })

  it('should render dynamic loading and finished states when contractId is provided', async () => {
    mockSearchParams.set('id', '507f1f77bcf86cd799439011')

    const mockAnalysisData = {
      success: true,
      data: {
        filename: 'dynamic_contract.pdf',
        status: 'completed',
        executiveSummary: {
          overallRisk: 'high',
          totalClauses: 1,
          riskyClausesCount: 1,
          summary: {
            ar: 'ملخص ديناميكي من الذكاء الاصطناعي',
            en: 'Dynamic AI Summary',
          },
        },
        clauseAnalysis: [
          {
            _id: 'c1',
            clauseText: 'نص الشرط الديناميكي الأول',
            clauseType: 'Liability',
            riskLevel: 'high',
            explanation: { ar: 'تفسير الشرط الديناميكي المفسر', en: 'Clause Explanation' },
            redlineSuggestion: 'اقتراح التعديل البديل',
            confidence: 0.92,
            sourceFromKB: 'kb_ref_dynamic',
          },
        ],
      },
    }

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAnalysisData),
      } as Response)
    )

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    await act(async () => {
      render(<RiskAnalysisDashboard />)
    })

    // Wait for the async state to resolve to loaded state
    const dynamicContractText = await screen.findByText('dynamic_contract.pdf')
    expect(dynamicContractText).toBeInTheDocument()
    expect(screen.getByText('ملخص ديناميكي من الذكاء الاصطناعي')).toBeInTheDocument()

    // Initially one occurrence in table row
    expect(screen.getAllByText('تفسير الشرط الديناميكي المفسر')).toHaveLength(1)

    // Click title
    fireEvent.click(screen.getByText('auth.errors.Liability_title'))

    // The explanation should now appear twice (expanded)
    expect(screen.getAllByText('تفسير الشرط الديناميكي المفسر')).toHaveLength(2)
    expect(screen.getByText('kb_ref_dynamic')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()

    fetchSpy.mockRestore()
  })
})
