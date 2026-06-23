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
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { usePermissions } from '../../hooks/usePermissions'
import { toast } from 'sonner'

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

export default function FinancialDashboard() {
  const { t } = useTranslation()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [planChangeMap, setPlanChangeMap] = useState<Record<string, string>>({})
  const [modifyingId, setModifyingId] = useState<string | null>(null)
  const { canWrite } = usePermissions()
  const canModify = canWrite('billing')

  useEffect(() => {
    ;(async () => {
      try {
        const [ov, subs] = await Promise.all([
          adminApi.getFinancialOverview(),
          adminApi.getSubscriptions(),
        ])
        setOverview((ov.data as { data: OverviewData }).data)
        setSubscriptions((subs.data as { data: Subscription[] }).data)
      } catch {
        toast.error(t('common.error'))
      }
      setLoading(false)
    })()
  }, [t])

  const handleExport = async () => {
    try {
      const res = await adminApi.getFinancialExport()
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
      await adminApi.changeSubscription(subscriptionId, 'change', newPlan)
      toast.success(t('admin.plan_updated'))
      setSubscriptions((prev) =>
        prev.map((s) =>
          s._id === subscriptionId ? { ...s, planSlug: newPlan } : s
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
    if (!window.confirm(t('admin.confirm_cancel', { defaultValue: 'Cancel this subscription?' }))) return
    try {
      setModifyingId(subscriptionId)
      await adminApi.changeSubscription(subscriptionId, 'cancel')
      toast.success(t('common.success'))
      setSubscriptions((prev) =>
        prev.map((s) =>
          s._id === subscriptionId ? { ...s, planSlug: 'free', status: 'cancelled' } : s
        )
      )
    } catch {
      toast.error(t('common.error'))
    }
    setModifyingId(null)
  }

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
          <h1 className="text-2xl font-bold">{t('admin.financial_dashboard')}</h1>
        </div>
        <button
          onClick={handleExport}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-bold transition-colors hover:opacity-90"
        >
          {t('admin.export_csv')}
        </button>
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

      {/* Revenue by Plan */}
      {overview && (
        <div className="border-border/40 rounded-2xl border p-5">
          <h2 className="mb-3 text-lg font-bold">{t('admin.revenue_by_plan')}</h2>
          <div className="flex gap-4">
            {Object.entries(overview.revenueByPlan).map(([plan, rev]) => (
              <div
                key={plan}
                className="bg-muted/50 rounded-xl px-4 py-3 text-center"
              >
                <div className="text-muted-foreground text-xs font-semibold uppercase">
                  {t(`admin.plan_${plan.toLowerCase()}`, { defaultValue: plan })}
                </div>
                <div className="text-xl font-bold">${rev.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscriptions Table */}
      <div className="border-border/40 overflow-hidden rounded-2xl border">
        <div className="border-border/30 border-b px-5 py-3">
          <h2 className="text-lg font-bold">{t('admin.subscriptions')}</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
              <th className="px-4 py-3 text-start">{t('admin.user')}</th>
              <th className="px-4 py-3 text-start">{t('admin.plan')}</th>
              <th className="px-4 py-3 text-start">{t('admin.credits')}</th>
              <th className="px-4 py-3 text-start">{t('admin.status')}</th>
              {canModify && <th className="px-4 py-3 text-end">{t('admin.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => (
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
                    {t(`admin.plan_${s.planSlug.toLowerCase()}`, { defaultValue: s.planSlug })}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{s.creditBalance}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-lg px-2 py-1 text-xs font-bold ${s.status === 'active' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-500'}`}
                  >
                    {t(`admin.status_${s.status.toLowerCase()}`, { defaultValue: s.status })}
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
                          <option value="free">Free</option>
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                        {(planChangeMap[s._id] && planChangeMap[s._id] !== s.planSlug) ? (
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
                          <button
                            onClick={() => handleCancelSubscription(s._id)}
                            disabled={modifyingId === s._id}
                            className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                          >
                            <XCircle size={10} />
                            Cancel
                          </button>
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
    </div>
  )
}
