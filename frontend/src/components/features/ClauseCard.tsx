/* src/components/features/ClauseCard.tsx */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'

// تعريف الـ Props الخاصة بالمكون بشكل صارم مع TypeScript
export interface ClauseItem {
  id: string
  severity: 'high' | 'medium' | 'low'
  title: string
  clause: string
  recommendation: string
}

interface ClauseCardProps {
  item: ClauseItem
}

export default function ClauseCard({ item }: ClauseCardProps) {
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // إرجاع الأيقونة المناسبة بناءً على درجة الخطورة
  const getSeverityData = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return {
          icon: <ShieldAlert size={22} />,
          badgeClass: 'bg-red-500/10 text-red-500',
          label: isRtl ? 'حرجة جداً' : 'Critical',
        }
      case 'medium':
        return {
          icon: <AlertTriangle size={22} />,
          badgeClass: 'bg-amber-500/10 text-amber-500',
          label: isRtl ? 'تنبيه متوسط' : 'Warning',
        }
      case 'low':
      default:
        return {
          icon: <ShieldCheck size={22} />,
          badgeClass: 'bg-blue-500/10 text-blue-500',
          label: isRtl ? 'إرشاد بسيط' : 'Notice',
        }
    }
  }

  const { icon, badgeClass, label } = getSeverityData(item.severity)

  // دالة نسخ التوصية المقترحة إلى الحافظة (Clipboard)
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation() // منع انتشار الحدث لكي لا يغلق أو يفتح الكارت
    try {
      await navigator.clipboard.writeText(item.recommendation)
      setIsCopied(true)

      // إظهار توست نجاح سريع ومخصص متناسق مع الجنب
      toast.success(
        isRtl ? 'تم نسخ التوصية بنجاح!' : 'Recommendation copied!',
        {
          position: isRtl ? 'bottom-left' : 'bottom-right',
          duration: 2000,
        }
      )

      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="bg-card border-border/60 hover:border-border/100 group relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl border p-5 text-start shadow-sm transition-all md:flex-row"
    >
      {/* الأيقونة الجانبية الملونة حسب درجة الخطورة */}
      <div
        className={`mt-0.5 shrink-0 rounded-xl p-3 transition-transform duration-300 group-hover:scale-105 ${badgeClass}`}
      >
        {icon}
      </div>

      {/* صندوق المحتوى الرئيسي */}
      <div className="w-full flex-1 space-y-3">
        {/* العناوين والبادج العلوي */}
        <div className="flex w-full flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-foreground text-base leading-snug font-black tracking-tight">
              {item.title}
            </h4>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-widest uppercase ${badgeClass}`}
          >
            {label}
          </span>
        </div>

        {/* النص الأصلي للبند من العقد مع خاصية التوسيع الذكي */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-muted/40 border-muted-foreground/20 hover:bg-muted/60 text-muted-foreground relative cursor-pointer rounded-r-lg border-l-2 px-3 py-2.5 text-sm leading-relaxed font-medium italic transition-colors"
        >
          <p className={isExpanded ? '' : 'line-clamp-2'}>{item.clause}</p>

          {/* زر السهم الصغير للتوسيع والتضييق */}
          <div className="text-primary/70 group/btn non-selectable mt-1 flex items-center justify-end gap-0.5 text-[11px] font-bold">
            <span>
              {isExpanded
                ? isRtl
                  ? 'عرض أقل'
                  : 'Show less'
                : isRtl
                  ? 'قراءة البند كاملاً'
                  : 'Read full clause'}
            </span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
        </div>

        {/* توصية الذكاء الاصطناعي مع زر النسخ المباشر */}
        <div className="group/rec relative flex items-start gap-3 rounded-xl border border-green-500/15 bg-green-500/5 px-4 py-3.5 text-sm font-semibold text-green-900 dark:text-green-200">
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
          />
          <div className="flex-1 pr-6">
            <span className="mb-0.5 block font-bold text-green-700 dark:text-green-400">
              {isRtl
                ? 'توصية صياغة البديل الآمن:'
                : 'AI Safe Alternative Recommendation:'}
            </span>
            <p className="text-xs leading-relaxed font-bold opacity-95 md:text-sm">
              {item.recommendation}
            </p>
          </div>

          {/* زر نسخ التوصية الذكي */}
          <button
            onClick={handleCopy}
            title={isRtl ? 'نسخ التوصية' : 'Copy Recommendation'}
            className="bg-background border-border/60 text-muted-foreground absolute top-3.5 left-3.5 cursor-pointer rounded-xl border p-2 shadow-sm transition-all hover:border-green-500/30 hover:bg-green-500/10 hover:text-green-600 active:scale-90 md:opacity-0 md:group-hover/rec:opacity-100 dark:hover:text-green-400"
          >
            {isCopied ? (
              <Check size={14} className="text-green-600" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
