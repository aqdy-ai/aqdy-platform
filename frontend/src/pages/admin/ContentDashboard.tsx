import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, Pencil, Trash2, Bot, Plus, X } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { usePermissions } from '../../hooks/usePermissions'
import { toast } from 'sonner'

interface KBEntry {
  id: string
  clauseText: string
  contractType: string
  category: string
  jurisdiction: string
  riskLevel: string
  clausePattern: string
}
interface Prompt {
  agent: string
  prompt: string
}
interface LangfuseMetrics {
  avgFaithfulness: number
  avgRelevancy: number
  avgPrecision: number
  avgRecall: number
  totalEvaluations: number
}

export default function ContentDashboard() {
  const { t } = useTranslation()
  const [kbEntries, setKbEntries] = useState<KBEntry[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [metrics, setMetrics] = useState<LangfuseMetrics | null>(null)
  const [tab, setTab] = useState<'kb' | 'prompts' | 'metrics'>('kb')
  const [loading, setLoading] = useState(true)
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [promptText, setPromptText] = useState('')
  const [showKbForm, setShowKbForm] = useState(false)
  const [editingKbId, setEditingKbId] = useState<string | null>(null)
  const [kbForm, setKbForm] = useState({
    clauseText: '',
    contractType: '',
    category: '',
    jurisdiction: '',
    riskLevel: 'low',
    clausePattern: '',
  })
  const { canWrite } = usePermissions()
  const canModify = canWrite('knowledge_base')

  useEffect(() => {
    ;(async () => {
      try {
        const [kb, pr, met] = await Promise.all([
          adminApi.getKnowledgeBase(),
          adminApi.getPrompts(),
          adminApi.getLangfuseMetrics(),
        ])
        setKbEntries((kb.data as { data: KBEntry[] }).data)
        setPrompts((pr.data as { data: Prompt[] }).data)
        setMetrics((met.data as { data: LangfuseMetrics }).data)
      } catch {
        toast.error(t('common.error'))
      }
      setLoading(false)
    })()
  }, [t])

  const deleteEntry = async (id: string) => {
    if (!confirm(t('common.close'))) return
    try {
      await adminApi.deleteKBEntry(id)
      setKbEntries((e) => e.filter((x) => x.id !== id))
      toast.success(t('common.success'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const openCreateForm = () => {
    setKbForm({
      clauseText: '',
      contractType: '',
      category: '',
      jurisdiction: '',
      riskLevel: 'low',
      clausePattern: '',
    })
    setEditingKbId(null)
    setShowKbForm(true)
  }

  const openEditForm = (entry: KBEntry) => {
    setKbForm({
      clauseText: entry.clauseText,
      contractType: entry.contractType,
      category: entry.category,
      jurisdiction: entry.jurisdiction,
      riskLevel: entry.riskLevel,
      clausePattern: entry.clausePattern,
    })
    setEditingKbId(entry.id)
    setShowKbForm(true)
  }

  const saveKbEntry = async () => {
    if (!kbForm.clauseText.trim()) return toast.error(t('admin.required'))
    try {
      if (editingKbId) {
        const res = await adminApi.updateKBEntry(editingKbId, kbForm)
        const updated = (res.data as { data: KBEntry }).data
        setKbEntries((prev) =>
          prev.map((e) => (e.id === editingKbId ? updated : e))
        )
      } else {
        const res = await adminApi.createKBEntry(kbForm)
        const created = (res.data as { data: KBEntry }).data
        setKbEntries((prev) => [created, ...prev])
      }
      setShowKbForm(false)
      setEditingKbId(null)
      toast.success(t('common.success'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const savePrompt = async (agent: string) => {
    try {
      await adminApi.updatePrompt(agent, promptText)
      setPrompts((p) =>
        p.map((x) => (x.agent === agent ? { ...x, prompt: promptText } : x))
      )
      setEditingPrompt(null)
      toast.success(t('common.success'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  if (loading)
    return (
      <div className="text-muted-foreground animate-pulse py-12 text-center">
        {t('common.loading')}
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="text-primary" size={28} />
        <h1 className="text-2xl font-bold">{t('admin.content_kb')}</h1>
      </div>

      <div className="flex gap-2">
        {['kb', 'prompts', 'metrics'].map((tKey) => (
          <button
            key={tKey}
            onClick={() => setTab(tKey as typeof tab)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-colors ${tab === tKey ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            {tKey === 'kb'
              ? t('admin.kb')
              : tKey === 'prompts'
                ? t('admin.prompts')
                : t('admin.langfuse_metrics')}
          </button>
        ))}
      </div>

      {tab === 'kb' && (
        <div className="space-y-4">
          {canModify && (
            <button
              onClick={openCreateForm}
              className="bg-primary text-primary-foreground flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors hover:opacity-90"
            >
              <Plus size={16} />
              {t('admin.add_entry', { defaultValue: 'Add Entry' })}
            </button>
          )}

          {showKbForm && (
            <div className="border-border/40 rounded-2xl border p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">
                  {editingKbId
                    ? t('admin.edit_entry', { defaultValue: 'Edit Entry' })
                    : t('admin.new_entry', { defaultValue: 'New KB Entry' })}
                </h3>
                <button
                  onClick={() => setShowKbForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                    {t('admin.clause')}
                  </label>
                  <textarea
                    value={kbForm.clauseText}
                    onChange={(e) =>
                      setKbForm((f) => ({ ...f, clauseText: e.target.value }))
                    }
                    rows={2}
                    className="bg-background border-border w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                    {t('admin.type')}
                  </label>
                  <input
                    value={kbForm.contractType}
                    onChange={(e) =>
                      setKbForm((f) => ({ ...f, contractType: e.target.value }))
                    }
                    className="bg-background border-border w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                    {t('admin.category')}
                  </label>
                  <input
                    value={kbForm.category}
                    onChange={(e) =>
                      setKbForm((f) => ({ ...f, category: e.target.value }))
                    }
                    className="bg-background border-border w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                    {t('admin.jurisdiction')}
                  </label>
                  <input
                    value={kbForm.jurisdiction}
                    onChange={(e) =>
                      setKbForm((f) => ({ ...f, jurisdiction: e.target.value }))
                    }
                    className="bg-background border-border w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                    {t('admin.risk')}
                  </label>
                  <select
                    value={kbForm.riskLevel}
                    onChange={(e) =>
                      setKbForm((f) => ({ ...f, riskLevel: e.target.value }))
                    }
                    className="bg-background border-border w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                    {t('admin.pattern', { defaultValue: 'Clause Pattern' })}
                  </label>
                  <input
                    value={kbForm.clausePattern}
                    onChange={(e) =>
                      setKbForm((f) => ({
                        ...f,
                        clausePattern: e.target.value,
                      }))
                    }
                    className="bg-background border-border w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={saveKbEntry}
                  className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-bold"
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={() => setShowKbForm(false)}
                  className="bg-muted rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}

          <div className="border-border/40 overflow-hidden rounded-2xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                  <th className="px-4 py-3 text-start">{t('admin.clause')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.type')}</th>
                  <th className="px-4 py-3 text-start">
                    {t('admin.category')}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t('admin.jurisdiction')}
                  </th>
                  <th className="px-4 py-3 text-start">{t('admin.risk')}</th>
                  {canModify && (
                    <th className="px-4 py-3 text-end">{t('admin.actions')}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {kbEntries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-border/30 hover:bg-muted/30 border-b transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{e.clauseText}</td>
                    <td className="px-4 py-3 text-xs">{e.contractType}</td>
                    <td className="px-4 py-3 text-xs">{e.category}</td>
                    <td className="px-4 py-3 text-xs">{e.jurisdiction}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-bold ${e.riskLevel === 'high' ? 'bg-red-500/15 text-red-500' : e.riskLevel === 'medium' ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/15 text-emerald-600'}`}
                      >
                        {t(`risk.${e.riskLevel}`, {
                          defaultValue: e.riskLevel,
                        })}
                      </span>
                    </td>
                    {canModify && (
                      <td className="px-4 py-3 text-end">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditForm(e)}
                            className="text-primary hover:bg-primary/10 rounded-lg p-1.5"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteEntry(e.id)}
                            className="text-destructive hover:bg-destructive/10 rounded-lg p-1.5"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'prompts' && (
        <div className="space-y-4">
          {prompts.map((p) => (
            <div
              key={p.agent}
              className="border-border/40 rounded-2xl border p-5"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold capitalize">
                  <Bot size={16} />
                  {p.agent}
                </h3>
                {canModify && editingPrompt !== p.agent && (
                  <button
                    onClick={() => {
                      setEditingPrompt(p.agent)
                      setPromptText(p.prompt)
                    }}
                    className="text-primary flex items-center gap-1 text-xs font-semibold"
                  >
                    <Pencil size={12} />
                    {t('common.success') ? 'Edit' : 'تعديل'}
                  </button>
                )}
              </div>
              {editingPrompt === p.agent ? (
                <div className="space-y-2">
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    rows={6}
                    className="bg-background border-border w-full rounded-xl border p-3 font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => savePrompt(p.agent)}
                      className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-bold"
                    >
                      {t('common.success') ? 'Save' : 'حفظ'}
                    </button>
                    <button
                      onClick={() => setEditingPrompt(null)}
                      className="bg-muted rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <pre className="bg-muted/50 max-h-32 overflow-auto rounded-xl p-3 font-mono text-xs whitespace-pre-wrap">
                  {p.prompt}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'metrics' && metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              key: 'faithfulness',
              label: t('admin.faithfulness'),
              value: metrics.avgFaithfulness,
            },
            {
              key: 'relevancy',
              label: t('admin.relevancy'),
              value: metrics.avgRelevancy,
            },
            {
              key: 'precision',
              label: t('admin.precision'),
              value: metrics.avgPrecision,
            },
            {
              key: 'recall',
              label: t('admin.recall'),
              value: metrics.avgRecall,
            },
            {
              key: 'total_evals',
              label: t('admin.total_evals'),
              value: metrics.totalEvaluations,
            },
          ].map((m) => (
            <div
              key={m.key}
              className="border-border/40 rounded-2xl border p-5 text-center"
            >
              <div className="text-muted-foreground text-xs font-semibold uppercase">
                {m.label}
              </div>
              <div className="mt-1 text-2xl font-bold">
                {typeof m.value === 'number' && m.value < 10
                  ? (m.value * 100).toFixed(1) + '%'
                  : m.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
