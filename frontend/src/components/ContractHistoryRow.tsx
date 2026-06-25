import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  FileText,
  Trash2,
  RefreshCw,
  ExternalLink,
  Info,
  AlertTriangle,
  Calendar,
  Layers,
} from 'lucide-react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { cn, riskColors } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

interface ContractHistoryRowProps {
  contract: {
    contractId: string
    filename: string
    uploadDate: string
    language: string
    fileSize: number
    status: 'analyzed' | 'pending' | 'failed'
    riskLevel: 'critical' | 'high' | 'medium' | 'low' | null
    analysisId: string | null
    riskSummary?: { ar: string; en: string } | null
    totalClauses?: number | null
    riskyClausesCount?: number | null
    version?: number
  }
  onDeleteSuccess: (contractId: string) => void
  onReanalyzeSuccess: (contractId: string) => void
}

export const ContractHistoryRow: React.FC<ContractHistoryRowProps> = ({
  contract,
  onDeleteSuccess,
  onReanalyzeSuccess,
}) => {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const isRtl = i18n.language === 'ar'

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  // Format File Size
  const formatBytes = (bytes: number, decimals = 1) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  // Format Date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Handle Delete Confirmation
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/account/contracts/${contract.contractId}`,
        {
          method: 'DELETE',
        }
      )
      const data = await response.json()
      if (data.success) {
        toast.success(
          t('history.delete_success', {
            defaultValue: 'Contract deleted successfully',
          })
        )
        onDeleteSuccess(contract.contractId)
        setIsDeleteModalOpen(false)
      } else {
        throw new Error(data.message || 'Deletion failed')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined
      toast.error(
        message || t('common.error', { defaultValue: 'Something went wrong' })
      )
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle Re-analyze trigger
  const handleReanalyze = async () => {
    if (!user) return
    setIsReanalyzing(true)
    try {
      const response = await fetch('/api/analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId: contract.contractId,
          userId: user.id,
        }),
      })

      if (response.status === 202 || response.status === 200) {
        toast.success(
          t('history.reanalyze_success', {
            defaultValue: 'Re-analysis started successfully',
          })
        )
        onReanalyzeSuccess(contract.contractId)
      } else {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || 'Re-analysis failed to start')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined
      toast.error(
        message || t('common.error', { defaultValue: 'Something went wrong' })
      )
    } finally {
      setIsReanalyzing(false)
    }
  }

  // Get status color styling
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'analyzed':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
      case 'pending':
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
      case 'failed':
        return 'bg-red-500/10 text-red-600 border border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30'
      default:
        return 'bg-gray-500/10 text-gray-600 border border-gray-500/20 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
    }
  }

  const overallRisk = contract.riskLevel || 'unknown'
  const localizedSummary = contract.riskSummary
    ? isRtl
      ? contract.riskSummary.ar
      : contract.riskSummary.en
    : null

  return (
    <>
      <tr className="hover:bg-muted/10 group/row border-border/40 border-b transition-colors">
        {/* Filename Column with hover tooltip parent */}
        <td className="relative px-6 py-4">
          <div
            className="flex max-w-xs cursor-pointer items-center gap-3 sm:max-w-md"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            data-testid={`filename-hover-${contract.contractId}`}
          >
            <div className="bg-primary/10 text-primary shrink-0 rounded-xl p-2">
              <FileText size={18} />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-foreground group-hover/row:text-primary truncate text-sm font-bold transition-colors">
                {contract.filename}
              </span>
              <span className="text-muted-foreground/60 mt-0.5 text-[10px] font-semibold">
                {formatBytes(contract.fileSize)}
              </span>
            </div>

            {/* Quick Preview Tooltip */}
            {showTooltip && (
              <div
                className={cn(
                  'border-border/50 bg-card/95 animate-in fade-in-0 slide-in-from-bottom-2 absolute bottom-full z-50 mb-2 w-72 rounded-2xl border p-4 text-start shadow-xl backdrop-blur-md duration-200',
                  isRtl ? 'right-6' : 'left-6'
                )}
                role="tooltip"
              >
                <div className="border-border/30 mb-2 flex items-center gap-2 border-b pb-2">
                  <Info className="text-primary h-4 w-4 shrink-0" />
                  <span className="text-foreground text-xs font-bold">
                    {t('history.preview_summary', {
                      defaultValue: 'Risk Summary',
                    })}
                  </span>
                  {contract.version !== undefined && contract.version > 0 && (
                    <span className="bg-muted text-muted-foreground ms-auto rounded-full px-2 py-0.5 text-[10px] font-bold">
                      {t('history.version', { defaultValue: 'Version' })}{' '}
                      {contract.version}
                    </span>
                  )}
                </div>

                {contract.status === 'analyzed' ? (
                  <div className="space-y-2.5">
                    {localizedSummary ? (
                      <p className="text-muted-foreground text-xs leading-relaxed font-semibold">
                        {localizedSummary}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs leading-relaxed font-semibold italic">
                        {t('history.preview_no_issues', {
                          defaultValue:
                            'No critical or high risk issues found.',
                        })}
                      </p>
                    )}

                    <div className="border-border/30 flex items-center gap-4 border-t pt-2 text-[10px] font-bold">
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        <span>
                          {t('history.preview_clauses_count', {
                            defaultValue: `Clauses: ${contract.totalClauses || 0}`,
                            count: contract.totalClauses || 0,
                          })}
                        </span>
                      </div>

                      {typeof contract.riskyClausesCount === 'number' &&
                        contract.riskyClausesCount > 0 && (
                          <div className="flex items-center gap-1 text-red-500">
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                              {t('history.preview_risky_clauses', {
                                defaultValue: `Risky: ${contract.riskyClausesCount}`,
                                count: contract.riskyClausesCount,
                              })}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs font-semibold italic">
                    {contract.status === 'pending'
                      ? t('history.status_pending', {
                          defaultValue: 'Pending analysis',
                        })
                      : t('history.status_failed', {
                          defaultValue: 'Analysis failed',
                        })}
                  </p>
                )}
              </div>
            )}
          </div>
        </td>

        {/* Upload Date Column */}
        <td className="text-muted-foreground px-6 py-4 text-sm font-semibold whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="opacity-60" />
            <span>{formatDate(contract.uploadDate)}</span>
          </div>
        </td>

        {/* Status Badge Column */}
        <td className="px-6 py-4 whitespace-nowrap">
          <span
            className={cn(
              'inline-block rounded-full border px-2.5 py-0.5 text-xs leading-none font-bold',
              getStatusStyles(contract.status)
            )}
          >
            {t(`history.status_${contract.status}`, {
              defaultValue: contract.status,
            })}
          </span>
        </td>

        {/* Overall Risk Level Badge Column */}
        <td className="px-6 py-4 whitespace-nowrap">
          <span
            className={cn(
              'inline-block rounded-full border px-2.5 py-0.5 text-xs leading-none font-bold whitespace-nowrap capitalize',
              riskColors[overallRisk]
            )}
          >
            {t(`risk.${overallRisk}`, { defaultValue: overallRisk })}
          </span>
        </td>

        {/* Actions Column */}
        <td className="px-6 py-4 text-end whitespace-nowrap">
          <div className="inline-flex items-center gap-2">
            {/* View Report Link */}
            {contract.status === 'analyzed' && contract.analysisId && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="hover:border-primary hover:text-primary h-8 gap-1.5 rounded-xl px-3 font-semibold transition-all"
              >
                <Link to={`/risk-analysis?id=${contract.contractId}`}>
                  <span>
                    {t('history.action_view_report', {
                      defaultValue: 'View Report',
                    })}
                  </span>
                  <ExternalLink size={12} />
                </Link>
              </Button>
            )}

            {/* Re-analyze Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="hover:border-primary hover:text-primary h-8 gap-1.5 rounded-xl px-3 font-semibold transition-all"
              data-testid={`reanalyze-button-${contract.contractId}`}
            >
              <RefreshCw
                size={12}
                className={cn(isReanalyzing && 'animate-spin')}
              />
              <span>
                {isReanalyzing
                  ? t('common.loading', { defaultValue: 'Loading...' })
                  : t('history.action_reanalyze', {
                      defaultValue: 'Re-analyze',
                    })}
              </span>
            </Button>

            {/* Delete Button */}
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-8 w-8 shrink-0 rounded-xl shadow-sm transition-all"
              aria-label={t('history.action_delete', {
                defaultValue: 'Delete',
              })}
              data-testid={`delete-button-${contract.contractId}`}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </td>
      </tr>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent
          className={cn(
            'border-border/40 rounded-2xl p-6 shadow-2xl focus:outline-none sm:max-w-md',
            isRtl ? 'rtl' : 'ltr'
          )}
        >
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-foreground flex items-center gap-2 text-lg font-black tracking-tight">
              <AlertTriangle className="text-destructive h-5 w-5" />
              {t('history.delete_confirm_title', {
                defaultValue: 'Delete Contract?',
              })}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs leading-relaxed font-semibold">
              {t('history.delete_confirm_desc', {
                defaultValue:
                  'Are you sure you want to delete this contract? This action cannot be undone.',
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 border-border/40 flex items-center gap-3 rounded-xl border p-3">
            <FileText size={20} className="text-primary shrink-0" />
            <div className="flex min-w-0 flex-col">
              <span className="text-foreground truncate text-xs font-bold">
                {contract.filename}
              </span>
              <span className="text-muted-foreground/60 mt-0.5 text-[10px] font-semibold">
                {formatBytes(contract.fileSize)}
              </span>
            </div>
          </div>
          <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="h-9 rounded-xl px-4 font-bold transition-all"
              disabled={isDeleting}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 rounded-xl px-4 font-bold transition-all"
              data-testid="confirm-delete-button"
            >
              {isDeleting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                t('history.action_delete', { defaultValue: 'Delete' })
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
