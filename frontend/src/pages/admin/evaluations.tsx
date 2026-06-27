import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { adminApi } from '../../services/adminApi'
import { Loader2, BarChart3 } from 'lucide-react'
import {
  DashboardFilterProvider,
  useDashboardFilter,
} from '../../context/DashboardFilterContext'
import { DateRangeFilter } from '../../components/admin/DateRangeFilter'
import { useDateRangeFilter } from '../../hooks/useDateRangeFilter'

interface DailyStat {
  date: string
  avgFaithfulness: number
  avgRelevancy: number
  avgPrecision: number
  avgRecall: number
  count: number
}

interface Evaluation {
  _id: string
  analysisId: string
  faithfulness: number
  relevancy: number
  precision: number
  recall: number
  reasoning: {
    faithfulness?: string
    relevancy?: string
    precision?: string
    recall?: string
    overall?: string
  }
  createdAt: string
}

function MetricCard({
  title,
  value,
  loading = false,
}: {
  title: string
  value: string | number
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="border-border/40 bg-card/40 relative min-h-[130px] animate-pulse rounded-2xl border p-6">
        <div className="bg-muted mb-4 h-4 w-2/3 rounded" />
        <div className="bg-muted h-8 w-1/3 rounded" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border-border/40 bg-card/40 hover:border-primary/30 relative min-h-[130px] overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          {title}
        </span>
        <div className="from-primary/20 to-primary/20 text-primary rounded-xl bg-gradient-to-br p-2.5"></div>
      </div>
      <div className="mt-3">
        <h3 className="text-foreground text-3xl font-black tracking-tight">
          {value}
        </h3>
      </div>
    </motion.div>
  )
}

