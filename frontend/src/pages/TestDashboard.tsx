import RiskAnalysisDashboard from '@/components/dashboard/RiskAnalysisDashboard'
import sampleData from '@/mocks/sampleAnalysis.json'

// عمل Type Casting آمن يتوافق مع الـ Props المتوقعة للمكون
const verifiedAnalysisData = sampleData as React.ComponentProps<
  typeof RiskAnalysisDashboard
>['analysisData']

export default function TestPage() {
  return (
    <div className="bg-background min-h-screen py-8">
      <RiskAnalysisDashboard analysisData={verifiedAnalysisData} />
    </div>
  )
}
