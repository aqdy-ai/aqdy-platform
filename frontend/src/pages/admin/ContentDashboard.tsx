import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, Pencil, Trash2, Bot, Plus, X, Search } from 'lucide-react'
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
interface FilterOptions {
  contractTypes: string[]
  categories: string[]
  jurisdictions: string[]
  riskLevels: string[]
}
interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type DateRange = '7d' | '30d' | 'custom'

const CLAUSE_PATTERN_MAX = 2000

const METRIC_LABELS: Record<string, string> = {
  faithfulness: 'Faithfulness',
  relevancy: 'Relevancy',
  precision: 'Precision',
  recall: 'Recall',
  total_evals: 'Total Evaluations',
}

const METRIC_DESCRIPTIONS: Record<string, string> = {
  faithfulness:
    'Measures how factually accurate the AI output is compared to the original contract text — are the extracted clauses correct?',
  relevancy:
    'Measures whether the AI analysis is relevant to the specific contract instead of giving generic answers.',
  precision:
    'Measures how precise the analysis is — does it correctly focus on the right clauses without hallucinating?',
  recall:
    'Measures whether the AI found all the important clauses it should have, without missing anything critical.',
  total_evals:
    'Total number of evaluations performed across all analyses in the selected time period.',
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
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    contractTypes: [],
    categories: [],
    jurisdictions: [],
    riskLevels: [],
  })
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    contractType: 'all',
    category: 'all',
    jurisdiction: 'all',
    riskLevel: 'all',
  })
  const [metricsDateRange, setMetricsDateRange] = useState<DateRange>('30d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [promptConfirm, setPromptConfirm] = useState<string | null>(null)

  const { canWrite } = usePermissions()
  const canModify = canWrite('knowledge_base')
  const canModifyPrompts = canWrite('prompts')

  const loadKb = async (p?: number) => {
    try {
      const params: Record<string, string | number> = {
        page: p ?? pagination.page,
        pageSize: 20,
      }
      if (search) params.search = search
      if (filters.contractType !== 'all')
        params.contractType = filters.contractType
      if (filters.category !== 'all') params.category = filters.category
      if (filters.jurisdiction !== 'all')
        params.jurisdiction = filters.jurisdiction
      if (filters.riskLevel !== 'all') params.riskLevel = filters.riskLevel

      const res = await adminApi.getKnowledgeBase(params)
      const body = res.data as {
        success: boolean
        data: {
          entries: KBEntry[]
          pagination: Pagination
          filterOptions: FilterOptions
        }
      }
      setKbEntries(body.data.entries)
      setPagination(body.data.pagination)
      setFilterOptions(body.data.filterOptions)
    } catch {
      toast.error(t('common.error'))
    }
  }

  const loadMetrics = async () => {
    try {
      let params: Record<string, string> | undefined
      if (metricsDateRange === '7d') {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        params = { startDate: d.toISOString() }
      } else if (metricsDateRange === 'custom') {
        if (customStartDate && customEndDate) {
          params = {
            startDate: new Date(customStartDate).toISOString(),
            endDate: new Date(customEndDate + 'T23:59:59').toISOString(),
          }
        }
      }
      const res = await adminApi.getLangfuseMetrics(params)
      const body = res.data as { success: boolean; data: LangfuseMetrics }
      setMetrics(body.data)
    } catch {
      toast.error(t('common.error'))
    }
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [pr] = await Promise.all([adminApi.getPrompts()])
        setPrompts((pr.data as { data: Prompt[] }).data)
        await loadKb(1)
        await loadMetrics()
      } catch {
        toast.error(t('common.error'))
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === 'kb') loadKb(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === 'metrics') loadMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsDateRange, customStartDate, customEndDate, tab])

  const deleteEntry = async (id: string) => {
    if (!confirm(t('common.close'))) return
    try {
      await adminApi.deleteKBEntry(id)
      toast.success(t('common.success'))
      await loadKb()
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
        await adminApi.updateKBEntry(editingKbId, kbForm)
        toast.success(t('common.success'))
      } else {
        await adminApi.createKBEntry(kbForm)
        toast.success(t('common.success'))
      }
      setShowKbForm(false)
      setEditingKbId(null)
      await loadKb()
    } catch {
      toast.error(t('common.error'))
    }
  }

  const confirmSavePrompt = (agent: string) => {
    setPromptConfirm(agent)
  }

  const savePrompt = async (agent: string) => {
    try {
      await adminApi.updatePrompt(agent, promptText)
      setPrompts((p) =>
        p.map((x) => (x.agent === agent ? { ...x, prompt: promptText } : x))
      )
      setEditingPrompt(null)
      setPromptConfirm(null)
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
          <div className="flex flex-wrap items-center gap-3">
            {canModify && (
              <button
                onClick={openCreateForm}
                className="bg-primary text-primary-foreground flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors hover:opacity-90"
              >
                <Plus size={16} />
                {t('admin.add_entry', { defaultValue: 'Add Entry' })}
              </button>
            )}
            <div className="relative min-w-[200px] flex-1">
              <Search
                size={16}
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.search_placeholder', {
                  defaultValue: 'Search clauses by name or text...',
                })}
                className="bg-background border-border w-full rounded-xl border py-2 pr-3 pl-9 text-sm"
              />
            </div>
            <select
              value={filters.contractType}
              onChange={(e) =>
                setFilters((f) => ({ ...f, contractType: e.target.value }))
              }
              className="bg-background border-border rounded-xl border px-3 py-2 text-sm"
            >
              <option value="all">
                {t('admin.filter_type', { defaultValue: 'All Types' })}
              </option>
              {filterOptions.contractTypes.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters((f) => ({ ...f, category: e.target.value }))
              }
              className="bg-background border-border rounded-xl border px-3 py-2 text-sm"
            >
              <option value="all">
                {t('admin.filter_category', { defaultValue: 'All Categories' })}
              </option>
              {filterOptions.categories.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              value={filters.jurisdiction}
              onChange={(e) =>
                setFilters((f) => ({ ...f, jurisdiction: e.target.value }))
              }
              className="bg-background border-border rounded-xl border px-3 py-2 text-sm"
            >
              <option value="all">
                {t('admin.filter_jurisdiction', {
                  defaultValue: 'All Jurisdictions',
                })}
              </option>
              {filterOptions.jurisdictions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              value={filters.riskLevel}
              onChange={(e) =>
                setFilters((f) => ({ ...f, riskLevel: e.target.value }))
              }
              className="bg-background border-border rounded-xl border px-3 py-2 text-sm"
            >
              <option value="all">
                {t('admin.filter_risk', { defaultValue: 'All Risk Levels' })}
              </option>
              {filterOptions.riskLevels.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </select>
          </div>

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
                  <select
                    value={kbForm.contractType}
                    onChange={(e) =>
                      setKbForm((f) => ({
                        ...f,
                        contractType: e.target.value,
                      }))
                    }
                    className="bg-background border-border w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="">
                      {t('admin.select_type', {
                        defaultValue: 'Select type...',
                      })}
                    </option>
                    {filterOptions.contractTypes.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                    {t('admin.category')}
                  </label>
                  <select
                    value={kbForm.category}
                    onChange={(e) =>
                      setKbForm((f) => ({ ...f, category: e.target.value }))
                    }
                    className="bg-background border-border w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="">
                      {t('admin.select_category', {
                        defaultValue: 'Select category...',
                      })}
                    </option>
                    {filterOptions.categories.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                    {t('admin.jurisdiction')}
                  </label>
                  <select
                    value={kbForm.jurisdiction}
                    onChange={(e) =>
                      setKbForm((f) => ({
                        ...f,
                        jurisdiction: e.target.value,
                      }))
                    }
                    className="bg-background border-border w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="">
                      {t('admin.select_jurisdiction', {
                        defaultValue: 'Select jurisdiction...',
                      })}
                    </option>
                    {filterOptions.jurisdictions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
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
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                    {t('admin.pattern', { defaultValue: 'Clause Pattern' })}
                  </label>
                  <div className="relative">
                    <input
                      value={kbForm.clausePattern}
                      onChange={(e) => {
                        if (e.target.value.length <= CLAUSE_PATTERN_MAX) {
                          setKbForm((f) => ({
                            ...f,
                            clausePattern: e.target.value,
                          }))
                        }
                      }}
                      className="bg-background border-border w-full rounded-xl border px-3 py-2 pr-20 text-sm"
                    />
                    <span
                      className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs ${
                        kbForm.clausePattern.length > CLAUSE_PATTERN_MAX * 0.9
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {kbForm.clausePattern.length}/{CLAUSE_PATTERN_MAX}
                    </span>
                  </div>
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
                {kbEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canModify ? 6 : 5}
                      className="text-muted-foreground px-4 py-8 text-center"
                    >
                      {t('admin.no_data', { defaultValue: 'No entries found' })}
                    </td>
                  </tr>
                ) : (
                  kbEntries.map((e) => (
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
                          className={`rounded-lg px-2 py-1 text-xs font-bold whitespace-nowrap ${e.riskLevel === 'high' || e.riskLevel === 'critical' ? 'bg-red-500/15 text-red-500 dark:text-red-200' : e.riskLevel === 'medium' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-200' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-200'}`}
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                {t('admin.showing_entries', {
                  defaultValue: 'Showing {{from}}–{{to}} of {{total}}',
                  from: (pagination.page - 1) * pagination.pageSize + 1,
                  to: Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total
                  ),
                  total: pagination.total,
                })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => loadKb(pagination.page - 1)}
                  className="bg-muted text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('common.previous_page')}
                </button>
                {Array.from(
                  { length: Math.min(pagination.totalPages, 5) },
                  (_, i) => {
                    let pageNum: number
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = pagination.page - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => loadKb(pageNum)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          pagination.page === pageNum
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  }
                )}
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadKb(pagination.page + 1)}
                  className="bg-muted text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('common.next_page')}
                </button>
              </div>
            </div>
          )}
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
                {canModifyPrompts && editingPrompt !== p.agent && (
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
                  {promptConfirm === p.agent ? (
                    <div className="border-destructive/30 bg-destructive/5 rounded-xl border p-3">
                      <p className="text-destructive mb-2 text-xs font-semibold">
                        {t('admin.prompt_confirm_warning', {
                          defaultValue:
                            'Changing this prompt will affect all future analyses. Are you sure?',
                        })}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => savePrompt(p.agent)}
                          className="bg-destructive text-destructive-foreground rounded-xl px-4 py-2 text-xs font-bold"
                        >
                          {t('common.confirm')}
                        </button>
                        <button
                          onClick={() => {
                            setPromptConfirm(null)
                            setEditingPrompt(null)
                          }}
                          className="bg-muted rounded-xl px-4 py-2 text-xs font-semibold"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmSavePrompt(p.agent)}
                        className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-bold"
                      >
                        {t('common.save')}
                      </button>
                      <button
                        onClick={() => setEditingPrompt(null)}
                        className="bg-muted rounded-xl px-4 py-2 text-xs font-semibold"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  )}
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
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground text-xs font-semibold">
              {t('admin.date_range', { defaultValue: 'Date Range' })}:
            </span>
            {(['7d', '30d', 'custom'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setMetricsDateRange(range)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  metricsDateRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {range === '7d'
                  ? t('admin.last_7_days', { defaultValue: 'Last 7 Days' })
                  : range === '30d'
                    ? t('admin.last_30_days', { defaultValue: 'Last 30 Days' })
                    : t('admin.custom_range', { defaultValue: 'Custom' })}
              </button>
            ))}
            {metricsDateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-background border-border rounded-xl border px-3 py-1.5 text-xs"
                />
                <span className="text-muted-foreground text-xs">&ndash;</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-background border-border rounded-xl border px-3 py-1.5 text-xs"
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                key: 'faithfulness',
                value: metrics.avgFaithfulness,
              },
              {
                key: 'relevancy',
                value: metrics.avgRelevancy,
              },
              {
                key: 'precision',
                value: metrics.avgPrecision,
              },
              {
                key: 'recall',
                value: metrics.avgRecall,
              },
              {
                key: 'total_evals',
                value: metrics.totalEvaluations,
              },
            ].map((m) => (
              <div
                key={m.key}
                className="border-border/40 rounded-2xl border p-5 text-center"
              >
                <div className="text-muted-foreground text-xs font-semibold uppercase">
                  {METRIC_LABELS[m.key]}
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {typeof m.value === 'number' && m.key !== 'total_evals'
                    ? (m.value * 100).toFixed(1) + '%'
                    : m.value}
                </div>
              </div>
            ))}
          </div>

          <div className="border-border/40 rounded-2xl border p-5">
            <h3 className="text-foreground mb-3 text-sm font-bold">
              {t('admin.metrics_glossary', {
                defaultValue: 'What These Metrics Mean',
              })}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(METRIC_DESCRIPTIONS).map(([key, desc]) => (
                <div key={key} className="space-y-0.5">
                  <span className="text-xs font-bold">
                    {METRIC_LABELS[key]}
                  </span>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
