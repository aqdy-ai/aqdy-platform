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
  FileText,
  TrendingUp,
  BrainCircuit,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { getConfidenceMeta } from '../../lib/utils'

export interface ClauseItem {
  id: string
  severity: 'high' | 'medium' | 'low'
  title: string
  clause: string
  explanation: string
  redlineSuggestion?: string
  confidence?: number
  sourceFromKB?: string
}

interface ClauseCardProps {
  item: ClauseItem
}

export default function ClauseCard({ item }: ClauseCardProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
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

  const confidenceMeta = item.confidence !== undefined ? getConfidenceMeta(item.confidence) : null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full space-y-4 px-4 pb-6 pt-2 text-start select-text"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {/* Original Clause Text */}
        <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert size={14} />
            <span>{t('dashboard.original_risky')}</span>
          </div>
          <p className="text-foreground text-sm leading-relaxed font-medium">
            {item.clause}
          </p>
        </div>

        {/* Suggested Redline */}
        {item.redlineSuggestion && (
          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 rounded-xl p-4 space-y-2 relative group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck size={14} />
                <span>{t('dashboard.suggested_safer_label')}</span>
              </div>
              <button
                onClick={() => handleCopy(item.redlineSuggestion || '')}
                className="bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded-lg border p-1.5 shadow-sm transition-all"
                title={isRtl ? 'نسخ التوصية' : 'Copy Recommendation'}
              >
                {isCopied ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
            <p className="text-foreground text-sm leading-relaxed font-medium pr-8">
              {item.redlineSuggestion}
            </p>
          </div>
        )}
      </div>

      {/* Explanation Box */}
      <div className="bg-muted/40 border border-border/60 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
          <AlertTriangle size={14} />
          <span>{t('dashboard.explanation')}</span>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed font-medium">
          {item.explanation}
        </p>
      </div>

      {/* Metadata (KB Source & Confidence) */}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
        {/* KB Reference */}
        {item.sourceFromKB && (
          <div className="bg-card border border-border/60 rounded-lg px-3 py-2 flex items-center gap-1.5 text-muted-foreground">
            <Search size={14} className="text-primary" />
            <span className="font-bold">{t('dashboard.kb_source')}:</span>
            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-foreground">
              {item.sourceFromKB}
            </code>
          </div>
        )}

        {/* Confidence Score */}
        {item.confidence !== undefined && (
          <div className="bg-card border border-border/60 rounded-lg px-3 py-2 flex items-center gap-1.5 text-muted-foreground">
            <BrainCircuit size={14} className="text-primary" />
            <span className="font-bold">{t('dashboard.confidence')}:</span>
            <div className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${confidenceMeta?.color || 'bg-gray-400'}`} />
              <span className="font-extrabold text-foreground">
                {(item.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
