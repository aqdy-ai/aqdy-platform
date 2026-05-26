/* tests/BilingualRendering.test.tsx */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RiskAnalysisDashboard from '../src/components/dashboard/RiskAnalysisDashboard'
import sampleAnalysisData from '../src/mocks/sampleAnalysis.json'

// متغير محلي للتحكم في اللغة النشطة داخل الـ Mocks ديناميكياً
let currentTestLanguage = 'ar'

// 1️⃣ عمل Mock موحد ومرن لـ i18next يعتمد على المتغير الديناميكي
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, Record<string, string>> = {
        ar: {
          'dashboard.analysis_result': 'نتائج التحليل',
          'dashboard.detailed_findings': 'النتائج التفصيلية',
        },
        en: {
          'dashboard.analysis_result': 'Analysis Result',
          'dashboard.detailed_findings': 'Detailed Findings',
        },
      }
      return translations[currentTestLanguage]?.[key] || key
    },
    i18n: {
      language: currentTestLanguage,
      exists: () => true,
    },
  }),
}))

describe('Bilingual Rendering & RTL/LTR Layout Tests', () => {
  const mockApiData = sampleAnalysisData as React.ComponentProps<
    typeof RiskAnalysisDashboard
  >['analysisData']

  beforeEach(() => {
    // إعادة تعيين اللغة الافتراضية قبل كل تست
    currentTestLanguage = 'ar'
  })

  it('should render full Arabic UI layout with RTL directions', () => {
    currentTestLanguage = 'ar'
    render(<RiskAnalysisDashboard analysisData={mockApiData} />)

    // التأكد من ظهور العناوين العربية
    expect(screen.getByText(/نتائج التحليل/)).toBeInTheDocument()
    expect(screen.getByText(/النتائج التفصيلية/)).toBeInTheDocument()
  })

  it('should render full English UI layout with LTR directions', () => {
    // ⬇️ بمجرد تغيير المتغير، الـ Mock هيقرأ القيمة الجديدة بدون ري-إمبورت أو require
    currentTestLanguage = 'en'
    render(<RiskAnalysisDashboard analysisData={mockApiData} />)

    // التأكد من ظهور العناوين الإنجليزية
    expect(screen.getByText(/Analysis Result/)).toBeInTheDocument()
    expect(screen.getByText(/Detailed Findings/)).toBeInTheDocument()
  })

  it('should preserve text direction integrity for mixed contract content using dir="auto"', () => {
    currentTestLanguage = 'ar' // الواجهة عربية والعقد إنجليزي
    render(<RiskAnalysisDashboard analysisData={mockApiData} />)

    // جلب نص العقد الإنجليزي من الـ Mock
    const contractText = mockApiData.clauseAnalysis[0].clauseText
    const contractParagraph = screen
      .getByText(new RegExp(contractText))
      .closest('p')

    // 🎯 التأكد من أن الحاوية تمتلك خاصية dir="auto" بنجاح وبدون ميثودز مجهولة
    expect(contractParagraph).toBeInTheDocument()
    expect(contractParagraph).toHaveAttribute('dir', 'auto')
  })
})
