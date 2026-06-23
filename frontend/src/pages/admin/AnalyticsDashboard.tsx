import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, Download } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import type { DashboardData } from '../../services/adminApi'
import { toast } from 'sonner'

export default function AnalyticsDashboard() {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await adminApi.getDashboard()
        setData(res.data.data)
      } catch {
        toast.error(t('common.error'))
      }
      setLoading(false)
    })()
  }, [t])

  const exportSection = (
    sectionName: string,
    rows: Record<string, unknown>[]
  ) => {
    if (!rows.length) return toast.error(t('admin.no_data'))
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
    toast.success(t('common.success'))
  }

  if (loading)
    return (
      <div className="text-muted-foreground animate-pulse py-12 text-center">
        {t('common.loading')}
      </div>
    )
  if (!data)
    return (
      <div className="text-muted-foreground py-12 text-center">
        {t('admin.no_data')}
      </div>
    )

  const sections = [
    {
      name: t('admin.business_metrics'),
      cards: [
        { label: t('admin.total_accounts'), value: data.totalAccounts },
        { label: t('admin.accounts_this_week'), value: data.accountsThisWeek },
        { label: t('admin.active_subs'), value: data.activeSubscriptions },
        { label: t('admin.total_analyses', { defaultValue: 'Total Analyses' }), value: data.totalAnalyses },
      ],
      exportData: [
        {
          totalAccounts: data.totalAccounts,
          accountsThisWeek: data.accountsThisWeek,
          activeSubscriptions: data.activeSubscriptions,
          totalAnalyses: data.totalAnalyses,
        },
      ],
    },
    {
      name: t('admin.financial'),
      cards: [
        { label: t('admin.mrr'), value: `$${data.mrrCurrent}` },
        {
          label: t('admin.mrr_change', { defaultValue: 'MRR Change' }),
          value: `${data.mrrChange > 0 ? '+' : ''}${data.mrrChange}%`,
        },
        { label: t('admin.credits_issued'), value: data.creditsIssuedAllTime },
        { label: t('admin.credits_this_month'), value: data.creditsConsumedThisMonth },
      ],
      exportData: [
        {
          mrr: data.mrrCurrent,
          mrrChange: data.mrrChange,
          creditsIssued: data.creditsIssuedAllTime,
          creditsConsumed: data.creditsConsumedThisMonth,
        },
      ],
    },
    {
      name: t('admin.ai_pipeline'),
      cards: [
        { label: t('admin.analyses_this_month', { defaultValue: 'Analyses This Month' }), value: data.analysesThisMonth },
        { label: t('admin.avg_credits_analysis'), value: data.avgCreditsPerAnalysis },
        { label: t('admin.avg_input_tokens'), value: data.avgInputTokens },
        {
          label: t('admin.analyses_change'),
          value: `${data.analysesChange > 0 ? '+' : ''}${data.analysesChange}%`,
        },
      ],
      exportData: [
        {
          analysesThisMonth: data.analysesThisMonth,
          avgCredits: data.avgCreditsPerAnalysis,
          avgInputTokens: data.avgInputTokens,
        },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Eye className="text-primary" size={28} />
        <h1 className="text-2xl font-bold">{t('admin.analytics_dashboard')}</h1>
        <span className="bg-muted text-muted-foreground rounded-lg px-2 py-0.5 text-xs font-bold">
          {t('admin.readonly', { defaultValue: 'READ-ONLY' })}
        </span>
      </div>

      {sections.map((s) => (
        <div key={s.name} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{s.name}</h2>
            <button
              onClick={() =>
                exportSection(
                  s.name.toLowerCase().replace(/\s/g, '-'),
                  s.exportData
                )
              }
              className="bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <Download size={12} />
              {t('admin.export_csv')}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {s.cards.map((c) => (
              <div
                key={c.label}
                className="border-border/40 rounded-2xl border p-5"
              >
                <div className="text-muted-foreground text-xs font-semibold uppercase">
                  {c.label}
                </div>
                <div className="mt-1 text-2xl font-bold">{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Plan Breakdown */}
      <div className="border-border/40 rounded-2xl border p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('admin.plan_distribution')}</h2>
          <button
            onClick={() =>
              exportSection(
                'plan-breakdown',
                data.planBreakdown.map((p) => ({
                  plan: p.plan,
                  count: p.count,
                }))
              )
            }
            className="bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
          >
            <Download size={12} />
            CSV
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          {data.planBreakdown.map((p) => (
            <div
              key={p.plan}
              className="bg-muted/50 rounded-xl px-4 py-3 text-center"
            >
              <div className="text-muted-foreground text-xs font-semibold uppercase">
                {t(`admin.plan_${p.plan.toLowerCase()}`, { defaultValue: p.plan })}
              </div>
              <div className="text-xl font-bold">{p.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="border-border/40 overflow-hidden rounded-2xl border">
        <div className="border-border/30 flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-bold">{t('admin.recent_analyses')}</h2>
          <button
            onClick={() =>
              exportSection(
                'recent-analyses',
                data.recentAnalyses.map((a) => ({
                  filename: a.filename,
                  language: a.language,
                  risk: a.overallRisk,
                  date: a.createdAt,
                }))
              )
            }
            className="bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
          >
            <Download size={12} />
            CSV
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
              <th className="px-4 py-3 text-start">{t('admin.file')}</th>
              <th className="px-4 py-3 text-start">{t('admin.lang')}</th>
              <th className="px-4 py-3 text-start">{t('admin.risk')}</th>
              <th className="px-4 py-3 text-end">{t('admin.date')}</th>
            </tr>
          </thead>
          <tbody>
            {data.recentAnalyses.slice(0, 10).map((a) => (
              <tr key={a._id} className="border-border/30 border-b">
                <td className="px-4 py-3 font-medium">{a.filename}</td>
                <td className="px-4 py-3">{a.language}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-lg px-2 py-1 text-xs font-bold ${a.overallRisk === 'critical' || a.overallRisk === 'high' ? 'bg-red-500/15 text-red-500' : a.overallRisk === 'medium' ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/15 text-emerald-600'}`}
                  >
                    {t(`risk.${a.overallRisk}`, { defaultValue: a.overallRisk })}
                  </span>
                </td>
                <td className="text-muted-foreground px-4 py-3 text-end text-xs">
                  {new Date(a.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
