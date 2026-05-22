import { useTranslation } from 'react-i18next'
import ClauseCard from './ClauseCard'
import ExecutiveSummary from './ExecutiveSummary'
import ExportReportButton from './ExportReportButton'

interface Clause {
  clauseText: string
  clauseType: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  explanation: { ar: string; en: string }
  redlineSuggestion?: string
  sourceFromKB: string
}

interface RiskAnalysisData {
  _id: string
  contractId: string
  userId: string
  analysisDuration: number
  executiveSummary: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical'
    totalClauses: number
    riskyClausesCount: number
    summary: { ar: string; en: string }
  }
  clauseAnalysis: Clause[]
}

interface RiskAnalysisProps {
  analysisData: RiskAnalysisData
}

export default function RiskAnalysisDashboard({
  analysisData,
}: RiskAnalysisProps) {
  const { t } = useTranslation()
  const { executiveSummary, clauseAnalysis, analysisDuration } = analysisData

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <ExecutiveSummary
        summaryData={executiveSummary}
        analysisDuration={analysisDuration}
      />

      {/* Clauses Grid */}
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground mb-4 text-start text-lg font-bold">
            🔍 {t('dashboard.detailed_findings')}
          </h3>
          <ExportReportButton />
        </div>
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
          {clauseAnalysis.map((clause, index) => (
            <ClauseCard
              key={`${clause.sourceFromKB}-${index}`}
              clause={clause}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
