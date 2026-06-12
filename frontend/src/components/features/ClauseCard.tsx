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
  BrainCircuit,
  Search,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import ClauseChat from './ClauseChat'
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
  clauseIndex?: number
}

interface ClauseCardProps {
  item: ClauseItem
  contractId?: string
  clauseIndex?: number
}

export default function ClauseCard({
  item,
  contractId,
  clauseIndex,
}: ClauseCardProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const [isCopied, setIsCopied] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

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

  const confidenceMeta =
    item.confidence !== undefined ? getConfidenceMeta(item.confidence) : null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full space-y-4 px-4 pt-2 pb-6 text-start select-text"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {/* Original Clause Text */}
        <div className="space-y-2 rounded-xl border border-red-500/15 bg-red-500/5 p-4 dark:bg-red-500/10">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-red-600 uppercase dark:text-red-400">
            <ShieldAlert size={14} />
            <span>{t('dashboard.original_risky')}</span>
          </div>
          <p className="text-foreground text-sm leading-relaxed font-medium">
            {item.clause}
          </p>
        </div>

        {/* Suggested Redline */}
        {item.redlineSuggestion && (
          <div className="group relative space-y-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 dark:bg-emerald-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
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
            <p className="text-foreground pr-8 text-sm leading-relaxed font-medium">
              {item.redlineSuggestion}
            </p>
          </div>
        )}
      </div>

      {/* Explanation Box */}
      <div className="bg-muted/40 border-border/60 space-y-2 rounded-xl border p-4">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
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
          <div className="bg-card border-border/60 text-muted-foreground flex items-center gap-1.5 rounded-lg border px-3 py-2">
            <Search size={14} className="text-primary" />
            <span className="font-bold">{t('dashboard.kb_source')}:</span>
            <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[10px] font-bold">
              {item.sourceFromKB}
            </code>
          </div>
        )}

        {/* Confidence Score */}
        {item.confidence !== undefined && (
          <div className="bg-card border-border/60 text-muted-foreground flex items-center gap-1.5 rounded-lg border px-3 py-2">
            <BrainCircuit size={14} className="text-primary" />
            <span className="font-bold">{t('dashboard.confidence')}:</span>
            <div className="flex items-center gap-1">
              <span
                className={`h-2 w-2 rounded-full ${confidenceMeta?.color || 'bg-gray-400'}`}
              />
              <span className="text-foreground font-extrabold">
                {(item.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Row - Chat toggle button */}
      <div className="border-border/20 mt-4 flex justify-end border-t pt-2">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-primary hover:bg-primary/95 text-primary-foreground flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all active:scale-95"
        >
          <MessageSquare size={14} />
          <span>
            {isChatOpen ? t('chat.hide_chat') : t('chat.chat_about_clause')}
          </span>
        </button>
      </div>

      {/* Inline Chat Component */}
      {isChatOpen && (
        <div className="border-border/40 mt-4 border-t pt-4">
          <ClauseChat
            key={`${contractId || ''}-${clauseIndex ?? item.clauseIndex ?? 0}`}
            contractId={contractId || ''}
            clauseIndex={clauseIndex ?? item.clauseIndex ?? 0}
            clauseText={item.clause}
          />
        </div>
      )}
    </motion.div>
  )
}
