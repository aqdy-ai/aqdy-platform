import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  BookOpen,
} from 'lucide-react'
import { riskColors, getConfidenceMeta, cn } from '@/lib/utils'
import RedlineComparison from './RedlineComparison'

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
        'bg-card border-muted flex flex-col rounded-xl border p-5 text-start shadow-sm transition-all duration-300 hover:shadow-md'
      )}
    >
      {/* Header: Risk & Type */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-semibold uppercase transition-colors',
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
        <p
          className="text-foreground/90 font-mono text-sm leading-relaxed"
          dir="auto"
        >
          {`"${clause.clauseText}"`}
        </p>
      </div>

      {/* Explanation */}
      <div className="mb-4 flex-grow">
        <h4 className="text-muted-foreground mb-1 text-xs font-bold tracking-wider uppercase">
          {t('dashboard.explanation')}
        </h4>
        <p className="text-foreground/80 text-sm leading-relaxed">
          {currentExplanation}
        </p>
      </div>

      {/* Footer Meta: Confidence & KB Source Attribution */}
      <div className="border-muted/60 text-muted-foreground flex flex-col justify-between gap-4 border-t pt-4 text-xs sm:flex-row sm:items-center">
        {/* Left Side: Confidence Score */}
        <div className="flex items-center gap-2">
          <span>
            {t('dashboard.confidence')}: {(clause.confidence * 100).toFixed(0)}%
          </span>
          <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
            <div
              className={cn(
                'h-full transition-all duration-500',
                confidenceMeta.color
              )}
              style={{ width: `${clause.confidence * 100}%` }}
            />
          </div>
          {clause.confidence >= 0.9 ? (
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          )}
        </div>

        {/* Right Side: KB Source Attribution Display */}
        <div
          className="bg-primary/5 border-primary/10 text-primary hover:bg-primary/10 flex cursor-help items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium transition-colors"
          title={t('dashboard.kb_source_tooltip')}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>{t('dashboard.kb_source')}:</span>
          <span className="font-mono text-[11px] font-semibold tracking-tight opacity-90">
            {clause.sourceFromKB.replace('clause_', '#')}
          </span>
        </div>
      </div>

      {/* 🚀 Redline Toggle Button (Show/Hide) */}
      {/* Redline Toggle Button */}
      {clause.redlineSuggestion && (
        <button
          onClick={() => setShowRedline(!showRedline)}
          className={cn(
            'browser-default focus:ring-primary/20 mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-all duration-200 focus:ring-2 focus:outline-none',
            showRedline
              ? 'bg-destructive/5 text-destructive border-destructive/20 hover:bg-destructive/10'
              : 'bg-primary/5 text-primary border-primary/10 hover:bg-primary/10'
          )}
          aria-expanded={showRedline}
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

      {/* 🚀 التعديل السحري هنا: الـ State معزولة صراحة ومستحيل كارد يأثر على التاني */}
      {showRedline && clause.redlineSuggestion && (
        <div className="animate-in fade-in slide-in-from-top-3 w-full duration-300 ease-out">
          <RedlineComparison
            originalText={clause.clauseText}
            suggestedText={clause.redlineSuggestion}
            riskLevel={clause.riskLevel}
            clauseType={clause.clauseType}
          />
        </div>
      )}
    </div>
  )
}
