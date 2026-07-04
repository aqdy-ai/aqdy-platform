import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import feedbackApi, {
  type FeedbackTargetType,
  type ReportCategory,
} from '@/services/feedbackApi'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ReportIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: FeedbackTargetType
  targetId: string
  contractId?: string
  analysisId?: string
}

const CATEGORIES: { value: ReportCategory; labelKey: string }[] = [
  { value: 'inaccurate', labelKey: 'feedback.report.inaccurate' },
  { value: 'offensive', labelKey: 'feedback.report.offensive' },
  { value: 'unclear', labelKey: 'feedback.report.unclear' },
  { value: 'other', labelKey: 'feedback.report.other' },
]

export default function ReportIssueDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  contractId,
  analysisId,
}: ReportIssueDialogProps) {
  const { t } = useTranslation()
  const [category, setCategory] = useState<ReportCategory | ''>('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!category) return
    setSubmitting(true)

    try {
      const res = await feedbackApi.submit({
        targetType,
        targetId,
        feedbackType: 'report',
        category: category as ReportCategory,
        comment: comment.trim() || undefined,
        contractId,
        analysisId,
      })

      if (res.data.success) {
        toast.success(
          t('feedback.report.success', 'Report submitted. Thank you!')
        )
        onOpenChange(false)
        setCategory('')
        setComment('')
      }
    } catch {
      toast.error(t('feedback.report.error', 'Failed to submit report'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('feedback.report.title', 'Report an Issue')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'feedback.report.description',
              'Help us improve by describing what went wrong.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <fieldset>
            <legend className="text-foreground mb-2 text-xs font-bold">
              {t('feedback.report.category_label', 'Category')}
            </legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                    category === cat.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                  }`}
                  aria-pressed={category === cat.value}
                >
                  {t(cat.labelKey)}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label
              htmlFor="report-comment"
              className="text-foreground text-xs font-bold"
            >
              {t(
                'feedback.report.comment_label',
                'Additional details (optional)'
              )}
            </label>
            <textarea
              id="report-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              className="border-border focus:border-primary bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full resize-none rounded-lg border px-3 py-2 text-xs font-medium transition-all outline-none focus:ring-1"
              placeholder={t(
                'feedback.report.comment_placeholder',
                'Describe what issue you encountered...'
              )}
            />
            <span className="text-muted-foreground block text-[10px] font-medium">
              {comment.length}/1000
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!category || submitting}>
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {t('feedback.report.submit', 'Submit Report')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
