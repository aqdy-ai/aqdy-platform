import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { riskColors, getConfidenceMeta, cn } from '@/lib/utils'

interface ClauseCardProps {
  clause: {
    clauseText: string
    clauseType: string
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    confidence: number
    explanation: { ar: string; en: string }
    redlineSuggestion?: string
    sourceFromKB: string
  }
}

export default function ClauseCard({ clause }: ClauseCardProps) {
  const { i18n, t } = useTranslation()
  const [showRedline, setShowRedline] = useState(false)
  const isRtl = i18n.language === 'ar'

  const currentExplanation = isRtl
    ? clause.explanation.ar
    : clause.explanation.en
  const confidenceMeta = getConfidenceMeta(clause.confidence)

  return (
    <div
      className={cn(
        'bg-card rounded-xl border p-5 text-start shadow-sm transition-all duration-200'
      )}
    >
      {/* Header: Risk & Type */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-semibold uppercase',
            riskColors[clause.riskLevel]
          )}
        >
          {t(`risk.${clause.riskLevel}`)}
        </span>
        <span className="text-muted-foreground bg-muted rounded-md px-2.5 py-1 text-xs font-medium">
          {clause.clauseType}
        </span>
      </div>

      {/* Original Clause Text */}
      <div className="bg-muted/40 border-muted mb-4 rounded-lg border border-dashed p-4">
        <p className="text-foreground/90 font-mono text-sm leading-relaxed">
          "{clause.clauseText}"
        </p>
      </div>

      {/* Explanation */}
      <div className="mb-4">
        <h4 className="text-muted-foreground mb-1 text-xs font-bold tracking-wider uppercase">
          {t('dashboard.explanation')}
        </h4>
        <p className="text-foreground/80 text-sm leading-relaxed">
          {currentExplanation}
        </p>
      </div>

      {/* Footer Meta: Confidence & KB */}
      <div className="border-muted/60 text-muted-foreground flex flex-col justify-between gap-3 border-t pt-4 text-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span>
            {t('dashboard.confidence')}: {(clause.confidence * 100).toFixed(0)}%
          </span>
          <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
            <div
              className={cn('h-full', confidenceMeta.color)}
              style={{ width: `${clause.confidence * 100}%` }}
            />
          </div>
          {clause.confidence >= 0.9 ? (
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          )}
        </div>
        <span className="bg-muted/80 rounded px-2 py-0.5 font-mono text-[10px]">
          ID: {clause.sourceFromKB}
        </span>
      </div>

      {/* Redline Toggle Button */}
      {clause.redlineSuggestion &&
        (clause.riskLevel === 'high' || clause.riskLevel === 'critical') && (
          <button
            onClick={() => setShowRedline(!showRedline)}
            className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/10 browser-default mt-4 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-colors"
          >
            {showRedline ? (
              <>
                {t('dashboard.hide_redline')}{' '}
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                {t('dashboard.show_redline')}{' '}
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}

      {/* Redline Suggestion Content */}
      {showRedline && clause.redlineSuggestion && (
        <div className="animate-in fade-in slide-in-from-top-2 mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 duration-200">
          <h5 className="mb-1.5 text-xs font-bold text-emerald-600 uppercase dark:text-emerald-400">
            ✨ {t('dashboard.suggested_safer')}
          </h5>
          <p className="text-foreground/90 bg-background/50 mb-2 rounded border border-emerald-500/10 p-3 font-mono text-sm leading-relaxed">
            {clause.redlineSuggestion}
          </p>
        </div>
      )}
    </div>
  )
}
