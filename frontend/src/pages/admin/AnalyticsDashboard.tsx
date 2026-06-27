import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '../../hooks/usePermissions'
import { motion } from 'framer-motion'
import {
  Users,
  TrendingUp,
  BarChart3,
  Layers,
  Coins,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  Database,
  Languages,
  Eye,
  Download,
  Volume2,
  VolumeX,
} from 'lucide-react'
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
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { adminApi, DashboardData } from '../../services/adminApi'
import { toast } from 'sonner'
import { DashboardFilterProvider, useDashboardFilter } from '../../context/DashboardFilterContext'
import { DateRangeFilter } from '../../components/admin/DateRangeFilter'
import { useDateRangeFilter } from '../../hooks/useDateRangeFilter'
import { useSpeech } from '../../hooks/useSpeech'

const COLORS = {
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
}

const RISK_COLORS: Record<string, string> = {
  high: COLORS.danger,
  medium: COLORS.warning,
  low: COLORS.success,
  critical: '#7f1d1d',
  unknown: '#6b7280',
}

function CompactMetricCard({
  title,
  value,
  trend,
  icon: Icon,
  color,
  loading = false,
}: {
  title: string
  value: string
  trend?: string
  icon: React.ElementType
  color: string
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="border border-border/40 bg-card/45 rounded-xl p-3 animate-pulse flex items-center justify-between min-h-[70px]">
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-muted rounded w-2/3" />
          <div className="h-5 bg-muted rounded w-1/3" />
        </div>
        <div className="h-8 w-8 bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className="border border-border/40 bg-card/40 hover:border-primary/20 flex items-center justify-between rounded-xl p-3 shadow-sm transition-all duration-300 min-h-[70px]">
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase truncate block">
          {title}
        </span>
        <div className="flex items-baseline gap-2 mt-0.5">
          <h4 className="text-foreground text-lg font-black tracking-tight truncate">
            {value}
          </h4>
          {trend && (
            <span className="text-[10px] font-bold text-muted-foreground truncate shrink-0">
              {trend}
            </span>
          )}
        </div>
      </div>
      <div className={`rounded-lg bg-gradient-to-br p-1.5 shrink-0 ml-2 ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
    </div>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="text-muted-foreground mb-4 text-xs font-black tracking-widest uppercase">
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

function timeAgo(dateStr: string, lang: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return lang === 'ar' ? 'الآن' : 'just now'
  if (mins < 60) return lang === 'ar' ? `منذ ${mins} د` : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return lang === 'ar' ? `منذ ${hours} س` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  return lang === 'ar' ? `منذ ${days} ي` : `${days}d ago`
}

function exportSection(sectionName: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return toast.error('No data to export')
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => String(r[h] ?? '')).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sectionName}-report.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Exported successfully')
}

function AnalyticsDashboardContent() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const { hasPermission } = usePermissions()
  const canViewUserData = hasPermission('accounts', 'read')
  
  const globalFilter = useDashboardFilter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  // Chart-specific override date filters
  const mrrFilter = useDateRangeFilter()
  const signupsFilter = useDateRangeFilter()
  const analysesFilter = useDateRangeFilter()
  const creditsFilter = useDateRangeFilter()
  const pipelineFilter = useDateRangeFilter()

  // Chart data holding overridden states
  const [mrrData, setMrrData] = useState<DashboardData['mrrTrend'] | null>(null)
  const [signupsData, setSignupsData] = useState<DashboardData['weeklySignups'] | null>(null)
  const [analysesData, setAnalysesData] = useState<DashboardData['analysesPerDay'] | null>(null)
  const [creditsData, setCreditsData] = useState<DashboardData['creditsPerDay'] | null>(null)
  const [pipelineData, setPipelineData] = useState<DashboardData['riskDistribution'] | null>(null)

  // TTS Hook
  const speech = useSpeech()

  // Abort Controllers for requests
  const controllers = useMemo(() => new Map<string, AbortController>(), [])

  const fetchData = async (
    endpoint: string,
    params: { startDate?: string; endDate?: string },
    onSuccess: (data: DashboardData) => void,
    onFinish: () => void
  ) => {
    if (controllers.has(endpoint)) {
      controllers.get(endpoint)?.abort()
    }
    const controller = new AbortController()
    controllers.set(endpoint, controller)

    try {
      const res = await adminApi.getDashboard({
        ...params,
      })
      if (res.data.success) {
        onSuccess(res.data.data)
      }
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        toast.error(t('admin.error_updating'))
      }
    } finally {
      onFinish()
    }
  }

  // Load general dashboard layout data (respecting Global filter dates)
  useEffect(() => {
    setLoading(true)
    fetchData(
      'global',
      { startDate: globalFilter.startDate, endDate: globalFilter.endDate },
      (d) => {
        setData(d)
        // sync default chart datasets if not overridden
        if (!mrrFilter.isOverridden) setMrrData(d.mrrTrend)
        if (!signupsFilter.isOverridden) setSignupsData(d.weeklySignups)
        if (!analysesFilter.isOverridden) setAnalysesData(d.analysesPerDay)
        if (!creditsFilter.isOverridden) setCreditsData(d.creditsPerDay)
        if (!pipelineFilter.isOverridden) setPipelineData(d.riskDistribution)
      },
      () => setLoading(false)
    )
  }, [globalFilter.startDate, globalFilter.endDate])

  // Chart-specific load triggers
  useEffect(() => {
    if (!mrrFilter.isOverridden) return
    fetchData('mrr', { startDate: mrrFilter.startDate, endDate: mrrFilter.endDate }, (d) => setMrrData(d.mrrTrend), () => {})
  }, [mrrFilter.startDate, mrrFilter.endDate, mrrFilter.isOverridden])

  useEffect(() => {
    if (!signupsFilter.isOverridden) return
    fetchData('signups', { startDate: signupsFilter.startDate, endDate: signupsFilter.endDate }, (d) => setSignupsData(d.weeklySignups), () => {})
  }, [signupsFilter.startDate, signupsFilter.endDate, signupsFilter.isOverridden])

  useEffect(() => {
    if (!analysesFilter.isOverridden) return
    fetchData('analyses', { startDate: analysesFilter.startDate, endDate: analysesFilter.endDate }, (d) => setAnalysesData(d.analysesPerDay), () => {})
  }, [analysesFilter.startDate, analysesFilter.endDate, analysesFilter.isOverridden])

  useEffect(() => {
    if (!creditsFilter.isOverridden) return
    fetchData('credits', { startDate: creditsFilter.startDate, endDate: creditsFilter.endDate }, (d) => setCreditsData(d.creditsPerDay), () => {})
  }, [creditsFilter.startDate, creditsFilter.endDate, creditsFilter.isOverridden])

  useEffect(() => {
    if (!pipelineFilter.isOverridden) return
    fetchData('pipeline', { startDate: pipelineFilter.startDate, endDate: pipelineFilter.endDate }, (d) => setPipelineData(d.riskDistribution), () => {})
  }, [pipelineFilter.startDate, pipelineFilter.endDate, pipelineFilter.isOverridden])

  // Build audio summary text dynamically
  const generatedSummary = useMemo(() => {
    if (!data) return ''
    if (isRtl) {
      return `ملخص التحليلات الحالية. إجمالي المستخدمين ${formatNumber(data.totalAccounts)}. الاشتراكات النشطة ${formatNumber(data.activeSubscriptions)}. الإيرادات المتكررة شهرياً هي ${formatUSD(data.mrrCurrent)}. تم إجراء ${formatNumber(data.analysesThisMonth)} تحليلاً هذا الشهر.`
    }
    return `Analytics Summary report. Total registered users is ${formatNumber(data.totalAccounts)}. Active paid subscriptions stand at ${formatNumber(data.activeSubscriptions)}. The Monthly Recurring Revenue is ${formatUSD(data.mrrCurrent)}. We completed ${formatNumber(data.analysesThisMonth)} analyses this month.`
  }, [data, isRtl])

  if (!data && loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-muted rounded animate-pulse w-1/4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CompactMetricCard key={i} title="" value="" icon={Users} color="" loading={true} />
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
  const arPct = totalLang > 0 ? Math.round(((data.languageSplit.find((l) => l.language === 'ar')?.count || 0) / totalLang) * 100) : 0
  const enPct = totalLang > 0 ? Math.round(((data.languageSplit.find((l) => l.language === 'en')?.count || 0) / totalLang) * 100) : 0

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Eye className="text-primary" size={24} />
          <h1 className="text-xl font-bold">
            {t('admin.analytics_dashboard')}
          </h1>
          <span className="bg-muted text-muted-foreground rounded-lg px-2 py-0.5 text-[10px] font-bold">
            {t('admin.readonly', { defaultValue: 'READ-ONLY' })}
          </span>
        </div>
        <button
          onClick={() => {
            const allData: Record<string, unknown>[] = [
              {
                totalAccounts: data.totalAccounts,
                accountsThisWeek: data.accountsThisWeek,
                activeSubscriptions: data.activeSubscriptions,
                totalAnalyses: data.totalAnalyses,
                mrr: data.mrrCurrent,
                mrrChange: data.mrrChange,
                creditsIssued: data.creditsIssuedAllTime,
                creditsConsumed: data.creditsConsumedThisMonth,
                analysesThisMonth: data.analysesThisMonth,
                avgCredits: data.avgCreditsPerAnalysis,
              },
            ]
            exportSection('full-dashboard', allData)
          }}
          className="bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
        >
          <Download size={12} />
          {t('admin.export_csv', { defaultValue: 'Export CSV' })}
        </button>
      </div>

      {/* ── Global Date Filter ── */}
      <DateRangeFilter
        initialStartDate={globalFilter.startDate}
        initialEndDate={globalFilter.endDate}
        onApply={(s, e) => globalFilter.setDates(s, e)}
        onReset={() => globalFilter.resetDates()}
      />

      {/* ── Compact KPI Cards Row ── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <CompactMetricCard
          title={t('admin.total_users')}
          value={formatNumber(data.totalAccounts)}
          trend={isRtl ? `↑ ${data.accountsThisWeek} هذا الأسبوع` : `↑ ${data.accountsThisWeek} this week`}
          icon={Users}
          color="from-blue-500/20 to-indigo-500/20 text-indigo-500"
          loading={loading}
        />
        <CompactMetricCard
          title={isRtl ? 'الاشتراكات المدفوعة' : 'Paid Subscriptions'}
          value={formatNumber(data.activeSubscriptions)}
          trend={isRtl ? `${data.mrrCurrent > 0 ? '↑' : ''} $${data.mrrCurrent} MRR` : `$${formatUSD(data.mrrCurrent)} MRR`}
          icon={Layers}
          color="from-emerald-500/20 to-teal-500/20 text-emerald-500"
          loading={loading}
        />
        <CompactMetricCard
          title={t('admin.mrr')}
          value={formatUSD(data.mrrCurrent)}
          trend={`${data.mrrChange >= 0 ? '↑' : '↓'} ${Math.abs(data.mrrChange)}% vs last month`}
          icon={TrendingUp}
          color="from-amber-500/20 to-orange-500/20 text-amber-500"
          loading={loading}
        />
        <CompactMetricCard
          title={t('admin.analyses_this_month')}
          value={formatNumber(data.analysesThisMonth)}
          trend={`${data.analysesChange >= 0 ? '↑' : '↓'} ${Math.abs(data.analysesChange)}% vs last month`}
          icon={BarChart3}
          color="from-purple-500/20 to-pink-500/20 text-purple-500"
          loading={loading}
        />
        <CompactMetricCard
          title={isRtl ? 'متوسط الاعتمادات لكل تحليل' : 'Avg Credits / Analysis'}
          value={String(data.avgCreditsPerAnalysis)}
          trend={isRtl ? (data.creditsConsumedThisMonth > 0 ? 'مستقر' : 'لا توجد بيانات') : (data.creditsConsumedThisMonth > 0 ? 'stable' : 'no data')}
          icon={Coins}
          color="from-rose-500/20 to-red-500/20 text-rose-500"
          loading={loading}
        />
      </div>

      {/* ── Charts Grid (Revenue, Signups, Usage) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Recurring Revenue */}
        <div className="border border-border/40 bg-card/30 rounded-3xl p-5 shadow-sm relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-foreground text-sm font-bold">
                {isRtl ? 'اتجاه الإيرادات الشهرية' : 'Monthly Recurring Revenue Trend'}
              </h4>
              <p className="text-muted-foreground text-xs">{isRtl ? 'آخر 6 أشهر' : 'Last 6 months'}</p>
            </div>
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
          <ResponsiveContainer width="100%" height={200}>
            {mrrData ? (
              <ReLineChart data={mrrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                  formatter={(value: number) => [formatUSD(value), 'MRR']}
                />
                <Line type="monotone" dataKey="usd" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3, fill: COLORS.primary }} />
              </ReLineChart>
            ) : (
              <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" />
            )}
          </ResponsiveContainer>
        </div>

        {/* User Signups */}
        <div className="border border-border/40 bg-card/30 rounded-3xl p-5 shadow-sm relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-foreground text-sm font-bold">
                {isRtl ? 'تسجيلات المستخدمين الجدد' : 'New User Signups'}
              </h4>
              <p className="text-muted-foreground text-xs">{isRtl ? 'آخر 8 أسابيع' : 'Last 8 weeks'}</p>
            </div>
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
          <ResponsiveContainer width="100%" height={200}>
            {signupsData ? (
              <BarChart data={signupsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} stroke="var(--muted-foreground)" tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={COLORS.primary}>
                  {signupsData.map((_, i) => (
                    <Cell key={i} fill={i === signupsData.length - 1 ? COLORS.primary : `${COLORS.primary}66`} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" />
            )}
          </ResponsiveContainer>
        </div>

        {/* Contract Analyses Per Day */}
        <div className="border border-border/40 bg-card/30 rounded-3xl p-5 shadow-sm relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-foreground text-sm font-bold">
                {isRtl ? 'التحليلات لكل يوم' : 'Contract Analyses Per Day'}
              </h4>
              <p className="text-muted-foreground text-xs">{isRtl ? 'الشهر الحالي' : 'Current month'}</p>
            </div>
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
          <ResponsiveContainer width="100%" height={180}>
            {analysesData ? (
              <BarChart data={analysesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'var(--muted-foreground)' }} stroke="var(--muted-foreground)" tickFormatter={(v) => v.slice(8)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }} labelFormatter={(v) => v} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} fill={COLORS.info} />
              </BarChart>
            ) : (
              <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" />
            )}
          </ResponsiveContainer>
        </div>

        {/* Credits Consumed Per Day */}
        <div className="border border-border/40 bg-card/30 rounded-3xl p-5 shadow-sm relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-foreground text-sm font-bold">
                {isRtl ? 'الاعتمادات المستهلكة لكل يوم' : 'Credits Consumed Per Day'}
              </h4>
              <p className="text-muted-foreground text-xs">{isRtl ? 'الشهر الحالي' : 'Current month'}</p>
            </div>
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
          <ResponsiveContainer width="100%" height={180}>
            {creditsData ? (
              <AreaChart data={creditsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'var(--muted-foreground)' }} stroke="var(--muted-foreground)" tickFormatter={(v) => v.slice(8)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }} labelFormatter={(v) => v} />
                <Area type="monotone" dataKey="credits" stroke={COLORS.warning} fill={`${COLORS.warning}33`} strokeWidth={1.5} />
              </AreaChart>
            ) : (
              <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" />
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── AI Summary & TTS Section ── */}
      {generatedSummary && (
        <div className="border border-border/40 bg-card/30 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h4 className="text-foreground text-sm font-bold">
              {isRtl ? 'ملخص تحليلات الذكاء الاصطناعي' : 'AI Analytics Summary'}
            </h4>
            <div className="flex items-center gap-2">
              {speech.isPlaying ? (
                <>
                  {speech.isPaused ? (
                    <button
                      onClick={speech.resume}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all"
                    >
                      <Volume2 size={13} />
                      {isRtl ? 'استئناف' : 'Resume'}
                    </button>
                  ) : (
                    <button
                      onClick={speech.pause}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-500 rounded-xl text-xs font-bold transition-all"
                    >
                      {isRtl ? 'إيقاف مؤقت' : 'Pause'}
                    </button>
                  )}
                  <button
                    onClick={speech.stop}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 text-rose-500 rounded-xl text-xs font-bold transition-all"
                  >
                    <VolumeX size={13} />
                    {isRtl ? 'إيقاف' : 'Stop'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => speech.play(generatedSummary, i18n.language)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  <Volume2 size={14} />
                  {isRtl ? 'استمع للملخص' : 'Listen Summary'}
                </button>
              )}
            </div>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed font-medium">
            {generatedSummary}
          </p>
        </div>
      )}

      {/* ── Substructures & Logs ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="border border-border/40 bg-card/30 rounded-3xl p-5 shadow-sm relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-foreground text-sm font-bold">
                {isRtl ? 'توزيع مستوى المخاطر' : 'Risk Level Distribution'}
              </h4>
              <p className="text-muted-foreground text-xs">{isRtl ? 'نسبة التحليلات حسب المخاطر' : '% of analyses by risk'}</p>
            </div>
            <DateRangeFilter
              isPopover={true}
              initialStartDate={pipelineFilter.startDate}
              initialEndDate={pipelineFilter.endDate}
              isOverridden={pipelineFilter.isOverridden}
              onApply={(s, e) => pipelineFilter.applyCustomFilter(s, e)}
              onReset={() => pipelineFilter.resetToGlobal()}
              onUseGlobal={() => pipelineFilter.resetToGlobal()}
            />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            {pipelineData ? (
              <RePieChart>
                <Pie
                  data={pipelineData.length > 0 ? pipelineData : [{ risk: 'no_data', count: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="count"
                  nameKey="risk"
                  paddingAngle={2}
                >
                  {pipelineData.map((entry) => (
                    <Cell key={entry.risk} fill={RISK_COLORS[entry.risk] || COLORS.primary} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }} />
                <Legend formatter={(value: string) => <span className="text-muted-foreground text-[10px] font-semibold capitalize">{value}</span>} />
              </RePieChart>
            ) : (
              <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" />
            )}
          </ResponsiveContainer>
        </div>

        {/* Avg Agent Latency */}
        <div className="border border-border/40 bg-card/30 rounded-3xl p-5 shadow-sm">
          <h4 className="text-foreground mb-3 text-sm font-bold">
            {isRtl ? 'متوسط زمن استجابة الوكلاء' : 'Average Agent Latency'}
          </h4>
          <p className="text-muted-foreground text-xs mb-3">{isRtl ? 'بالثواني' : 'in seconds'}</p>
          <div className="space-y-3">
            {[
              {
                label: 'Extractor',
                value: data.agentLatency.extractor,
                color: data.agentLatency.extractor < 5 ? COLORS.success : data.agentLatency.extractor < 15 ? COLORS.warning : COLORS.danger,
              },
              {
                label: 'Risk Classifier',
                value: data.agentLatency.classifier,
                color: data.agentLatency.classifier < 5 ? COLORS.success : data.agentLatency.classifier < 15 ? COLORS.warning : COLORS.danger,
              },
              {
                label: 'Redline',
                value: data.agentLatency.redline,
                color: data.agentLatency.redline < 5 ? COLORS.success : data.agentLatency.redline < 15 ? COLORS.warning : COLORS.danger,
              },
            ].map((agent) => (
              <div key={agent.label}>
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-foreground text-[11px] font-bold">{agent.label}</span>
                  <span className="text-muted-foreground text-[11px]">{agent.value.toFixed(2)}s</span>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((agent.value / 30) * 100, 100)}%`, backgroundColor: agent.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Contract Types */}
        <div className="border border-border/40 bg-card/30 rounded-3xl p-5 shadow-sm">
          <h4 className="text-foreground mb-3 text-sm font-bold">
            {isRtl ? 'أكثر أنواع العقود تحليلاً' : 'Top Contract Types'}
          </h4>
          <p className="text-muted-foreground text-xs mb-3">{isRtl ? 'حسب عدد التحليلات' : 'by analysis count'}</p>
          <div className="space-y-2">
            {data.topContractTypes.slice(0, 4).map((item, i) => (
              <div key={item.type} className="flex items-center gap-3">
                <span className="text-muted-foreground w-4 text-right text-xs font-bold">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-xs font-semibold capitalize truncate max-w-[120px]">{item.type.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground text-xs">{item.count}</span>
                  </div>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${(item.count / Math.max(...data.topContractTypes.map((t) => t.count))) * 100}%`, backgroundColor: COLORS.purple }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsDashboard() {
  return (
    <DashboardFilterProvider>
      <AnalyticsDashboardContent />
    </DashboardFilterProvider>
  )
}
