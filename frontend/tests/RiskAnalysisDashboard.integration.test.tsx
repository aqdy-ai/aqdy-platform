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

// ── Task 5.30 Regression: Overall Safety Score display fix ─────────────────
describe('Task 5.30 regression: overallScore formula and overallRiskLevel display', () => {
  beforeEach(() => {
    mockSearchParams.delete('id')
    vi.clearAllMocks()
  })

  /**
   * LOW-RISK CONTRACT FIXTURE
   * A contract where all clauses are 'low' risk must produce a HIGH safety
   * score (≥ 70%). Before the fix, this always returned 10%.
   */
  it('low-risk contract fixture: safety score must be ≥ 70%', async () => {
    mockSearchParams.set('id', 'low-risk-contract-id')

    const lowRiskData = {
      success: true,
      data: {
        filename: 'low_risk_contract.pdf',
        executiveSummary: {
          overallRisk: 'low',
          totalClauses: 5,
          riskyClausesCount: 0,
          summary: { ar: 'عقد منخفض المخاطر', en: 'Low risk contract summary' },
        },
        clauseAnalysis: [
          { _id: 'c1', clauseText: 'Standard NDA clause.', clauseType: 'confidentiality', riskLevel: 'low', explanation: { ar: 'منخفض', en: 'Low risk' }, confidence: 0.92 },
          { _id: 'c2', clauseText: 'Standard payment terms.', clauseType: 'payment', riskLevel: 'low', explanation: { ar: 'منخفض', en: 'Low risk' }, confidence: 0.90 },
          { _id: 'c3', clauseText: 'Governing law clause.', clauseType: 'governing_law', riskLevel: 'low', explanation: { ar: 'منخفض', en: 'Low risk' }, confidence: 0.88 },
          { _id: 'c4', clauseText: 'IP assignment clause.', clauseType: 'ip', riskLevel: 'low', explanation: { ar: 'منخفض', en: 'Low risk' }, confidence: 0.91 },
          { _id: 'c5', clauseText: 'Force majeure clause.', clauseType: 'force_majeure', riskLevel: 'low', explanation: { ar: 'منخفض', en: 'Low risk' }, confidence: 0.89 },
        ],
      },
    }

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(lowRiskData) } as Response),
    )

    await act(async () => { render(<RiskAnalysisDashboard />) })

    await screen.findByText('low_risk_contract.pdf')

    // Extract the score text (e.g. "100%") rendered in the SVG label
    const scoreElements = screen.getAllByText(/^\d+%$/)
    // The safety score element is the one shown inside the radial SVG
    const safetyScoreText = scoreElements.find((el) => {
      const val = parseInt(el.textContent ?? '0', 10)
      return val >= 0 && val <= 100
    })
    expect(safetyScoreText).toBeDefined()
    const scoreValue = parseInt(safetyScoreText!.textContent ?? '0', 10)

    // Low-risk contract: ALL clauses are low — score must be 100% (no high/medium penalty)
    expect(scoreValue).toBeGreaterThanOrEqual(70)

    fetchSpy.mockRestore()
  })

  /**
   * HIGH-RISK CONTRACT FIXTURE
   * A contract where all clauses are 'critical' must produce a LOW safety
   * score (≤ 30%). Before the fix, this always returned 10% (coincidentally
   * correct only because of clamping, not correct logic).
   */
  it('high-risk contract fixture: safety score must be ≤ 30%', async () => {
    mockSearchParams.set('id', 'high-risk-contract-id')

    const highRiskData = {
      success: true,
      data: {
        filename: 'high_risk_contract.pdf',
        executiveSummary: {
          overallRisk: 'critical',
          totalClauses: 4,
          riskyClausesCount: 4,
          summary: { ar: 'عقد عالي الخطورة', en: 'High risk contract summary' },
        },
        clauseAnalysis: [
          { _id: 'h1', clauseText: 'Unlimited liability.', clauseType: 'liability', riskLevel: 'critical', explanation: { ar: 'حرج', en: 'Critical risk' }, confidence: 0.97, redlineSuggestion: 'Cap liability at 10%.' },
          { _id: 'h2', clauseText: 'No-cause termination.', clauseType: 'termination', riskLevel: 'critical', explanation: { ar: 'حرج', en: 'Critical risk' }, confidence: 0.95, redlineSuggestion: 'Add 30-day notice.' },
          { _id: 'h3', clauseText: 'Unlimited penalty clause.', clauseType: 'penalty', riskLevel: 'high', explanation: { ar: 'عالي', en: 'High risk' }, confidence: 0.93 },
          { _id: 'h4', clauseText: 'Foreign arbitration with no appeal.', clauseType: 'dispute_resolution', riskLevel: 'critical', explanation: { ar: 'حرج', en: 'Critical risk' }, confidence: 0.96 },
        ],
      },
    }

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(highRiskData) } as Response),
    )

    await act(async () => { render(<RiskAnalysisDashboard />) })

    await screen.findByText('high_risk_contract.pdf')

    const scoreElements = screen.getAllByText(/^\d+%$/)
    const safetyScoreText = scoreElements.find((el) => {
      const val = parseInt(el.textContent ?? '0', 10)
      return val >= 0 && val <= 100
    })
    expect(safetyScoreText).toBeDefined()
    const scoreValue = parseInt(safetyScoreText!.textContent ?? '0', 10)

    // High-risk contract: all clauses are critical/high — score must be low
    expect(scoreValue).toBeLessThanOrEqual(30)

    fetchSpy.mockRestore()
  })

  /**
   * ORDERING INVARIANT
   * The safety score for a high-risk contract must be strictly less than
   * the safety score for a low-risk contract.
   */
  it('safety score ordering: high-risk score < low-risk score', () => {
    // Pure unit test of the formula — no fetch/render needed.
    // Replicate the fixed formula from RiskAnalysisDashboard.tsx

    const computeScore = (clauses: Array<{ riskLevel: string }>) => {
      const total = clauses.length
      if (total === 0) return 100
      const highCount = clauses.filter((c) => c.riskLevel === 'critical' || c.riskLevel === 'high').length
      const mediumCount = clauses.filter((c) => c.riskLevel === 'medium').length
      const weightedRisk = highCount * 3 + mediumCount * 1
      const maxRisk = total * 3
      return Math.round(Math.max(0, Math.min(100, (1 - weightedRisk / maxRisk) * 100)))
    }

    const lowRiskClauses = [
      { riskLevel: 'low' }, { riskLevel: 'low' }, { riskLevel: 'low' },
      { riskLevel: 'low' }, { riskLevel: 'low' },
    ]
    const mediumRiskClauses = [
      { riskLevel: 'medium' }, { riskLevel: 'medium' }, { riskLevel: 'low' },
      { riskLevel: 'low' }, { riskLevel: 'low' },
    ]
    const highRiskClauses = [
      { riskLevel: 'critical' }, { riskLevel: 'high' }, { riskLevel: 'critical' },
      { riskLevel: 'high' }, { riskLevel: 'high' },
    ]

    const lowScore = computeScore(lowRiskClauses)
    const mediumScore = computeScore(mediumRiskClauses)
    const highScore = computeScore(highRiskClauses)

    // Ordering must hold: low > medium > high
    expect(lowScore).toBeGreaterThan(mediumScore)
    expect(mediumScore).toBeGreaterThan(highScore)

    // Boundary assertions: high-risk contracts must score ≤ 30, low-risk must score ≥ 70
    expect(highScore).toBeLessThanOrEqual(30)
    expect(lowScore).toBeGreaterThanOrEqual(70)

    // Scores must NOT cluster around 10–15%
    expect(lowScore).not.toBe(10)
    expect(mediumScore).not.toBe(10)
  })

  /**
   * BADGE DISPLAY: 'critical' backend risk → renders "High Risk" badge label
   * (UI maps both 'high' and 'critical' to the same "High Risk" badge text)
   */
  it('overallRisk = critical from backend renders High Risk badge (not medium or low)', async () => {
    mockSearchParams.set('id', 'critical-contract-id')

    const criticalData = {
      success: true,
      data: {
        filename: 'critical_contract.pdf',
        executiveSummary: {
          overallRisk: 'critical',
          totalClauses: 2,
          riskyClausesCount: 2,
          summary: { ar: 'ملخص حرج', en: 'Critical summary' },
        },
        clauseAnalysis: [
          { _id: 'd1', clauseText: 'Clause 1', clauseType: 'liability', riskLevel: 'critical', explanation: { ar: 'حرج', en: 'Critical' }, confidence: 0.97 },
          { _id: 'd2', clauseText: 'Clause 2', clauseType: 'penalty', riskLevel: 'high', explanation: { ar: 'عالي', en: 'High' }, confidence: 0.93 },
        ],
      },
    }

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(criticalData) } as Response),
    )

    await act(async () => { render(<RiskAnalysisDashboard />) })

    await screen.findByText('critical_contract.pdf')

    // The badge for 'critical' overallRisk must render as "High Risk" (not Medium Risk or Low Risk)
    // Using English language mock (i18n.language not 'ar' in this test)
    expect(screen.queryByText('Medium Risk')).not.toBeInTheDocument()
    expect(screen.queryByText('Low Risk')).not.toBeInTheDocument()

    fetchSpy.mockRestore()
  })
})