function AdminEvaluationsContent() {
  const { t } = useTranslation()
  const globalFilter = useDashboardFilter()
  const chartFilter = useDateRangeFilter()

  const [stats, setStats] = useState<DailyStat[]>([])
  const [lowScores, setLowScores] = useState<Evaluation[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingLow, setLoadingLow] = useState(true)

  const controllersRef = useRef(new Map<string, AbortController>())

  const fetchStats = useCallback(
    async (params: { startDate?: string; endDate?: string }) => {
      const controllers = controllersRef.current
      if (controllers.has('stats')) {
        controllers.get('stats')?.abort()
      }
      const controller = new AbortController()
      controllers.set('stats', controller)

      try {
        setLoadingStats(true)
        const res = await adminApi.getEvaluationStats(params)
        if (res.data.success) {
          setStats(res.data.data)
        } else {
          toast.error(t('evaluations.error_stats'))
        }
      } catch (err: unknown) {
        const e = err as { name?: string }
        if (e.name !== 'CanceledError' && e.name !== 'AbortError') {
          toast.error(t('evaluations.error_generic'))
        }
      } finally {
        setLoadingStats(false)
      }
    },
    [t]
  )

  const fetchLowScores = useCallback(
    async (params: { startDate?: string; endDate?: string }) => {
      const controllers = controllersRef.current
      if (controllers.has('lowScores')) {
        controllers.get('lowScores')?.abort()
      }
      const controller = new AbortController()
      controllers.set('lowScores', controller)

      try {
        setLoadingLow(true)
        const res = await adminApi.getLowScores(params)
        if (res.data.success) {
          setLowScores(res.data.data)
        } else {
          toast.error(t('evaluations.error_low'))
        }
      } catch (err: unknown) {
        const e = err as { name?: string }
        if (e.name !== 'CanceledError' && e.name !== 'AbortError') {
          toast.error(t('evaluations.error_generic'))
        }
      } finally {
        setLoadingLow(false)
      }
    },
    [t]
  )

  // Monitor global filter changes
  useEffect(() => {
    fetchLowScores({
      startDate: globalFilter.startDate,
      endDate: globalFilter.endDate,
    })
  }, [fetchLowScores, globalFilter.startDate, globalFilter.endDate])

  useEffect(() => {
    const activeStart = chartFilter.isOverridden
      ? chartFilter.startDate
      : globalFilter.startDate
    const activeEnd = chartFilter.isOverridden
      ? chartFilter.endDate
      : globalFilter.endDate
    fetchStats({ startDate: activeStart, endDate: activeEnd })
  }, [
    fetchStats,
    globalFilter.startDate,
    globalFilter.endDate,
    chartFilter.startDate,
    chartFilter.endDate,
    chartFilter.isOverridden,
  ])

  const hasData = stats.length > 0
  const latest = stats[stats.length - 1] ?? {
    avgFaithfulness: 0,
    avgRelevancy: 0,
    avgPrecision: 0,
    avgRecall: 0,
  }

  const getLowestMetric = (e: Evaluation) => {
    const scores = {
      faithfulness: e.faithfulness,
      relevancy: e.relevancy,
      precision: e.precision,
      recall: e.recall,
    }
    const entries = Object.entries(scores) as [keyof typeof scores, number][]
    const [metric, value] = entries.reduce((prev, cur) =>
      cur[1] < prev[1] ? cur : prev
    )
    return { metric, value }
  }

  const metricLabel = (key: string) => {
    const map: Record<string, string> = {
      faithfulness: t('evaluations.faithfulness'),
      relevancy: t('evaluations.relevancy'),
      precision: t('evaluations.precision'),
      recall: t('evaluations.recall'),
    }
    return map[key] ?? key
  }

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-foreground text-2xl font-bold">
        {t('evaluations.title')}
      </h1>

      {/* Global Date Filter */}
      <DateRangeFilter
        initialStartDate={globalFilter.startDate}
        initialEndDate={globalFilter.endDate}
        onApply={(s, e) => globalFilter.setDates(s, e)}
        onReset={() => globalFilter.resetDates()}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t('evaluations.faithfulness')}
          value={hasData ? latest.avgFaithfulness.toFixed(2) : '—'}
          loading={loadingStats}
        />
        <MetricCard
          title={t('evaluations.relevancy')}
          value={hasData ? latest.avgRelevancy.toFixed(2) : '—'}
          loading={loadingStats}
        />
        <MetricCard
          title={t('evaluations.precision')}
          value={hasData ? latest.avgPrecision.toFixed(2) : '—'}
          loading={loadingStats}
        />
        <MetricCard
          title={t('evaluations.recall')}
          value={hasData ? latest.avgRecall.toFixed(2) : '—'}
          loading={loadingStats}
        />
      </div>

      {/* Trends Line Chart */}
      <section className="border-border/40 bg-card/30 relative rounded-2xl border p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-muted-foreground font-semibold uppercase">
            {t('evaluations.daily_trends')}
          </h2>
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
        {loadingStats ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
            <BarChart3 className="text-muted-foreground h-10 w-10 opacity-40" />
            <p className="text-muted-foreground max-w-md text-sm">
              {t('evaluations.no_evaluations')}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ReLineChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                domain={[0, 5]}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              />
              <Tooltip />
              <Legend
                formatter={(value: string) => (
                  <span className="text-muted-foreground text-xs">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="avgFaithfulness"
                name={t('evaluations.faithfulness')}
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="avgRelevancy"
                name={t('evaluations.relevancy')}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="avgPrecision"
                name={t('evaluations.precision')}
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="avgRecall"
                name={t('evaluations.recall')}
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </ReLineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Low Score Evaluations */}
      <section className="space-y-4">
        <h2 className="text-muted-foreground font-semibold uppercase">
          {t('evaluations.low_scores', {
            defaultValue: 'Low Score Analytics (Requires Attention)',
          })}
        </h2>
        {loadingLow ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
          </div>
        ) : lowScores.length === 0 ? (
          <p className="text-muted-foreground border-border/40 bg-card/20 rounded-xl border p-4 text-center text-sm font-semibold">
            {t('evaluations.no_low_scores', {
              defaultValue: 'No low scores detected.',
            })}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {lowScores.map((e) => {
              const lowest = getLowestMetric(e)
              return (
                <div
                  key={e._id}
                  className="border-border/40 bg-card/30 space-y-3 rounded-2xl border p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-semibold">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </span>
                    <span className="bg-destructive/10 text-destructive rounded-lg px-2 py-0.5 text-xs font-bold capitalize">
                      {metricLabel(lowest.metric)}: {lowest.value.toFixed(1)}
                    </span>
                  </div>
                  {e.reasoning.overall && (
                    <p className="text-foreground text-sm font-medium">
                      {e.reasoning.overall}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default function AdminEvaluations() {
  return (
    <DashboardFilterProvider>
      <AdminEvaluationsContent />
    </DashboardFilterProvider>
  )
}
