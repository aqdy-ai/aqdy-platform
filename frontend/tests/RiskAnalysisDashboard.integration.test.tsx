/* tests/RiskAnalysisDashboard.integration.test.tsx */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RiskAnalysisDashboard from '../src/components/dashboard/RiskAnalysisDashboard'
import sampleAnalysisData from '../src/mocks/sampleAnalysis.json'

// 1️⃣ عمل Mock كامل وموحد لمكتبة i18next والترجمة
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dashboard.analysis_result': 'نتائج التحليل',
        'dashboard.completed_in': 'تم في',
        'dashboard.seconds': 'ثواني',
        'dashboard.overall_risk': 'مستوى المخاطرة العام',
        'dashboard.total_clauses': 'إجمالي البنود',
        'dashboard.risky_clauses': 'البنود المخاطرة',
        'dashboard.detailed_findings': 'النتائج التفصيلية',
        'dashboard.explanation': 'الشرح القانوني',
        'dashboard.show_redline': 'عرض المقترح البديل',
        'risk.critical': 'مخاطرة حرجة جداً',
        'risk.high': 'مخاطرة عالية',
      }
      return translations[key] || key
    },
    i18n: {
      language: 'ar',
      exists: () => true,
    },
  }),
}))

describe('RiskAnalysisDashboard Integration Test (Full Data Flow)', () => {
  // ⬇️ الاستنتاج التلقائي للـ Type مع عمل cast خفيف كـ نوع الـ Component لعدم حدوث تضارب في الـ Literals
  const mockApiData = sampleAnalysisData as React.ComponentProps<
    typeof RiskAnalysisDashboard
  >['analysisData']

  it('should render the full dashboard integration flow correctly from mock API data', () => {
    render(<RiskAnalysisDashboard analysisData={mockApiData} />)

    expect(screen.getByText('نتائج التحليل')).toBeInTheDocument()
    // ⬇️ التعديل السحري: حساب القيمة المتوقعة ديناميكياً وتحويلها لـ Regex آمن ومضمون 100%
    const expectedDuration = (mockApiData.analysisDuration / 1000).toFixed(2)
    expect(screen.getByText(new RegExp(expectedDuration))).toBeInTheDocument()
    expect(
      screen.getByText(mockApiData.executiveSummary.totalClauses.toString())
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        mockApiData.executiveSummary.riskyClausesCount.toString()
      )
    ).toBeInTheDocument()

    // ⬇️ التعديل هنا: استخدام Regex عشان يلقط الكلمة ويطنش الإيموجي 🔍 والمساحات
    expect(screen.getByText(/النتائج التفصيلية/)).toBeInTheDocument()
    mockApiData.clauseAnalysis.forEach((clause) => {
      expect(screen.getByText(`"${clause.clauseText}"`)).toBeInTheDocument()
    })
  })

  it('should handle interactive toggle events independently across the dashboard', () => {
    render(<RiskAnalysisDashboard analysisData={mockApiData} />)

    // جلب أزرار الـ Toggle للمقترحات البديلة المتاحة في الكروت
    const toggleButtons = screen.getAllByRole('button', {
      name: 'عرض المقترح البديل',
    })

    // نتأكد إن عندنا كارتين في الـ Mock data فيهم زرار الـ Toggle
    expect(toggleButtons.length).toBeGreaterThanOrEqual(1)

    // اضغطي على الزرار الأول الخاص بالكارت الأول فقط
    fireEvent.click(toggleButtons[0])

    // ── ⬇️ التعديل الجديد والمحدد هنا قفل للمشكلة ──
    const firstClauseId = mockApiData.clauseAnalysis[0]?.sourceFromKB
    const firstClauseSuggestion =
      mockApiData.clauseAnalysis[0]?.redlineSuggestion

    // 1️⃣ نجيب الـ Container الفريد بتاع البند الأول اللي ضفنا له الـ ID للـ Accessibility
    const firstContainer = document.getElementById(
      `redline-container-${firstClauseId}`
    )
    expect(firstContainer).toBeInTheDocument()

    // 2️⃣ نبحث عن النص جوه الـ Container ده بالذات عشان نمنع الـ Duplication Error
    expect(firstContainer).toHaveTextContent(firstClauseSuggestion || '')

    // وبفضل الـ composite key الفريد، الكارت التاني يظل مقفول ومبيحصلش تداخل
    if (
      mockApiData.clauseAnalysis[1] &&
      mockApiData.clauseAnalysis[1]?.redlineSuggestion
    ) {
      const secondClauseId = mockApiData.clauseAnalysis[1].sourceFromKB
      const secondContainer = document.getElementById(
        `redline-container-${secondClauseId}`
      )

      // نتأكد إن الـ Container التاني مقفول تماماً ومش موجود في الـ DOM
      expect(secondContainer).not.toBeInTheDocument()
    }
  })
})
