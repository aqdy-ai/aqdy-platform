import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  RefreshCw,
  XCircle,
  CheckCircle2,
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
import { DashboardFilterProvider, useDashboardFilter } from '../../context/DashboardFilterContext'
import { DateRangeFilter } from '../../components/admin/DateRangeFilter'
import { useDateRangeFilter } from '../../hooks/useDateRangeFilter'

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

function FinancialDashboardContent() {
  const { t } = useTranslation()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [planChangeMap, setPlanChangeMap] = useState<Record<string, string>>({})
  const [modifyingId, setModifyingId] = useState<string | null>(null)
  const { canWrite } = usePermissions()
  const canModify = canWrite('billing')

  // Date filters
  const globalFilter = useDashboardFilter()
  const chartFilter = useDateRangeFilter()

  // Refund modal
  const [refundTarget, setRefundTarget] = useState<Subscription | null>(null)
  const [refundAmount, setRefundAmount] = useState(0)
  const [refundReason, setRefundReason] = useState('')

  // Stripe webhooks
  const [showWebhooks, setShowWebhooks] = useState(false)
  const [webhooks, setWebhooks] = useState<Record<string, unknown>[]>([])
  const [webhookPage, setWebhookPage] = useState(1)
  const [webhookTotalPages, setWebhookTotalPages] = useState(1)

  // Chart local state
  const [chartRevenueData, setChartRevenueData] = useState<{ name: string; revenue: number }[]>([])

  const controllers = useMemo(() => new Map<string, AbortController>(), [])

  const fetchOverview = async (params: { startDate?: string; endDate?: string }, isGlobal: boolean) => {
    if (controllers.has('overview')) {
      controllers.get('overview')?.abort()
    }
    const controller = new AbortController()
    controllers.set('overview', controller)

    try {
      const res = await adminApi.getFinancialOverview(params)
      if (res.data.success) {
        const d = (res.data as { data: OverviewData }).data
        if (isGlobal) {
          setOverview(d)
        }
        // Build revenue split data
        const mapped = Object.entries(d.revenueByPlan).map(([plan, rev]) => ({
          name: t(`admin.plan_${plan.toLowerCase()}`, { defaultValue: plan }),
          revenue: rev,
        }))
        setChartRevenueData(mapped)
      }
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        toast.error(t('common.error'))
      }
    }
  }

  // Load subscriptions and plans once
  useEffect(() => {
    ;(async () => {
      try {
        const [subs, pl] = await Promise.all([
          adminApi.getSubscriptions(),
          adminApi.getPlans({ pageSize: 100 }),
        ])
        setSubscriptions((subs.data as { data: Subscription[] }).data)
        setPlans(pl.data.data)
      } catch {
        toast.error(t('common.error'))
      }
      setLoading(false)
    })()
  }, [t])

  // Track global filter dates
  useEffect(() => {
    fetchOverview({ startDate: globalFilter.startDate, endDate: globalFilter.endDate }, true)
  }, [globalFilter.startDate, globalFilter.endDate])

  // Track chart specific override
  useEffect(() => {
    if (!chartFilter.isOverridden) {
      if (overview) {
        const mapped = Object.entries(overview.revenueByPlan).map(([plan, rev]) => ({
          name: t(`admin.plan_${plan.toLowerCase()}`, { defaultValue: plan }),
          revenue: rev,
        }))
        setChartRevenueData(mapped)
      }
      return
    }
    fetchOverview({ startDate: chartFilter.startDate, endDate: chartFilter.endDate }, false)
  }, [chartFilter.startDate, chartFilter.endDate, chartFilter.isOverridden, overview])

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
      const res = await adminApi.getFinancialExport(
        globalFilter.startDate || undefined,
        globalFilter.endDate || undefined
      )
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

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-muted-foreground animate-pulse text-sm font-semibold">
          {t('common.loading')}
        </div>
      </div>
    )
  }

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

      {/* Global Date Filter */}
      <DateRangeFilter
        initialStartDate={globalFilter.startDate}
        initialEndDate={globalFilter.endDate}
        onApply={(s, e) => globalFilter.setDates(s, e)}
        onReset={() => globalFilter.resetDates()}
      />

      {/* Metric Cards */}
      {overview ? (
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
              className="border-border/40 rounded-2xl border p-5 bg-card/30"
            >
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold uppercase">
                <m.icon size={14} className={m.color} />
                {m.label}
              </div>
              <div className="mt-2 text-2xl font-bold">{m.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-border/40 rounded-2xl border p-5 h-24 bg-card/10 animate-pulse" />
          ))}
        </div>
      )}

      {/* Revenue Split Chart */}
      <div className="border-border/40 bg-card/30 rounded-3xl border p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{t('admin.revenue_split', { defaultValue: 'Revenue Split' })}</h3>
          <DateRangeFilter
            isPopover={true}
            initialStartDate={chartFilter.startDate}
            initialEndDate={chartFilter.endDate}
            isOverridden={chartFilter.isOverridden}
            onApply={(s, e) => chartFilter.applyCustomFilter(s, e)}
            onReset={() => chartFilter.resetToGlobal()}
            onUseGlobal={() => chartFilter.resetToGlobal()}
          />
        </div>
        <div className="h-[250px] w-full">
          {chartRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRevenueData}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <Tooltip />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {chartRevenueData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PLAN_COLORS[index % PLAN_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" />
          )}
        </div>
      </div>
    </div>
  )
}

export default function FinancialDashboard() {
  return (
    <DashboardFilterProvider>
      <FinancialDashboardContent />
    </DashboardFilterProvider>
  )
}
