import { useTranslation } from 'react-i18next'
import { ArrowLeftRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RedlineComparisonProps {
  originalText: string
  suggestedText: string
  riskLevel: 'high' | 'critical' | 'low' | 'medium'
}

export default function RedlineComparison({
  originalText,
  suggestedText,
  riskLevel,
}: RedlineComparisonProps) {
  const { t } = useTranslation()

  return (
    <div className="animate-in fade-in slide-in-from-top-2 mt-4 space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 duration-200">
      {/* Component Title & Icon */}
      <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-3">
        <ArrowLeftRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <h5 className="text-sm font-bold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
          ✨ {t('dashboard.suggested_safer')}
        </h5>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Original Text Column */}
        <div className="bg-background/40 flex flex-col rounded-lg border border-dashed border-red-500/20 p-4 text-start">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-red-500">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{t('dashboard.original_risky')}</span>
          </div>
          <p
            className={cn(
              'font-mono text-sm leading-relaxed',
              riskLevel === 'critical'
                ? 'text-orange-300/90'
                : 'text-foreground/80'
            )}
          >
            "{originalText}"
          </p>
        </div>

        {/* Suggested Text Column */}
        <div className="bg-background/60 flex flex-col rounded-lg border border-emerald-500/20 p-4 text-start shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t('dashboard.suggested_safer_label')}</span>
          </div>
          <p className="text-foreground/90 font-mono text-sm leading-relaxed font-medium">
            {suggestedText}
          </p>
        </div>
      </div>

      {/* Why it's better Section (UX Touch based on design docs) */}
      <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/10 p-3.5 text-start">
        <h6 className="mb-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          💡 {t('dashboard.why_better')}
        </h6>
        <p className="text-xs leading-relaxed text-emerald-700/90 dark:text-emerald-400/90">
          {t('dashboard.why_better_desc')}
        </p>
      </div>
    </div>
  )
}
