import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  RefreshCw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Search,
  Undo2,
  History,
} from 'lucide-react'
import { adminApi, AdminPlan } from '../../services/adminApi'
import { usePermissions } from '../../hooks/usePermissions'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface OverviewData {
  mrr: number
  arr: number
  churnRate: number
  revenueByPlan: Record<string, number>
  totalActiveSubscriptions: number
}
interface Subscription {
  _id: string
  name: string
  email: string
  planSlug: string
  creditBalance: number
  status: string
  createdAt: string
}

const PLAN_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']

export default function FinancialDashboard() {
  const { t } = useTranslation()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [planChangeMap, setPlanChangeMap] = useState<Record<string, string>>({})
  const [modifyingId, setModifyingId] = useState<string | null>(null)
  const { canWrite } = usePermissions()
  const canModify = canWrite('billing')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Refund modal
  const [refundTarget, setRefundTarget] = useState<Subscription | null>(null)
  const [refundAmount, setRefundAmount] = useState(0)
  const [refundReason, setRefundReason] = useState('')

  // Stripe webhooks
  const [showWebhooks, setShowWebhooks] = useState(false)
  const [webhooks, setWebhooks] = useState<Record<string, unknown>[]>([])
  const [webhookPage, setWebhookPage] = useState(1)
  const [webhookTotalPages, setWebhookTotalPages] = useState(1)

  useEffect(() => {
    ;(async () => {
      try {
        const [ov, subs, pl] = await Promise.all([
          adminApi.getFinancialOverview(),
          adminApi.getSubscriptions(),
          adminApi.getPlans({ pageSize: 100 }),
        ])
        setOverview((ov.data as { data: OverviewData }).data)
        setSubscriptions((subs.data as { data: Subscription[] }).data)
        setPlans(pl.data.data)
      } catch {
        toast.error(t('common.error'))
      }
      setLoading(false)
    })()
  }, [t])

  const fetchWebhooks = async (page = 1) => {
    try {
      const res = await adminApi.getStripeWebhooks({ page, pageSize: 10 })
      const d = res.data as {
        data: Record<string, unknown>[]
        pagination: { page: number; totalPages: number }
      }
      setWebhooks(d.data)
      setWebhookTotalPages(d.pagination.totalPages)
    } catch {
      toast.error(t('common.error'))
    }
  }

  const toggleWebhooks = () => {
    const next = !showWebhooks
    setShowWebhooks(next)
    if (next) fetchWebhooks(1)
  }

  const handleExport = async () => {
    try {
      const params: Record<string, string> = {}
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      const res = await adminApi.getFinancialExport(dateFrom || undefined, dateTo || undefined)
      const data = (res.data as { data: { subscriptions: Subscription[] } })
        .data.subscriptions
      const csv = ['Name,Email,Plan,Credits,Status,Created']
        .concat(
          data.map(
            (s) =>
              `${s.name},${s.email},${s.planSlug},${s.creditBalance},${s.status},${s.createdAt}`
          )
        )
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'financial-report.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('common.success'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handlePlanChange = async (subscriptionId: string, newPlan: string) => {
    try {
      setModifyingId(subscriptionId)
      const res = await adminApi.changeSubscription(subscriptionId, 'change', newPlan)
      const updatedData = (res.data as { data: { creditBalance: number } }).data
      toast.success(t('admin.plan_updated'))
      setSubscriptions((prev) =>
        prev.map((s) =>
          s._id === subscriptionId
            ? { ...s, planSlug: newPlan, creditBalance: updatedData.creditBalance }
            : s
        )
      )
      setPlanChangeMap((prev) => {
        const next = { ...prev }
        delete next[subscriptionId]
        return next
      })
    } catch {
      toast.error(t('common.error'))
    }
    setModifyingId(null)
  }

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (
      !window.confirm(
        t('admin.confirm_cancel', { defaultValue: 'Cancel this subscription?' })
      )
    )
      return
    try {
      setModifyingId(subscriptionId)
      await adminApi.changeSubscription(subscriptionId, 'cancel')
      toast.success(t('common.success'))
      setSubscriptions((prev) =>
        prev.map((s) =>
          s._id === subscriptionId
            ? { ...s, planSlug: 'free', status: 'cancelled' }
            : s
        )
      )
    } catch {
      toast.error(t('common.error'))
    }
    setModifyingId(null)
  }

  const handleRefund = async () => {
    if (!refundTarget || refundAmount <= 0 || !refundReason.trim()) return
    try {
      await adminApi.issueRefund(refundTarget._id, refundAmount, refundReason.trim())
      toast.success(`Refund of $${refundAmount} issued to ${refundTarget.email}`)
      setRefundTarget(null)
      setRefundAmount(0)
      setRefundReason('')
    } catch {
      toast.error(t('common.error'))
    }
  }

  const revenueChartData = overview
    ? Object.entries(overview.revenueByPlan).map(([plan, rev]) => ({
        name: t(`admin.plan_${plan.toLowerCase()}`, { defaultValue: plan }),
        revenue: rev,
      }))
    : []

  if (loading)
    return (
      <div className="text-muted-foreground animate-pulse py-12 text-center">
        {t('common.loading')}
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="text-primary" size={28} />
          <h1 className="text-2xl font-bold">
            {t('admin.financial_dashboard')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleWebhooks}
            className="text-primary hover:bg-primary/10 flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors"
          >
            <History size={14} />
            Webhooks
          </button>
          <button
            onClick={handleExport}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-bold transition-colors hover:opacity-90"
          >
            {t('admin.export_csv')}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              key: 'mrr',
              label: t('admin.mrr'),
              value: `$${overview.mrr.toLocaleString()}`,
              icon: TrendingUp,
              color: 'text-emerald-500',
            },
            {
              key: 'arr',
              label: t('admin.arr'),
              value: `$${overview.arr.toLocaleString()}`,
              icon: TrendingUp,
              color: 'text-blue-500',
            },
            {
              key: 'churn',
              label: t('admin.churn_rate'),
              value: `${overview.churnRate}%`,
              icon: RefreshCw,
              color: 'text-amber-500',
            },
            {
              key: 'subs',
              label: t('admin.active_subs'),
              value: overview.totalActiveSubscriptions,
              icon: CreditCard,
              color: 'text-purple-500',
            },
          ].map((m) => (
            <div
              key={m.key}
              className="border-border/40 rounded-2xl border p-5"
            >
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold uppercase">
                <m.icon size={14} className={m.color} />
                {m.label}
              </div>
              <div className="mt-2 text-2xl font-bold">{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Revenue by Plan — Chart */}
      {overview && revenueChartData.length > 0 && (
        <div className="border-border/40 rounded-2xl border p-5">
          <h2 className="mb-4 text-lg font-bold">
            {t('admin.revenue_by_plan')}
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                  }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                  {revenueChartData.map((_, idx) => (
                    <Cell key={idx} fill={PLAN_COLORS[idx % PLAN_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Fallback plain text for quick reference */}
          <div className="mt-3 flex gap-4">
            {Object.entries(overview.revenueByPlan).map(([plan, rev], idx) => (
              <div key={plan} className="flex items-center gap-2 text-sm">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length] }}
                />
                <span className="text-muted-foreground font-semibold">
                  {t(`admin.plan_${plan.toLowerCase()}`, { defaultValue: plan })}:
                </span>
                <span className="font-bold">${rev.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscriptions Table */}
      <div className="border-border/40 overflow-hidden rounded-2xl border">
        <div className="border-border/30 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
          <h2 className="text-lg font-bold">{t('admin.subscriptions')}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="text-muted-foreground absolute start-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="bg-background border-border w-36 rounded-lg border py-1.5 ps-8 pe-2.5 text-xs outline-none"
              />
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-background border-border rounded-lg border px-2 py-1.5 text-xs"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-background border-border rounded-lg border px-2 py-1.5 text-xs"
            />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
              <th className="px-4 py-3 text-start">{t('admin.user')}</th>
              <th className="px-4 py-3 text-start">{t('admin.plan')}</th>
              <th className="px-4 py-3 text-start">{t('admin.credits')}</th>
              <th className="px-4 py-3 text-start">{t('admin.status')}</th>
              {canModify && (
                <th className="px-4 py-3 text-end">{t('admin.actions')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {subscriptions
              .filter((s) => {
                if (!searchTerm) return true
                const q = searchTerm.toLowerCase()
                return (
                  s.name.toLowerCase().includes(q) ||
                  s.email.toLowerCase().includes(q)
                )
              })
              .map((s) => (
              <tr
                key={s._id}
                className="border-border/30 hover:bg-muted/30 border-b transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-muted-foreground text-xs">{s.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-primary/15 text-primary rounded-lg px-2 py-1 text-xs font-bold uppercase">
                    {t(`admin.plan_${s.planSlug.toLowerCase()}`, {
                      defaultValue: s.planSlug,
                    })}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{s.creditBalance}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-lg px-2 py-1 text-xs font-bold ${s.status === 'active' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-500'}`}
                  >
                    {t(`admin.status_${s.status.toLowerCase()}`, {
                      defaultValue: s.status,
                    })}
                  </span>
                </td>
                {canModify && (
                  <td className="px-4 py-3 text-end">
                    {s.status === 'active' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <select
                          value={planChangeMap[s._id] ?? s.planSlug}
                          onChange={(e) =>
                            setPlanChangeMap((prev) => ({
                              ...prev,
                              [s._id]: e.target.value,
                            }))
                          }
                          className="bg-background border-border w-24 rounded-lg border px-2 py-1 text-[11px] font-semibold"
                        >
                          {plans
                            .filter((p) => p.isActive)
                            .map((p) => (
                              <option key={p.slug} value={p.slug}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                        {planChangeMap[s._id] &&
                        planChangeMap[s._id] !== s.planSlug ? (
                          <button
                            onClick={() =>
                              handlePlanChange(s._id, planChangeMap[s._id]!)
                            }
                            disabled={modifyingId === s._id}
                            className="bg-primary text-primary-foreground rounded-lg px-2 py-1 text-[11px] font-bold transition-colors hover:opacity-90 disabled:opacity-50"
                          >
                            {modifyingId === s._id ? '...' : 'Apply'}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setRefundTarget(s)
                                setRefundAmount(0)
                                setRefundReason('')
                              }}
                              className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-600 transition-colors hover:bg-amber-500/20"
                            >
                              <Undo2 size={10} />
                              Refund
                            </button>
                            <button
                              onClick={() => handleCancelSubscription(s._id)}
                              disabled={modifyingId === s._id}
                              className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                            >
                              <XCircle size={10} />
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePlanChange(s._id, 'pro')}
                        disabled={modifyingId === s._id}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-500 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        <CheckCircle2 size={10} />
                        Reactivate
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stripe Webhooks Section */}
      {showWebhooks && (
        <div className="border-border/40 overflow-hidden rounded-2xl border">
          <div className="border-border/30 flex items-center justify-between border-b px-5 py-3">
            <h2 className="text-lg font-bold">Stripe Webhooks</h2>
            <button
              onClick={() => setShowWebhooks(false)}
              className="text-muted-foreground hover:text-foreground text-xs font-bold"
            >
              Close
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                <th className="px-4 py-2 text-start">Event</th>
                <th className="px-4 py-2 text-start">Status</th>
                <th className="px-4 py-2 text-start">Details</th>
                <th className="px-4 py-2 text-end">Time</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((w) => (
                <tr key={String(w._id)} className="border-border/20 border-b">
                  <td className="px-4 py-2 font-mono text-xs">
                    {String((w as { metadata?: { eventType?: string } }).metadata?.eventType ?? '—')}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                        w.outcome === 'success'
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : 'bg-red-500/15 text-red-500'
                      }`}
                    >
                      {String(w.outcome ?? '—')}
                    </span>
                  </td>
                  <td className="text-muted-foreground max-w-[200px] truncate px-4 py-2 text-xs">
                    {String(w.details ?? '—')}
                  </td>
                  <td className="text-muted-foreground px-4 py-2 text-end text-xs">
                    {new Date(String(w.timestamp)).toLocaleString()}
                  </td>
                </tr>
              ))}
              {webhooks.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted-foreground px-4 py-6 text-center">
                    No webhook events found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {webhookTotalPages > 1 && (
            <div className="border-border/30 flex items-center justify-between border-t px-4 py-3">
              <button
                onClick={() => {
                  setWebhookPage((p) => Math.max(1, p - 1))
                  fetchWebhooks(webhookPage - 1)
                }}
                disabled={webhookPage === 1}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs font-bold"
              >
                Previous
              </button>
              <span className="text-muted-foreground text-xs">
                {webhookPage} / {webhookTotalPages}
              </span>
              <button
                onClick={() => {
                  setWebhookPage((p) => Math.min(webhookTotalPages, p + 1))
                  fetchWebhooks(webhookPage + 1)
                }}
                disabled={webhookPage >= webhookTotalPages}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs font-bold"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card mx-4 w-full max-w-md rounded-3xl border p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold">Issue Refund</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              {refundTarget.name} — {refundTarget.email}
            </p>
            <div className="space-y-3">
              <input
                type="number"
                min="0"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                placeholder="Amount (USD)"
                className="bg-background border-border w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
              />
              <input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason for refund"
                className="bg-background border-border w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
              />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setRefundTarget(null)}
                className="text-muted-foreground hover:bg-muted rounded-xl px-5 py-2.5 text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={refundAmount <= 0 || !refundReason.trim()}
                className="bg-amber-500 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                Issue Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
