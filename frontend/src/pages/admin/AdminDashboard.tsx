import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '../../hooks/usePermissions'
import { motion } from 'framer-motion'
import { Users, TrendingUp, BarChart3, Layers, Coins, Zap } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  AreaChart,
  Area,
  Cell,
} from 'recharts'
import { adminApi, DashboardData } from '../../services/adminApi'
import { toast } from 'sonner'
import {
  DashboardFilterProvider,
  useDashboardFilter,
} from '../../context/DashboardFilterContext'
import { DateRangeFilter } from '../../components/admin/DateRangeFilter'
import { useDateRangeFilter } from '../../hooks/useDateRangeFilter'

const COLORS = {
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
}

function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  color,
  delay = 0,
  loading = false,
}: {
  title: string
  value: string
  trend?: string
  icon: React.ElementType
  color: string
  delay?: number
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="border-border/40 bg-card/45 min-h-[130px] animate-pulse rounded-2xl border p-6">
        <div className="bg-muted mb-4 h-4 w-2/3 rounded" />
        <div className="bg-muted h-8 w-1/3 rounded" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="border-border/40 bg-card/40 hover:border-primary/30 relative min-h-[130px] overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          {title}
        </span>
        <div className={`rounded-xl bg-gradient-to-br p-2.5 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-foreground text-3xl font-black tracking-tight">
          {value}
        </h3>
        {trend && (
          <p className="text-muted-foreground mt-1 text-xs font-semibold">
            {trend}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="text-muted-foreground mb-4 text-sm font-black tracking-widest uppercase">
      {title}
    </h3>
  )
}

const formatNumber = (n: number) => n.toLocaleString()
const formatUSD = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

function AdminDashboardContent() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  usePermissions()
  const globalFilter = useDashboardFilter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  // Chart Date Filters
  const mrrFilter = useDateRangeFilter()
  const signupsFilter = useDateRangeFilter()
  const analysesFilter = useDateRangeFilter()
  const creditsFilter = useDateRangeFilter()

  const [mrrData, setMrrData] = useState<DashboardData['mrrTrend'] | null>(null)
  const [signupsData, setSignupsData] = useState<
    DashboardData['weeklySignups'] | null
  >(null)
  const [analysesData, setAnalysesData] = useState<
    DashboardData['analysesPerDay'] | null
  >(null)
  const [creditsData, setCreditsData] = useState<
    DashboardData['creditsPerDay'] | null
  >(null)

  const controllersRef = useRef(new Map<string, AbortController>())

  const fetchData = useCallback(
    async (
      endpoint: string,
      params: { startDate?: string; endDate?: string },
      onSuccess: (data: DashboardData) => void,
      onFinish: () => void
    ) => {
      const controllers = controllersRef.current
      if (controllers.has(endpoint)) {
        controllers.get(endpoint)?.abort()
      }
      const controller = new AbortController()
      controllers.set(endpoint, controller)

      try {
        const res = await adminApi.getDashboard({ ...params })
        if (res.data.success) {
          onSuccess(res.data.data)
        }
      } catch (err: unknown) {
        const e = err as { name?: string }
        if (e.name !== 'CanceledError' && e.name !== 'AbortError') {
          toast.error(t('admin.error_updating'))
        }
      } finally {
        onFinish()
      }
    },
    [t]
  )

  useEffect(() => {
    fetchData(
      'global',
      { startDate: globalFilter.startDate, endDate: globalFilter.endDate },
      (d) => {
        setLoading(false)
        setData(d)
        if (!mrrFilter.isOverridden) setMrrData(d.mrrTrend)
        if (!signupsFilter.isOverridden) setSignupsData(d.weeklySignups)
        if (!analysesFilter.isOverridden) setAnalysesData(d.analysesPerDay)
        if (!creditsFilter.isOverridden) setCreditsData(d.creditsPerDay)
      },
      () => setLoading(false)
    )
  }, [
    fetchData,
    globalFilter.startDate,
    globalFilter.endDate,
    mrrFilter.isOverridden,
    signupsFilter.isOverridden,
    analysesFilter.isOverridden,
    creditsFilter.isOverridden,
  ])

  useEffect(() => {
    if (!mrrFilter.isOverridden) return
    fetchData(
      'mrr',
      { startDate: mrrFilter.startDate, endDate: mrrFilter.endDate },
      (d) => setMrrData(d.mrrTrend),
      () => {}
    )
  }, [
    fetchData,
    mrrFilter.startDate,
    mrrFilter.endDate,
    mrrFilter.isOverridden,
  ])

  useEffect(() => {
    if (!signupsFilter.isOverridden) return
    fetchData(
      'signups',
      { startDate: signupsFilter.startDate, endDate: signupsFilter.endDate },
      (d) => setSignupsData(d.weeklySignups),
      () => {}
    )
  }, [
    fetchData,
    signupsFilter.startDate,
    signupsFilter.endDate,
    signupsFilter.isOverridden,
  ])

  useEffect(() => {
    if (!analysesFilter.isOverridden) return
    fetchData(
      'analyses',
      { startDate: analysesFilter.startDate, endDate: analysesFilter.endDate },
      (d) => setAnalysesData(d.analysesPerDay),
      () => {}
    )
  }, [
    fetchData,
    analysesFilter.startDate,
    analysesFilter.endDate,
    analysesFilter.isOverridden,
  ])

  useEffect(() => {
    if (!creditsFilter.isOverridden) return
    fetchData(
      'credits',
      { startDate: creditsFilter.startDate, endDate: creditsFilter.endDate },
      (d) => setCreditsData(d.creditsPerDay),
      () => {}
    )
  }, [
    fetchData,
    creditsFilter.startDate,
    creditsFilter.endDate,
    creditsFilter.isOverridden,
  ])

  if (!data && loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="bg-muted h-6 w-1/4 rounded" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <MetricCard key={i} title="" value="" color="" loading={true} />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p className="text-muted-foreground text-sm font-semibold">
          {t('admin.no_data')}
        </p>
      </div>
    )
  }

  const totalLang = data.languageSplit.reduce((s, l) => s + l.count, 0)
  const _arPct =
    totalLang > 0
      ? Math.round(
          ((data.languageSplit.find((l) => l.language === 'ar')?.count || 0) /
            totalLang) *
            100
        )
      : 0
  const _enPct =
    totalLang > 0
      ? Math.round(
          ((data.languageSplit.find((l) => l.language === 'en')?.count || 0) /
            totalLang) *
            100
        )
      : 0

  return (
    <div className="space-y-8">
      {/* Global Filter */}
      <DateRangeFilter
        initialStartDate={globalFilter.startDate}
        initialEndDate={globalFilter.endDate}
        onApply={(s, e) => globalFilter.setDates(s, e)}
        onReset={() => globalFilter.resetDates()}
      />

      {/* ── Section 1: Business Overview ── */}
      <SectionHeading
        title={isRtl ? 'نظرة عامة على الأعمال' : 'BUSINESS OVERVIEW'}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title={t('admin.total_users')}
          value={formatNumber(data.totalAccounts)}
          trend={
            isRtl
              ? `↑ ${data.accountsThisWeek} هذا الأسبوع`
              : `↑ ${data.accountsThisWeek} this week`
          }
          icon={Users}
          delay={0}
          color="from-blue-500/20 to-indigo-500/20 text-indigo-500"
          loading={loading}
        />
        <MetricCard
          title={isRtl ? 'الاشتراكات المدفوعة' : 'Paid Subscriptions'}
          value={formatNumber(data.activeSubscriptions)}
          trend={
            isRtl
              ? `${data.mrrCurrent > 0 ? '↑' : ''} $${data.mrrCurrent} MRR`
              : `$${formatUSD(data.mrrCurrent)} MRR`
          }
          icon={Layers}
          delay={0.05}
          color="from-emerald-500/20 to-teal-500/20 text-emerald-500"
          loading={loading}
        />
        <MetricCard
          title={t('admin.mrr')}
          value={formatUSD(data.mrrCurrent)}
          trend={`${data.mrrChange >= 0 ? '↑' : '↓'} ${Math.abs(data.mrrChange)}% vs last month`}
          icon={TrendingUp}
          delay={0.1}
          color="from-amber-500/20 to-orange-500/20 text-amber-500"
          loading={loading}
        />
        <MetricCard
          title={t('admin.analyses_this_month')}
          value={formatNumber(data.analysesThisMonth)}
          trend={`${data.analysesChange >= 0 ? '↑' : '↓'} ${Math.abs(data.analysesChange)}% vs last month`}
          icon={BarChart3}
          delay={0.15}
          color="from-purple-500/20 to-pink-500/20 text-purple-500"
          loading={loading}
        />
        <MetricCard
          title={
            isRtl ? 'متوسط الاعتمادات لكل تحليل' : 'Avg Credits / Analysis'
          }
          value={String(data.avgCreditsPerAnalysis)}
          trend={
            isRtl
              ? data.creditsConsumedThisMonth > 0
                ? 'مستقر'
                : 'لا توجد بيانات'
              : data.creditsConsumedThisMonth > 0
                ? 'stable'
                : 'no data'
          }
          icon={Coins}
          delay={0.2}
          color="from-rose-500/20 to-red-500/20 text-rose-500"
          loading={loading}
        />
      </div>

      {/* ── Section 2: Credits Ledger ── */}
      <div className="flex items-center justify-between">
        <SectionHeading title={isRtl ? 'سجل الاعتمادات' : 'CREDITS LEDGER'} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          title={
            isRtl
              ? 'الاعتمادات المصدرة (كل الوقت)'
              : 'Credits Issued (All Time)'
          }
          value={formatNumber(data.creditsIssuedAllTime)}
          icon={Coins}
          delay={0}
          color="from-violet-500/20 to-purple-500/20 text-purple-500"
          loading={loading}
        />
        <MetricCard
          title={
            isRtl
              ? 'الاعتمادات المستهلكة هذا الشهر'
              : 'Credits Consumed This Month'
          }
          value={formatNumber(data.creditsConsumedThisMonth)}
          trend={
            data.creditsConsumedLastMonth > 0
              ? `${data.creditsConsumedThisMonth >= data.creditsConsumedLastMonth ? '↑' : '↓'} vs last month`
              : undefined
          }
          icon={Zap}
          delay={0.05}
          color="from-amber-500/20 to-yellow-500/20 text-amber-500"
          loading={loading}
        />
      </div>

      {/* ── Section 3: Revenue & Growth ── */}
      <div className="flex items-center justify-between">
        <SectionHeading
          title={isRtl ? 'الإيرادات والنمو' : 'REVENUE & GROWTH'}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border-border/40 bg-card/30 relative rounded-3xl border p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-foreground text-sm font-bold">
              {isRtl
                ? 'اتجاه الإيرادات الشهرية'
                : 'Monthly Recurring Revenue Trend'}
            </h4>
            <DateRangeFilter
              isPopover={true}
              initialStartDate={mrrFilter.startDate}
              initialEndDate={mrrFilter.endDate}
              isOverridden={mrrFilter.isOverridden}
              onApply={(s, e) => mrrFilter.applyCustomFilter(s, e)}
              onReset={() => mrrFilter.resetToGlobal()}
              onUseGlobal={() => mrrFilter.resetToGlobal()}
            />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            {mrrData ? (
              <ReLineChart data={mrrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                  }}
                  formatter={(value: number) => [formatUSD(value), 'MRR']}
                />
                <Line
                  type="monotone"
                  dataKey="usd"
                  stroke={COLORS.primary}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: COLORS.primary }}
                />
              </ReLineChart>
            ) : (
              <div className="bg-muted/20 h-full w-full animate-pulse rounded-lg" />
            )}
          </ResponsiveContainer>
        </div>
        <div className="border-border/40 bg-card/30 relative rounded-3xl border p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-foreground text-sm font-bold">
              {isRtl ? 'تسجيلات المستخدمين الجدد' : 'New User Signups'}
            </h4>
            <DateRangeFilter
              isPopover={true}
              initialStartDate={signupsFilter.startDate}
              initialEndDate={signupsFilter.endDate}
              isOverridden={signupsFilter.isOverridden}
              onApply={(s, e) => signupsFilter.applyCustomFilter(s, e)}
              onReset={() => signupsFilter.resetToGlobal()}
              onUseGlobal={() => signupsFilter.resetToGlobal()}
            />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            {signupsData ? (
              <BarChart data={signupsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  stroke="var(--muted-foreground)"
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  fill={COLORS.primary}
                >
                  {signupsData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === signupsData.length - 1
                          ? COLORS.primary
                          : `${COLORS.primary}66`
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <div className="bg-muted/20 h-full w-full animate-pulse rounded-lg" />
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Section 4: Usage ── */}
      <div className="flex items-center justify-between">
        <SectionHeading title={isRtl ? 'الاستخدام' : 'USAGE'} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border-border/40 bg-card/30 relative rounded-3xl border p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-foreground text-sm font-bold">
              {isRtl ? 'التحليلات لكل يوم' : 'Contract Analyses Per Day'}
            </h4>
            <DateRangeFilter
              isPopover={true}
              initialStartDate={analysesFilter.startDate}
              initialEndDate={analysesFilter.endDate}
              isOverridden={analysesFilter.isOverridden}
              onApply={(s, e) => analysesFilter.applyCustomFilter(s, e)}
              onReset={() => analysesFilter.resetToGlobal()}
              onUseGlobal={() => analysesFilter.resetToGlobal()}
            />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {analysesData ? (
              <BarChart data={analysesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                  stroke="var(--muted-foreground)"
                  tickFormatter={(v) => v.slice(8)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                  }}
                  labelFormatter={(v) => v}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={COLORS.info} />
              </BarChart>
            ) : (
              <div className="bg-muted/20 h-full w-full animate-pulse rounded-lg" />
            )}
          </ResponsiveContainer>
        </div>
        <div className="border-border/40 bg-card/30 relative rounded-3xl border p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-foreground text-sm font-bold">
              {isRtl
                ? 'الاعتمادات المستهلكة لكل يوم'
                : 'Credits Consumed Per Day'}
            </h4>
            <DateRangeFilter
              isPopover={true}
              initialStartDate={creditsFilter.startDate}
              initialEndDate={creditsFilter.endDate}
              isOverridden={creditsFilter.isOverridden}
              onApply={(s, e) => creditsFilter.applyCustomFilter(s, e)}
              onReset={() => creditsFilter.resetToGlobal()}
              onUseGlobal={() => creditsFilter.resetToGlobal()}
            />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {creditsData ? (
              <AreaChart data={creditsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                  stroke="var(--muted-foreground)"
                  tickFormatter={(v) => v.slice(8)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                  }}
                  labelFormatter={(v) => v}
                />
                <Area
                  type="monotone"
                  dataKey="credits"
                  stroke={COLORS.warning}
                  fill={`${COLORS.warning}33`}
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <div className="bg-muted/20 h-full w-full animate-pulse rounded-lg" />
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <DashboardFilterProvider>
      <AdminDashboardContent />
    </DashboardFilterProvider>
  )
}
