import { useTranslation } from 'react-i18next'
import ClauseCard from './ClauseCard'

// 1. تعريف الـ Interfaces بدقة بناءً على الـ Model المستلم
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
  const { i18n, t } = useTranslation()
  const isRtl = i18n.language === 'ar'

  const { executiveSummary, clauseAnalysis, analysisDuration } = analysisData
  const durationSeconds = (analysisDuration / 1000).toFixed(2)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Executive Summary Dashboard Card */}
      <div className="bg-card border-muted relative overflow-hidden rounded-2xl border p-6 text-start shadow-md">
        <div className="bg-destructive absolute start-0 top-0 h-full w-2" />

        <div className="mb-4 flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold">
              {t('dashboard.analysis_result')}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t('dashboard.completed_in')} {durationSeconds}{' '}
              {t('dashboard.seconds')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {t('dashboard.overall_risk')}:
            </span>
            <span className="rounded-full bg-red-500 px-4 py-1.5 text-sm font-bold tracking-wide text-white uppercase shadow-sm">
              {t(`risk.${executiveSummary.overallRisk}`)}
            </span>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="bg-muted/50 border-muted rounded-xl border p-4 text-start">
            <span className="text-muted-foreground mb-1 block text-xs font-medium">
              {t('dashboard.total_clauses')}
            </span>
            <span className="text-foreground text-2xl font-bold">
              {executiveSummary.totalClauses}
            </span>
          </div>
          <div className="bg-destructive/5 border-destructive/10 rounded-xl border p-4 text-start">
            <span className="text-destructive mb-1 block text-xs font-medium">
              {t('dashboard.risky_clauses')}
            </span>
            <span className="text-destructive text-2xl font-bold">
              {executiveSummary.riskyClausesCount}
            </span>
          </div>
        </div>

        {/* Bilingual Summary Text */}
        <div className="bg-muted/30 rounded-xl border p-4">
          <p className="text-foreground/90 text-sm leading-relaxed">
            {isRtl ? executiveSummary.summary.ar : executiveSummary.summary.en}
          </p>
        </div>
      </div>

      {/* Clauses Grid */}
      <div>
        <h3 className="text-foreground mb-4 text-start text-lg font-bold">
          🔍 {t('dashboard.detailed_findings')}
        </h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {clauseAnalysis.map((clause, index) => (
            <ClauseCard key={index} clause={clause} />
          ))}
        </div>
      </div>
    </div>
  )
}
