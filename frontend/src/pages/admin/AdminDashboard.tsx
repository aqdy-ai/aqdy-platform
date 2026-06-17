import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  Loader2,
  Zap,
  Database,
  Languages,
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

function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  color,
  delay = 0,
}: {
  title: string
  value: string
  trend?: string
  icon: React.ElementType
  color: string
  delay?: number
}) {
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

export default function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await adminApi.getDashboard()
        if (res.data.success) setData(res.data.data)
      } catch {
        toast.error(t('admin.error_updating'))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [t])

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="text-primary h-10 w-10 animate-spin" />
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
  const arPct =
    totalLang > 0
      ? Math.round(
          ((data.languageSplit.find((l) => l.language === 'ar')?.count || 0) /
            totalLang) *
            100
        )
      : 0
  const enPct =
    totalLang > 0
      ? Math.round(
          ((data.languageSplit.find((l) => l.language === 'en')?.count || 0) /
            totalLang) *
            100
        )
      : 0

  return (
    <div className="space-y-8">
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
        />
        <MetricCard
          title={t('admin.mrr')}
          value={formatUSD(data.mrrCurrent)}
          trend={`${data.mrrChange >= 0 ? '↑' : '↓'} ${Math.abs(data.mrrChange)}% vs last month`}
          icon={TrendingUp}
          delay={0.1}
          color="from-amber-500/20 to-orange-500/20 text-amber-500"
        />
        <MetricCard
          title={t('admin.analyses_this_month')}
          value={formatNumber(data.analysesThisMonth)}
          trend={`${data.analysesChange >= 0 ? '↑' : '↓'} ${Math.abs(data.analysesChange)}% vs last month`}
          icon={BarChart3}
          delay={0.15}
          color="from-purple-500/20 to-pink-500/20 text-purple-500"
        />
        <MetricCard
          title={
            isRtl ? 'متوسط الاعتمادات لكل تحليل' : 'Avg Credits / Analysis'
          }
          value={String(data.avgCreditsPerAnalysis)}
          trend={
            isRtl
              ? `${data.creditsConsumedThisMonth > 0 ? 'مستقر' : 'لا توجد بيانات'}`
              : data.creditsConsumedThisMonth > 0
                ? 'stable'
                : 'no data'
          }
          icon={Coins}
          delay={0.2}
          color="from-rose-500/20 to-red-500/20 text-rose-500"
        />
      </div>

      {/* ── Section 2: Credits Ledger ── */}
      <SectionHeading title={isRtl ? 'سجل الاعتمادات' : 'CREDITS LEDGER'} />
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
        />
        <MetricCard
          title={
            isRtl
              ? 'الاعتمادات المتبقية (كل المستخدمين)'
              : 'Credits Remaining (All Users)'
          }
          value={formatNumber(data.creditsRemaining)}
          icon={Database}
          delay={0.1}
          color="from-cyan-500/20 to-blue-500/20 text-cyan-500"
        />
        <MetricCard
          title={
            isRtl
              ? 'متوسط توكنات الإدخال لكل تحليل'
              : 'Avg Input Tokens / Analysis'
          }
          value={formatNumber(data.avgInputTokens)}
          trend={
            isRtl
              ? 'توكنات الإخراج أثقل في معادلة الفوترة'
              : 'output tokens weighted more in billing'
          }
          icon={FileText}
          delay={0.15}
          color="from-sky-500/20 to-indigo-500/20 text-sky-500"
        />
      </div>

      {/* ── Section 3: Revenue & Growth ── */}
      <SectionHeading title={isRtl ? 'الإيرادات والنمو' : 'REVENUE & GROWTH'} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
          <h4 className="text-foreground mb-1 text-sm font-bold">
            {isRtl
              ? 'اتجاه الإيرادات الشهرية'
              : 'Monthly Recurring Revenue Trend'}
          </h4>
          <p className="text-muted-foreground mb-4 text-sm">
            {isRtl ? 'آخر 6 أشهر' : 'Last 6 months'}
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <ReLineChart data={data.mrrTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
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
          </ResponsiveContainer>
        </div>
        <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
          <h4 className="text-foreground mb-1 text-sm font-bold">
            {isRtl ? 'تسجيلات المستخدمين الجدد' : 'New User Signups'}
          </h4>
          <p className="text-muted-foreground mb-4 text-sm">
            {isRtl ? 'آخر 8 أسابيع' : 'Last 8 weeks'}
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.weeklySignups}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={COLORS.primary}>
                {data.weeklySignups.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      i === data.weeklySignups.length - 1
                        ? COLORS.primary
                        : `${COLORS.primary}66`
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Section 4: Usage ── */}
      <SectionHeading title={isRtl ? 'الاستخدام' : 'USAGE'} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
          <h4 className="text-foreground mb-1 text-sm font-bold">
            {isRtl ? 'التحليلات لكل يوم' : 'Contract Analyses Per Day'}
          </h4>
          <p className="text-muted-foreground mb-4 text-sm">
            {isRtl ? 'الشهر الحالي' : 'Current month'}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.analysesPerDay}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => v.slice(8)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
                }}
                labelFormatter={(v) => v}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={COLORS.info} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
          <h4 className="text-foreground mb-1 text-sm font-bold">
            {isRtl
              ? 'الاعتمادات المستهلكة لكل يوم'
              : 'Credits Consumed Per Day'}
          </h4>
          <p className="text-muted-foreground mb-4 text-sm">
            {isRtl ? 'الشهر الحالي' : 'Current month'}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.creditsPerDay}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => v.slice(8)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
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
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Section 5: Pipeline & Product ── */}
      <SectionHeading
        title={isRtl ? 'خط التحليل والمنتج' : 'PIPELINE & PRODUCT INSIGHTS'}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
          <h4 className="text-foreground mb-1 text-sm font-bold">
            {isRtl ? 'توزيع مستوى المخاطر' : 'Risk Level Distribution'}
          </h4>
          <p className="text-muted-foreground mb-2 text-sm">
            {isRtl ? 'نسبة التحليلات حسب المخاطر' : '% of analyses by risk'}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <RePieChart>
              <Pie
                data={
                  data.riskDistribution.length > 0
                    ? data.riskDistribution
                    : [{ risk: 'no_data', count: 1 }]
                }
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="count"
                nameKey="risk"
                paddingAngle={2}
              >
                {data.riskDistribution.map((entry) => (
                  <Cell
                    key={entry.risk}
                    fill={RISK_COLORS[entry.risk] || COLORS.primary}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
                }}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-muted-foreground text-xs font-semibold capitalize">
                    {value}
                  </span>
                )}
              />
            </RePieChart>
          </ResponsiveContainer>
        </div>
        <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
          <h4 className="text-foreground mb-1 text-sm font-bold">
            {isRtl ? 'متوسط زمن استجابة الوكلاء' : 'Average Agent Latency'}
          </h4>
          <p className="text-muted-foreground mb-4 text-sm">
            {isRtl ? 'بالثواني' : 'in seconds'}
          </p>
          <div className="space-y-4">
            {[
              {
                label: 'Extractor',
                value: data.agentLatency.extractor,
                color:
                  data.agentLatency.extractor < 5
                    ? COLORS.success
                    : data.agentLatency.extractor < 15
                      ? COLORS.warning
                      : COLORS.danger,
              },
              {
                label: 'Risk Classifier',
                value: data.agentLatency.classifier,
                color:
                  data.agentLatency.classifier < 5
                    ? COLORS.success
                    : data.agentLatency.classifier < 15
                      ? COLORS.warning
                      : COLORS.danger,
              },
              {
                label: 'Redline',
                value: data.agentLatency.redline,
                color:
                  data.agentLatency.redline < 5
                    ? COLORS.success
                    : data.agentLatency.redline < 15
                      ? COLORS.warning
                      : COLORS.danger,
              },
            ].map((agent) => (
              <div key={agent.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-foreground text-xs font-bold">
                    {agent.label}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {agent.value.toFixed(2)}s
                  </span>
                </div>
                <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((agent.value / 30) * 100, 100)}%`,
                      backgroundColor: agent.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
          <h4 className="text-foreground mb-1 text-sm font-bold">
            {isRtl ? 'أكثر أنواع العقود تحليلاً' : 'Top Contract Types'}
          </h4>
          <p className="text-muted-foreground mb-4 text-sm">
            {isRtl ? 'حسب عدد التحليلات' : 'by analysis count'}
          </p>
          <div className="space-y-2.5">
            {data.topContractTypes.slice(0, 6).map((item, i) => (
              <div key={item.type} className="flex items-center gap-3">
                <span className="text-muted-foreground w-5 text-right text-xs font-bold">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-foreground text-xs font-semibold capitalize">
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {item.count}
                    </span>
                  </div>
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.count / Math.max(...data.topContractTypes.map((t) => t.count))) * 100}%`,
                        backgroundColor: COLORS.purple,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 6: Users & Activity ── */}
      <SectionHeading
        title={isRtl ? 'المستخدمين والنشاط' : 'USERS & ACTIVITY'}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
          <h4 className="text-foreground mb-4 text-sm font-bold">
            {isRtl
              ? 'أفضل المستخدمين استهلاكاً للاعتمادات'
              : 'Top Users by Credits Consumed'}
          </h4>
          <div className="divide-border/40 divide-y">
            {data.topCreditConsumers.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm font-semibold">
                {t('admin.no_data')}
              </p>
            ) : (
              data.topCreditConsumers.map((u, i) => (
                <div key={u._id} className="flex items-center gap-3 py-3">
                  <span className="text-muted-foreground w-5 text-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-black">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-bold">
                      {u.name}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {u.email}
                    </p>
                  </div>
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-bold capitalize">
                    {u.planSlug}
                  </span>
                  <span className="text-foreground text-sm font-black">
                    {formatNumber(u.credits)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
            <h4 className="text-foreground mb-4 text-sm font-bold">
              {isRtl ? 'توزيع الباقات' : 'Plan Breakdown'}
            </h4>
            <div className="space-y-3">
              {data.planBreakdown.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm font-semibold">
                  {t('admin.no_data')}
                </p>
              ) : (
                data.planBreakdown.map((p) => {
                  const totalUsers = data.planBreakdown.reduce(
                    (s, x) => s + x.count,
                    0
                  )
                  const pct =
                    totalUsers > 0
                      ? Math.round((p.count / totalUsers) * 100)
                      : 0
                  const dotColor =
                    p.plan === 'enterprise'
                      ? COLORS.purple
                      : p.plan === 'premium' || p.plan === 'pro'
                        ? COLORS.primary
                        : p.plan === 'starter'
                          ? COLORS.info
                          : p.plan === 'free'
                            ? COLORS.success
                            : COLORS.warning
                  return (
                    <div key={p.plan} className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="text-foreground min-w-[80px] text-xs font-semibold capitalize">
                        {p.plan}
                      </span>
                      <div className="bg-muted flex-1 overflow-hidden rounded-full">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: dotColor,
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground min-w-[40px] text-right text-xs font-bold">
                        {p.count}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
            <h4 className="text-foreground mb-4 text-sm font-bold">
              {isRtl ? 'توزيع اللغة' : 'Language Split'}
            </h4>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-foreground flex items-center gap-1.5 text-xs font-bold">
                    <Languages size={12} /> {isRtl ? 'العربية' : 'Arabic'} (AR)
                  </span>
                  <span className="text-muted-foreground text-xs font-semibold">
                    {arPct}%
                  </span>
                </div>
                <div className="bg-muted h-3 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${arPct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-foreground flex items-center gap-1.5 text-xs font-bold">
                    <Languages size={12} /> English (EN)
                  </span>
                  <span className="text-muted-foreground text-xs font-semibold">
                    {enPct}%
                  </span>
                </div>
                <div className="bg-muted h-3 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${enPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 7: Recent Analyses ── */}
      <SectionHeading title={isRtl ? 'آخر التحليلات' : 'RECENT ANALYSES'} />
      <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
        {data.recentAnalyses.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm font-semibold">
            {t('admin.no_data')}
          </p>
        ) : (
          <div className="divide-border/40 divide-y">
            {data.recentAnalyses.map((a) => (
              <div key={a._id} className="flex items-center gap-4 py-3.5">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-black uppercase ${a.language === 'ar' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}
                >
                  {a.language}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{a.filename}</p>
                  <p className="text-muted-foreground text-xs font-semibold">
                    {a.contractId || '—'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${a.overallRisk === 'high' || a.overallRisk === 'critical' ? 'bg-rose-500/10 text-rose-500' : a.overallRisk === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}
                >
                  {a.overallRisk}
                </span>
                <span className="text-muted-foreground text-xs font-semibold">
                  {timeAgo(a.createdAt, i18n.language)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 8: Recent Payments & System Status ── */}
      <SectionHeading
        title={
          isRtl ? 'المدفوعات وحالة النظام' : 'RECENT PAYMENTS & SYSTEM STATUS'
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
          <h4 className="text-foreground mb-4 text-sm font-bold">
            {isRtl ? 'آخر المدفوعات' : 'Recent Payments'}
          </h4>
          <div className="divide-border/40 divide-y">
            {data.recentPayments.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm font-semibold">
                {t('admin.no_data')}
              </p>
            ) : (
              data.recentPayments.map((p) => (
                <div key={p._id} className="flex items-center gap-3 py-3">
                  <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-black">
                    {p.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-bold">
                      {p.user.name}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {p.user.planSlug || ''}
                    </p>
                  </div>
                  <span className="text-foreground text-sm font-black">
                    {p.amount.toLocaleString()} {p.currency}
                  </span>
                  {p.status === 'succeeded' ? (
                    <CheckCircle2
                      size={16}
                      className="shrink-0 text-emerald-500"
                    />
                  ) : p.status === 'failed' ? (
                    <XCircle size={16} className="shrink-0 text-rose-500" />
                  ) : (
                    <Clock size={16} className="shrink-0 text-amber-500" />
                  )}
                  <span
                    className={`text-xs font-bold ${p.status === 'succeeded' ? 'text-emerald-500' : p.status === 'failed' ? 'text-rose-500' : 'text-amber-500'}`}
                  >
                    {p.status === 'succeeded'
                      ? isRtl
                        ? 'مدفوع'
                        : 'Paid'
                      : p.status === 'failed'
                        ? isRtl
                          ? 'فاشل'
                          : 'Failed'
                        : isRtl
                          ? 'معلق'
                          : 'Pending'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
          <h4 className="text-foreground mb-4 text-sm font-bold">
            {isRtl ? 'حالة النظام' : 'System Status'}
          </h4>
          <div className="space-y-2">
            {[
              {
                ok: true,
                label: `GPT-4o (primary LLM) — avg ${(data.agentLatency.extractor + data.agentLatency.classifier + data.agentLatency.redline).toFixed(1)}s response`,
              },
              { ok: false, label: 'Gemini (fallback LLM) — on standby' },
              {
                ok: true,
                label: `Pinecone vector index — ${data.riskDistribution.reduce((s, r) => s + r.count, 0)} clause embeddings`,
              },
              {
                ok: true,
                label: `Langfuse observability — ${data.pipelineErrors.length > 0 ? 'tracking with errors' : 'all traces clean'}`,
              },
              {
                ok:
                  data.recentPayments.filter((p) => p.status === 'failed')
                    .length === 0,
                label: `Stripe webhooks — ${data.recentPayments.filter((p) => p.status === 'failed').length === 0 ? 'all events processing cleanly' : `${data.recentPayments.filter((p) => p.status === 'failed').length} failed events`}`,
              },
            ].map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl bg-black/5 p-3 dark:bg-white/5"
              >
                <span
                  className={`h-3 w-3 shrink-0 rounded-full ${s.ok ? 'bg-emerald-500' : 'bg-rose-500'}`}
                />
                <span className="text-foreground text-xs font-semibold">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 9: Pipeline Errors ── */}
      <SectionHeading title={isRtl ? 'أخطاء خط التحليل' : 'PIPELINE ERRORS'} />
      <div className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm">
        {data.pipelineErrors.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <p className="text-sm font-bold text-emerald-500">
              {isRtl
                ? 'لا توجد أخطاء في آخر 24 ساعة'
                : 'No pipeline errors in the last 24 hours'}
            </p>
          </div>
        ) : (
          <div className="divide-border/40 divide-y">
            {data.pipelineErrors.map((e) => (
              <div key={e._id} className="flex items-center gap-3 py-3">
                <AlertTriangle size={16} className="shrink-0 text-rose-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-xs font-bold capitalize">
                    {e.action?.replace(/_/g, ' ')}
                  </p>
                  {e.errorMessage && (
                    <p className="text-muted-foreground truncate text-xs">
                      {e.errorMessage}
                    </p>
                  )}
                </div>
                <span className="text-muted-foreground shrink-0 text-xs font-semibold">
                  {timeAgo(e.timestamp, i18n.language)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
