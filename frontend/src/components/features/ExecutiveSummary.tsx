import { useTranslation } from 'react-i18next'
import {
  FileText,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'

interface ExecutiveSummaryProps {
  summaryData: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical'
    totalClauses: number
    riskyClausesCount: number
    summary: { ar: string; en: string }
  }
  analysisDuration: number
}

// مصفوفة الألوان المخصصة لشارة المخاطر العامة (Overall Risk Badge)
const overallRiskStyles = {
  critical:
    'bg-orange-950 text-orange-200 border-orange-800 dark:bg-orange-950 dark:text-orange-300',
  high: 'bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-950/40 dark:text-red-400',
  medium:
    'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400',
  low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400',
} as const

export default function ExecutiveSummary({
  summaryData,
  analysisDuration,
}: ExecutiveSummaryProps) {
  const { i18n, t } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const tts = useSpeechSynthesis()

  const { overallRisk, totalClauses, riskyClausesCount, summary } = summaryData
  const durationSeconds = (analysisDuration / 1000).toFixed(2)
  const summaryText = isRtl ? summary.ar : summary.en

  return (
    <div className="bg-card border-muted relative overflow-hidden rounded-2xl border p-6 text-start shadow-sm transition-all duration-200">
      {/* Indicator line based on risk level */}
      <div
        className={cn(
          'absolute start-0 top-0 h-full w-1.5',
          overallRisk === 'critical' || overallRisk === 'high'
            ? 'bg-destructive'
            : 'bg-amber-500'
        )}
      />

      {/* Header Info */}
      <div className="border-muted mb-5 flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/5 border-primary/10 rounded-lg border p-2">
            <BarChart3 className="text-primary h-5 w-5" />
          </div>
          <div>
            <h2 className="text-foreground text-lg leading-none font-bold">
              {t('dashboard.analysis_result')}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('dashboard.completed_in')}{' '}
              <span className="font-mono font-medium">{durationSeconds}</span>{' '}
              {t('dashboard.seconds')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium">
            {t('dashboard.overall_risk')}:
          </span>
          <span
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-bold tracking-wide uppercase shadow-sm',
              overallRiskStyles[overallRisk]
            )}
          >
            {t(`risk.${overallRisk}`)}
          </span>
        </div>
      </div>

      {/* Grid Stats Counters */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Total Clauses Counter */}
        <div className="bg-muted/30 border-muted/70 flex items-center gap-4 rounded-xl border p-4">
          <div className="bg-background text-muted-foreground rounded-lg border p-2.5">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <span className="text-muted-foreground mb-0.5 block text-xs font-medium">
              {t('dashboard.total_clauses')}
            </span>
            <span className="text-foreground font-mono text-2xl leading-tight font-bold">
              {totalClauses}
            </span>
          </div>
        </div>

        {/* Risky Clauses Counter */}
        <div
          className={cn(
            'flex items-center gap-4 rounded-xl border p-4',
            riskyClausesCount > 0
              ? 'bg-destructive/5 border-destructive/10 text-destructive'
              : 'border-emerald-500/10 bg-emerald-500/5 text-emerald-600'
          )}
        >
          <div className="bg-background rounded-lg border p-2.5">
            {riskyClausesCount > 0 ? (
              <AlertCircle className="text-destructive h-5 w-5" />
            ) : (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            )}
          </div>
          <div>
            <span className="text-muted-foreground mb-0.5 block text-xs font-medium">
              {t('dashboard.risky_clauses')}
            </span>
            <span className="font-mono text-2xl leading-tight font-bold">
              {riskyClausesCount}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Ai Text Summary Block */}
      <div className="bg-muted/40 border-muted/50 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-muted-foreground mb-1.5 text-xs font-bold tracking-wider uppercase">
            🤖 {t('dashboard.ai_summary_title')}
          </h3>
          {typeof window !== 'undefined' && window.speechSynthesis && (
            <button
              onClick={() => tts.toggle(summaryText, isRtl ? 'ar-EG' : 'en-US')}
              aria-label={
                tts.isPlaying
                  ? t('chat.stop_reading', 'Stop reading')
                  : t('chat.read_aloud', 'Read aloud')
              }
              title={
                tts.isPlaying
                  ? t('chat.stop_reading', 'Stop reading')
                  : t('chat.read_aloud', 'Read aloud')
              }
              className="text-muted-foreground hover:text-foreground hover:bg-muted/80 focus:ring-primary -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all focus:ring-1 focus:outline-none"
            >
              {tts.isPlaying ? (
                <VolumeX size={16} className="text-destructive animate-pulse" />
              ) : (
                <Volume2 size={16} />
              )}
            </button>
          )}
        </div>
        <p className="text-foreground/90 text-sm leading-relaxed font-medium">
          {summaryText}
        </p>
      </div>
    </div>
  )
}
