/* src/components/features/RedlineComparison.tsx */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FileText, Sparkles, ArrowRightLeft, Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

export interface RedlineItem {
  id: string
  clauseNumber: string
  title: string
  originalText: string
  aiSuggestedText: string
  diffExplanation: string
}

interface RedlineComparisonProps {
  item: RedlineItem
}

export default function RedlineComparison({ item }: RedlineComparisonProps) {
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const [isCopied, setIsCopied] = useState(false)

  // دالة لنسخ النص المعدل الجديد للحافظة
  const handleCopyNewText = async () => {
    try {
      await navigator.clipboard.writeText(item.aiSuggestedText)
      setIsCopied(true)

      toast.success(
        isRtl ? 'تم نسخ البند المعدل!' : 'Modified clause copied!',
        {
          position: isRtl ? 'bottom-left' : 'bottom-right',
          duration: 2000,
        }
      )

      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text', err)
    }
  }

  // دالة سحرية بسيطة لمحاكاة الـ Diffing (إبراز الكلمات الحمراء والخضراء) داخل التكست
  // في الـ Production الحقيقي يمكن دمج مكتبة مثل 'diff' أو 'diff-match-patch'
  const renderHighlightedText = (
    text: string,
    type: 'original' | 'suggested'
  ) => {
    const words = text.split(' ')
    return words.map((word, index) => {
      // محاكاة سريعة لإبراز الكلمات بناءً على سيناريو بند العقد التجريبي
      const isDeleted =
        type === 'original' &&
        (word.includes('دون') ||
          word.includes('تحديد') ||
          word.includes('سقف') ||
          word.includes('أعلى') ||
          word.includes('أي_وقت') ||
          word.includes('إشعار'))
      const isAdded =
        type === 'suggested' &&
        (word.includes('بحد_أقصى') ||
          word.includes('%10') ||
          word.includes('30_يوماً') ||
          word.includes('بإخطار'))

      if (isDeleted) {
        return (
          <span
            key={index}
            className="mx-0.5 rounded bg-red-500/15 px-1 font-bold text-red-600 line-through dark:bg-red-500/20 dark:text-red-400"
          >
            {word}{' '}
          </span>
        )
      }
      if (isAdded) {
        return (
          <span
            key={index}
            className="mx-0.5 rounded border border-green-500/30 bg-green-500/15 px-1 font-bold text-green-600 dark:bg-green-500/20 dark:text-green-400"
          >
            {word}{' '}
          </span>
        )
      }
      return <span key={index}>{word} </span>
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border-border/60 hover:border-border space-y-6 rounded-3xl border p-6 text-start shadow-md transition-all"
    >
      {/* الـ Card Header */}
      <div className="border-border/40 flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black">
            {item.clauseNumber}
          </div>
          <div>
            <h4 className="text-foreground text-base font-black tracking-tight">
              {item.title}
            </h4>
            <p className="text-muted-foreground mt-0.5 text-xs font-semibold">
              {isRtl
                ? 'مقارنة التعديلات القانونية الحية'
                : 'Live legal redline review'}
            </p>
          </div>
        </div>

        {/* زر نسخ النص المقترح */}
        <button
          onClick={handleCopyNewText}
          className="bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary border-border/60 flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95"
        >
          {isCopied ? (
            <Check size={14} className="text-green-500" />
          ) : (
            <Copy size={14} />
          )}
          {isRtl ? 'نسخ البند المعدل' : 'Copy Revised Clause'}
        </button>
      </div>

      {/* الـ Comparison Grid (Side by Side) */}
      <div className="relative grid gap-4 md:grid-cols-2">
        {/* أيقونة المقارنة التبادلية في المنتصف بين البوكسين */}
        <div className="bg-background border-border/80 text-muted-foreground/60 absolute top-1/2 left-1/2 z-10 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm md:flex">
          <ArrowRightLeft size={14} />
        </div>

        {/* بوكس النص الأصلي (Original Clause) */}
        <div className="bg-muted/20 border-border/40 relative space-y-3 overflow-hidden rounded-2xl border p-5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-red-500/90 uppercase">
            <FileText size={14} />
            <span>{isRtl ? 'مسودة البند الأصلي' : 'Original Draft'}</span>
          </div>
          <div className="text-muted-foreground bg-background/50 dark:bg-background/20 border-border/30 min-h-[100px] rounded-xl border p-4 text-sm leading-relaxed font-medium">
            {renderHighlightedText(item.originalText, 'original')}
          </div>
        </div>

        {/* بوكس النص المقترح والمنقح بواسطة الذكاء الاصطناعي (AI Redline) */}
        <div className="bg-primary/5 border-primary/10 relative space-y-3 overflow-hidden rounded-2xl border p-5">
          <div className="from-primary/10 pointer-events-none absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl via-transparent to-transparent" />
          <div className="text-primary flex items-center gap-1.5 text-xs font-extrabold tracking-wider uppercase">
            <Sparkles size={14} />
            <span>{isRtl ? 'تعديل "عقدي" الذكي' : 'Aqdy AI Redline'}</span>
          </div>
          <div className="text-foreground bg-background/80 dark:bg-card/60 border-primary/10 min-h-[100px] rounded-xl border p-4 text-sm leading-relaxed font-semibold">
            {renderHighlightedText(item.aiSuggestedText, 'suggested')}
          </div>
        </div>
      </div>

      {/* بوكس تفسير وسبب التعديل القانوني */}
      <div className="bg-muted/50 border-border/40 text-muted-foreground flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold md:text-sm">
        <Sparkles
          size={16}
          className="text-primary mt-0.5 shrink-0 animate-pulse"
        />
        <p className="text-start leading-relaxed">
          <span className="text-foreground font-bold">
            {isRtl ? 'التحليل القانوني للتعديل: ' : 'Legal Justification: '}
          </span>
          {item.diffExplanation}
        </p>
      </div>
    </motion.div>
  )
}
