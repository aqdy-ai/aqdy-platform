import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import feedbackApi, { type FeedbackTargetType } from '@/services/feedbackApi'
import ReportIssueDialog from './ReportIssueDialog'

interface ThumbsFeedbackProps {
  targetType: FeedbackTargetType
  targetId: string
  contractId?: string
  analysisId?: string
  className?: string
}

export default function ThumbsFeedback({
  targetType,
  targetId,
  contractId,
  analysisId,
  className,
}: ThumbsFeedbackProps) {
  const { t } = useTranslation()
  const [selection, setSelection] = useState<'up' | 'down' | null>(null)
  const [loading, setLoading] = useState<'up' | 'down' | null>(null)
  const [showThankYou, setShowThankYou] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)

  const handleFeedback = useCallback(
    async (type: 'up' | 'down') => {
      if (loading || selection) return
      setLoading(type)

      try {
        const res = await feedbackApi.submit({
          targetType,
          targetId,
          feedbackType: type === 'up' ? 'thumbs_up' : 'thumbs_down',
          contractId,
          analysisId,
        })

        if (res.data.success) {
          setSelection(type)
          setShowThankYou(true)
          setTimeout(() => setShowThankYou(false), 3000)

          if (type === 'down') {
            setTimeout(() => setReportDialogOpen(true), 500)
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(null)
      }
    },
    [targetType, targetId, contractId, analysisId, loading, selection]
  )

  return (
    <>
      <div
        className={cn('flex items-center gap-1', className)}
        role="group"
        aria-label={t('feedback.aria_label', 'Rate this response')}
      >
        {showThankYou ? (
          <span
            className="animate-fade-in px-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
            role="status"
            aria-live="polite"
          >
            {t('feedback.thank_you', 'Thank you for your feedback!')}
          </span>
        ) : (
          <>
            <button
              onClick={() => handleFeedback('up')}
              disabled={!!loading || !!selection}
              aria-label={t('feedback.thumbs_up', 'Thumbs up - helpful')}
              aria-pressed={selection === 'up'}
              className={cn(
                'text-muted-foreground focus:ring-primary flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all hover:text-emerald-600 focus:ring-1 focus:outline-none disabled:pointer-events-none disabled:opacity-40',
                selection === 'up' && 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {loading === 'up' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ThumbsUp size={14} />
              )}
            </button>
            <button
              onClick={() => handleFeedback('down')}
              disabled={!!loading || !!selection}
              aria-label={t(
                'feedback.thumbs_down',
                'Thumbs down - not helpful'
              )}
              aria-pressed={selection === 'down'}
              className={cn(
                'text-muted-foreground focus:ring-primary flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all hover:text-red-500 focus:ring-1 focus:outline-none disabled:pointer-events-none disabled:opacity-40',
                selection === 'down' && 'text-red-500 dark:text-red-400'
              )}
            >
              {loading === 'down' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ThumbsDown size={14} />
              )}
            </button>
          </>
        )}
      </div>

      <ReportIssueDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        targetType={targetType}
        targetId={targetId}
        contractId={contractId}
        analysisId={analysisId}
      />
    </>
  )
}
