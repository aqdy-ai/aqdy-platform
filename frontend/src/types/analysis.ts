export interface IClauseAnalysis {
  _id?: string
  clauseText: string
  clauseType: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'unknown'
  explanation: { ar: string; en: string }
  redlineSuggestion?: string
  confidence?: number
  sourceFromKB?: string
}

export interface IRiskAnalysis {
  filename?: string
  executiveSummary?: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical'
    totalClauses: number
    riskyClausesCount: number
    summary: { ar: string; en: string }
  }
  clauseAnalysis: IClauseAnalysis[]
  status?: string
}

/** Props for the RiskAnalysisDashboard component */
export type RiskAnalysisDashboardProps = Record<string, never>
