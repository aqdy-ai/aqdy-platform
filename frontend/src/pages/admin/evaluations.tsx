import { useEffect, useState } from 'react'
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
}: {
  title: string
  value: string | number
}) {
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

export default function AdminEvaluations() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<DailyStat[]>([])
  const [lowScores, setLowScores] = useState<Evaluation[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingLow, setLoadingLow] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminApi.getEvaluationStats()
        if (res.data.success) setStats(res.data.data)
        else toast.error(t('evaluations.error_stats'))
      } catch {
        toast.error(t('evaluations.error_generic'))
      } finally {
        setLoadingStats(false)
      }
    }
    const fetchLow = async () => {
      try {
        const res = await adminApi.getLowScores()
        if (res.data.success) setLowScores(res.data.data)
        else toast.error(t('evaluations.error_low'))
      } catch {
        toast.error(t('evaluations.error_generic'))
      } finally {
        setLoadingLow(false)
      }
    }
    fetchStats()
    fetchLow()
  }, [t])

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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t('evaluations.faithfulness')}
          value={hasData ? latest.avgFaithfulness.toFixed(2) : '—'}
        />
        <MetricCard
          title={t('evaluations.relevancy')}
          value={hasData ? latest.avgRelevancy.toFixed(2) : '—'}
        />
        <MetricCard
          title={t('evaluations.precision')}
          value={hasData ? latest.avgPrecision.toFixed(2) : '—'}
        />
        <MetricCard
          title={t('evaluations.recall')}
          value={hasData ? latest.avgRecall.toFixed(2) : '—'}
        />
      </div>

      {/* Trends Line Chart */}
      <section className="border-border/40 bg-card/30 rounded-2xl border p-6 shadow-sm">
        <h2 className="text-muted-foreground mb-4 font-semibold uppercase">
          {t('evaluations.daily_trends')}
        </h2>
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
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgFaithfulness"
                name={t('evaluations.faithfulness')}
                stroke="#6366f1"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="avgRelevancy"
                name={t('evaluations.relevancy')}
                stroke="#22c55e"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="avgPrecision"
                name={t('evaluations.precision')}
                stroke="#f59e0b"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="avgRecall"
                name={t('evaluations.recall')}
                stroke="#ef4444"
                dot={false}
              />
            </ReLineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Low-Score Table */}
      <section className="border-border/40 bg-card/30 rounded-2xl border p-6 shadow-sm">
        <h2 className="text-muted-foreground mb-4 font-semibold uppercase">
          {t('evaluations.low_scores')}
        </h2>
        {loadingLow ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
          </div>
        ) : lowScores.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
            <p className="text-muted-foreground text-sm">
              {t('evaluations.no_evaluations')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="text-muted-foreground px-4 py-2 text-left text-xs font-medium">
                    {t('evaluations.analysis_id')}
                  </th>
                  <th className="text-muted-foreground px-4 py-2 text-left text-xs font-medium">
                    {t('evaluations.lowest_metric')}
                  </th>
                  <th className="text-muted-foreground px-4 py-2 text-left text-xs font-medium">
                    {t('evaluations.score')}
                  </th>
                  <th className="text-muted-foreground px-4 py-2 text-left text-xs font-medium">
                    {t('evaluations.reasoning')}
                  </th>
                  <th className="text-muted-foreground px-4 py-2 text-center text-xs font-medium">
                    {t('evaluations.action')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {lowScores.map((e) => {
                  const { metric, value } = getLowestMetric(e)
                  const reasoning =
                    e.reasoning[metric as keyof typeof e.reasoning] ?? ''
                  return (
                    <tr key={e._id} className="border-border/20 border-b">
                      <td className="text-foreground px-4 py-2 text-sm">
                        {e.analysisId?.toString().slice(0, 12)}…
                      </td>
                      <td className="text-foreground px-4 py-2 text-sm capitalize">
                        {metricLabel(metric)}
                      </td>
                      <td className="text-foreground px-4 py-2 text-sm">
                        {value}
                      </td>
                      <td
                        className="text-muted-foreground max-w-xs truncate px-4 py-2 text-sm"
                        title={reasoning}
                      >
                        {reasoning}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1 text-xs font-medium transition-colors"
                          onClick={() => {
                            toast.info(
                              t('evaluations.inspect', { id: e.analysisId })
                            )
                          }}
                        >
                          {t('evaluations.view')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
