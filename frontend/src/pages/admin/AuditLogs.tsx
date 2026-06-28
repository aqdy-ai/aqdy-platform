import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { toast } from 'sonner'

interface AuditEntry {
  _id: string
  action: string
  outcome: string
  timestamp: string
  userId?: string
  userEmail?: string
  ipAddress?: string
  errorMessage?: string
  metadata?: Record<string, unknown>
}

interface AuditResponse {
  success: boolean
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  data: AuditEntry[]
}

function formatAction(action: string) {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function outcomeColor(outcome: string) {
  switch (outcome) {
    case 'success':
      return 'bg-emerald-500/15 text-emerald-600'
    case 'failure':
      return 'bg-red-500/15 text-red-500'
    case 'partial':
      return 'bg-amber-500/15 text-amber-600'
    case 'blocked':
      return 'bg-red-500/15 text-red-500'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function AuditLogs() {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [pagination, setPagination] = useState<
    AuditResponse['pagination'] | null
  >(null)
  const [loading, setLoading] = useState(true)

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [actionFilter, setActionFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [page, setPage] = useState(1)

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminApi.getAuditLogs({
        page,
        pageSize: 20,
        action: actionFilter || undefined,
        outcome: outcomeFilter || undefined,
        email: emailFilter || undefined,
      })
      const d = res.data as AuditResponse
      setEntries(d.data)
      setPagination(d.pagination)
    } catch {
      toast.error(t('common.error'))
    }
    setLoading(false)
  }, [page, actionFilter, outcomeFilter, emailFilter, t])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getAuditLogs({
          page,
          pageSize: 20,
          action: actionFilter || undefined,
          outcome: outcomeFilter || undefined,
          email: emailFilter || undefined,
        })
        const d = res.data as AuditResponse
        setEntries(d.data)
        setPagination(d.pagination)
      } catch {
        toast.error(t('common.error'))
      }
      setLoading(false)
    }
    load()
  }, [page, actionFilter, outcomeFilter, emailFilter, t])

  const handleSearch = () => {
    setPage(1)
    fetchLogs()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="text-primary" size={28} />
        <h1 className="text-2xl font-bold">
          {t('admin.audit_log', { defaultValue: 'Audit Log' })}
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value)
            setPage(1)
          }}
          className="bg-background border-border rounded-xl border px-3 py-2 text-sm"
        >
          <option value="">
            {t('admin.all_actions', { defaultValue: 'All Actions' })}
          </option>
          <option value="AUTH_LOGIN_SUCCESS">Login Success</option>
          <option value="AUTH_LOGIN_FAILED">Login Failed</option>
          <option value="ROLE_ASSIGNED">Role Assigned</option>
          <option value="ROLE_REVOKED">Role Revoked</option>
          <option value="ADMIN_EMAIL_VERIFY">Email Verified</option>
          <option value="ADMIN_PASSWORD_RESET_TRIGGER">Password Reset</option>
          <option value="ADMIN_CREDIT_ADJUSTMENT">Credit Adjustment</option>
          <option value="ADMIN_REFUND">Refund</option>
          <option value="ADMIN_SUBSCRIPTION_CHANGE">Subscription Change</option>
          <option value="KB_ENTRY_CREATED">KB Created</option>
          <option value="KB_ENTRY_UPDATED">KB Updated</option>
          <option value="KB_ENTRY_DELETED">KB Deleted</option>
          <option value="PROMPT_UPDATED">Prompt Updated</option>
        </select>
        <select
          value={outcomeFilter}
          onChange={(e) => {
            setOutcomeFilter(e.target.value)
            setPage(1)
          }}
          className="bg-background border-border rounded-xl border px-3 py-2 text-sm"
        >
          <option value="">
            {t('admin.all_outcomes', { defaultValue: 'All Outcomes' })}
          </option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="partial">Partial</option>
          <option value="blocked">Blocked</option>
        </select>
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={14}
            className="text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2"
          />
          <input
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('admin.search_email', {
              defaultValue: 'Search by email...',
            })}
            className="bg-background border-border w-full rounded-xl border py-2 ps-9 pe-3 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border-border/40 overflow-hidden rounded-2xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
              <th className="px-4 py-3 text-start">
                {t('admin.timestamp', { defaultValue: 'Time' })}
              </th>
              <th className="px-4 py-3 text-start">{t('admin.action')}</th>
              <th className="px-4 py-3 text-start">{t('admin.user')}</th>
              <th className="px-4 py-3 text-center">{t('admin.outcome')}</th>
              <th className="px-4 py-3 text-start">{t('admin.details')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-muted-foreground px-4 py-8 text-center"
                >
                  {t('common.loading')}
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-muted-foreground px-4 py-8 text-center"
                >
                  {t('admin.no_data')}
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <React.Fragment key={e._id}>
                  <tr className="border-border/20 hover:bg-muted/30 border-b transition-colors">
                    <td className="text-muted-foreground px-4 py-3 text-xs whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      {formatAction(e.action)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {e.userEmail ? (
                        <span className="font-medium">{e.userEmail}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${outcomeColor(e.outcome)}`}
                      >
                        {e.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleRow(e._id)}
                        className="text-primary hover:text-primary/80 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      >
                        {expandedRows.has(e._id) ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                        {t('admin.more_details', {
                          defaultValue: 'More Details',
                        })}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(e._id) && (
                    <tr className="border-border/20 border-b">
                      <td colSpan={5} className="bg-muted/20 px-6 py-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                          <div>
                            <span className="text-muted-foreground font-semibold">
                              User ID:
                            </span>{' '}
                            <span className="text-foreground">
                              {e.userId || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-semibold">
                              IP Address:
                            </span>{' '}
                            <span className="text-foreground">
                              {e.ipAddress || '—'}
                            </span>
                          </div>
                          {e.errorMessage && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground font-semibold">
                                Error:
                              </span>{' '}
                              <span className="text-red-500">
                                {e.errorMessage}
                              </span>
                            </div>
                          )}
                          {e.metadata && Object.keys(e.metadata).length > 0 && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground font-semibold">
                                Metadata:
                              </span>{' '}
                              <pre className="bg-background mt-1 overflow-x-auto rounded-lg p-3 text-xs">
                                {JSON.stringify(e.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            {pagination.total}{' '}
            {t('common.results', { defaultValue: 'results' })} — page{' '}
            {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              className="bg-muted hover:bg-muted/80 text-foreground disabled:text-muted-foreground flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <ChevronLeft size={14} />
              {t('common.previous')}
            </button>
            <span className="text-muted-foreground text-xs font-semibold">
              {pagination.page}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext}
              className="bg-muted hover:bg-muted/80 text-foreground disabled:text-muted-foreground flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {t('common.next')}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
