import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, Server, AlertTriangle, Cpu, Zap } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { toast } from 'sonner'

interface ServiceHealth {
  name: string
  status: string
  latencyMs: number
  lastCheck: string
}
interface AgentMetrics {
  avgLatencyMs: number
  avgTokens: number
  errorRate: number
  retryRate: number
}
interface PipelineData {
  agents: Record<string, AgentMetrics>
  costPerAnalysis: number
  totalAnalysesToday: number
  totalTokensToday: number
}
interface InfraData {
  server: {
    uptimeSeconds: number
    memoryMB: number
    memoryTotalMB: number
    nodeVersion: string
  }
  queue: { activeJobs: number; pendingJobs: number; failedJobs: number }
  recentErrors: { message: string; timestamp: string; count: number }[]
}
interface AlertItem {
  id: string
  type: string
  message: string
  severity: string
  timestamp: string
  resolved: boolean
}
interface Trace {
  id: string
  agent: string
  status: string
  durationMs: number
  tokens: number
  timestamp: string
  error?: string
}

export default function OperationsDashboard() {
  const { t } = useTranslation()
  const [services, setServices] = useState<ServiceHealth[]>([])
  const [pipeline, setPipeline] = useState<PipelineData | null>(null)
  const [infra, setInfra] = useState<InfraData | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [traces, setTraces] = useState<Trace[]>([])
  const [tab, setTab] = useState<
    'health' | 'pipeline' | 'infra' | 'traces' | 'alerts'
  >('health')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [h, p, i, a, tRes] = await Promise.all([
          adminApi.getSystemHealth(),
          adminApi.getPipelineMetrics(),
          adminApi.getInfrastructure(),
          adminApi.getAlerts(),
          adminApi.getLangfuseTraces(),
        ])
        setServices(
          (h.data as { data: { services: ServiceHealth[] } }).data.services
        )
        setPipeline((p.data as { data: PipelineData }).data)
        setInfra((i.data as { data: InfraData }).data)
        setAlerts((a.data as { data: AlertItem[] }).data)
        setTraces((tRes.data as { data: Trace[] }).data)
      } catch {
        toast.error(t('common.error'))
      }
      setLoading(false)
    })()
  }, [t])

  if (loading)
    return (
      <div className="text-muted-foreground animate-pulse py-12 text-center">
        {t('common.loading')}
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="text-primary" size={28} />
        <h1 className="text-2xl font-bold">
          {t('admin.operations_dashboard')}
        </h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['health', 'pipeline', 'infra', 'traces', 'alerts'] as const).map(
          (tKey) => (
            <button
              key={tKey}
              onClick={() => setTab(tKey)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-colors ${tab === tKey ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {tKey === 'health'
                ? t('admin.system_health')
                : tKey === 'pipeline'
                  ? t('admin.ai_pipeline')
                  : tKey === 'infra'
                    ? t('admin.infrastructure')
                    : tKey === 'traces'
                      ? t('admin.langfuse_traces')
                      : t('admin.alerts')}
            </button>
          )
        )}
      </div>

      {tab === 'health' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.name}
              className="border-border/40 rounded-2xl border p-5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{s.name}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.status === 'healthy' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-500'}`}
                >
                  {t(`admin.status_${s.status.toLowerCase()}`, {
                    defaultValue: s.status,
                  })}
                </span>
              </div>
              <div className="text-muted-foreground mt-2 text-sm">
                {t('admin.latency', { defaultValue: 'Latency' })}:{' '}
                <span className="text-foreground font-mono font-bold">
                  {s.latencyMs}ms
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'pipeline' && pipeline && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border-border/40 rounded-2xl border p-5 text-center">
              <div className="text-muted-foreground text-xs font-semibold uppercase">
                {t('admin.cost_analysis')}
              </div>
              <div className="mt-1 text-2xl font-bold">
                ${pipeline.costPerAnalysis}
              </div>
            </div>
            <div className="border-border/40 rounded-2xl border p-5 text-center">
              <div className="text-muted-foreground text-xs font-semibold uppercase">
                {t('admin.analyses_today')}
              </div>
              <div className="mt-1 text-2xl font-bold">
                {pipeline.totalAnalysesToday}
              </div>
            </div>
            <div className="border-border/40 rounded-2xl border p-5 text-center">
              <div className="text-muted-foreground text-xs font-semibold uppercase">
                {t('admin.tokens_today')}
              </div>
              <div className="mt-1 text-2xl font-bold">
                {pipeline.totalTokensToday.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="border-border/40 overflow-hidden rounded-2xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                  <th className="px-4 py-3 text-start">
                    {t('admin.agent', { defaultValue: 'Agent' })}
                  </th>
                  <th className="px-4 py-3">
                    {t('admin.avg_latency', { defaultValue: 'Avg Latency' })}
                  </th>
                  <th className="px-4 py-3">
                    {t('admin.avg_tokens', { defaultValue: 'Avg Tokens' })}
                  </th>
                  <th className="px-4 py-3">
                    {t('admin.error_rate', { defaultValue: 'Error Rate' })}
                  </th>
                  <th className="px-4 py-3">
                    {t('admin.retry_rate', { defaultValue: 'Retry Rate' })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(pipeline.agents).map(([name, m]) => (
                  <tr
                    key={name}
                    className="border-border/30 border-b text-center"
                  >
                    <td className="px-4 py-3 text-start font-bold capitalize">
                      {name}
                    </td>
                    <td className="px-4 py-3 font-mono">{m.avgLatencyMs}ms</td>
                    <td className="px-4 py-3 font-mono">{m.avgTokens}</td>
                    <td className="px-4 py-3 font-mono">
                      {(m.errorRate * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {(m.retryRate * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'infra' && infra && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-border/40 rounded-2xl border p-5">
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold uppercase">
                <Server size={14} />
                {t('admin.uptime')}
              </div>
              <div className="mt-1 text-xl font-bold">
                {Math.floor(infra.server.uptimeSeconds / 3600)}h{' '}
                {Math.floor((infra.server.uptimeSeconds % 3600) / 60)}m
              </div>
            </div>
            <div className="border-border/40 rounded-2xl border p-5">
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold uppercase">
                <Cpu size={14} />
                {t('admin.memory')}
              </div>
              <div className="mt-1 text-xl font-bold">
                {infra.server.memoryMB}MB / {infra.server.memoryTotalMB}MB
              </div>
            </div>
            <div className="border-border/40 rounded-2xl border p-5">
              <div className="text-muted-foreground text-xs font-semibold uppercase">
                {t('admin.queue_active')}
              </div>
              <div className="mt-1 text-xl font-bold">
                {infra.queue.activeJobs}
              </div>
            </div>
            <div className="border-border/40 rounded-2xl border p-5">
              <div className="text-muted-foreground text-xs font-semibold uppercase">
                {t('admin.queue_failed')}
              </div>
              <div className="mt-1 text-xl font-bold text-red-500">
                {infra.queue.failedJobs}
              </div>
            </div>
          </div>
          {infra.recentErrors.length > 0 && (
            <div className="border-border/40 rounded-2xl border p-5">
              <h3 className="mb-2 text-sm font-bold">
                {t('admin.recent_errors')}
              </h3>
              {infra.recentErrors.map((e, idx) => (
                <div key={idx} className="flex items-start gap-2 py-1 text-sm">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0 text-red-500"
                  />
                  <span>{e.message}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {new Date(e.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'traces' && (
        <div className="border-border/40 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                <th className="px-4 py-3 text-start">ID</th>
                <th className="px-4 py-3 text-start">
                  {t('admin.agent', { defaultValue: 'Agent' })}
                </th>
                <th className="px-4 py-3">{t('admin.status')}</th>
                <th className="px-4 py-3">
                  {t('admin.duration', { defaultValue: 'Duration' })}
                </th>
                <th className="px-4 py-3">
                  {t('admin.tokens', { defaultValue: 'Tokens' })}
                </th>
                <th className="px-4 py-3 text-end">{t('admin.time')}</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((tr) => (
                <tr
                  key={tr.id}
                  className="border-border/30 border-b text-center"
                >
                  <td className="px-4 py-3 text-start font-mono text-xs">
                    {tr.id}
                  </td>
                  <td className="px-4 py-3 text-start capitalize">
                    {tr.agent}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-bold ${tr.status === 'success' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-500'}`}
                    >
                      {t(`admin.status_${tr.status.toLowerCase()}`, {
                        defaultValue: tr.status,
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{tr.durationMs}ms</td>
                  <td className="px-4 py-3 font-mono">{tr.tokens}</td>
                  <td className="text-muted-foreground px-4 py-3 text-end text-xs">
                    {new Date(tr.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-3 rounded-2xl border p-4 ${a.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}
            >
              <Zap
                size={16}
                className={
                  a.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                }
              />
              <div className="flex-1">
                <div className="text-sm font-semibold">{a.message}</div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  {new Date(a.timestamp).toLocaleString()}
                </div>
              </div>
              <span
                className={`rounded-lg px-2 py-1 text-xs font-bold ${a.resolved ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-500'}`}
              >
                {a.resolved
                  ? t('admin.resolved', { defaultValue: 'Resolved' })
                  : t('admin.active', { defaultValue: 'Active' })}
              </span>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="text-muted-foreground py-12 text-center">
              {t('admin.no_data')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
