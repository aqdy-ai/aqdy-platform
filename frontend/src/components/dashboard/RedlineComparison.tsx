import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Copy,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RedlineComparisonProps {
  originalText: string
  suggestedText: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  clauseType?: string // أضفنا الـ type اختياري عشان الـ dynamic extraction
}

export default function RedlineComparison({
  originalText,
  suggestedText,
  riskLevel,
  clauseType = 'General',
}: RedlineComparisonProps) {
  // 1️⃣ بنجيب كائن i18n الأساسي من الـ hook هنا عشان نستخدم الـ .exists() بتاعته مباشرة
  const { t, i18n } = useTranslation()
  const [copied, setCopied] = useState(false)

  // 2️⃣ بناء الـ Key الديناميكي لنقطة التفاوض
  const talkingPointKey = `dashboard.tp.${clauseType}_${riskLevel}`

  // 3️⃣ استخدام i18n.exists مباشرة وبشكل آمن للتأكد من وجود الترجمة في ملفات الـ JSON
  const hasCustomPoint = i18n.exists(talkingPointKey)
  const talkingPointText = hasCustomPoint
    ? t(talkingPointKey)
    : t('dashboard.tp.default')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(talkingPointText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

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
            className="text-foreground/80 font-mono text-sm leading-relaxed"
            dir="auto"
          >
            {`"${originalText}"`}
          </p>
        </div>

        {/* Suggested Text Column */}
        <div className="bg-background/60 flex flex-col rounded-lg border border-emerald-500/20 p-4 text-start shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t('dashboard.suggested_safer_label')}</span>
          </div>
          <p
            className="text-foreground/90 font-mono text-sm leading-relaxed font-medium"
            dir="auto"
          >
            {suggestedText}
          </p>
        </div>
      </div>

      {/* Why it's better Section */}
      <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/10 p-3.5 text-start">
        <h6 className="mb-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          💡 {t('dashboard.why_better')}
        </h6>
        <p className="text-xs leading-relaxed text-emerald-700/90 dark:text-emerald-400/90">
          {t('dashboard.why_better_desc')}
        </p>
      </div>

      {/* 🚀 New Feature: Negotiation Talking Points Display */}
      <div className="rounded-lg border border-blue-500/10 bg-blue-500/5 p-4 text-start transition-all">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
            <MessageSquare className="h-4 w-4" />
            <span>{t('dashboard.talking_points_title')}</span>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold transition-all',
              copied
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                : 'bg-background text-muted-foreground border-muted/80 hover:border-blue-500/30 hover:text-blue-600'
            )}
          >
            {copied ? (
              <>
                <Check className="h-2.5 w-2.5" />
                <span>{t('dashboard.talking_points_copied')}</span>
              </>
            ) : (
              <>
                <Copy className="h-2.5 w-2.5" />
                <span>{t('dashboard.talking_points_copy')}</span>
              </>
            )}
          </button>
        </div>
        <p className="bg-background/30 rounded border border-blue-500/5 p-2.5 text-xs leading-relaxed font-medium text-slate-700 italic dark:text-slate-300">
          "{talkingPointText}"
        </p>
      </div>
    </div>
  )
}
