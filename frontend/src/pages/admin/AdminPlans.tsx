import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { adminApi, AdminPlan, CreatePlanInput } from '../../services/adminApi'
import { usePermissions } from '../../hooks/usePermissions'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Check, AlertTriangle } from 'lucide-react'

interface PlanFormData {
  name: string
  slug: string
  price: string
  billingCycle: 'monthly' | 'annual'
  features: string[]
  analysisLimit: string
  storageLimit: string
  creditAllowance: string
  isActive: boolean
  stripePriceId: string
  stripeAnnualPriceId: string
}

const emptyForm: PlanFormData = {
  name: '',
  slug: '',
  price: '',
  billingCycle: 'monthly',
  features: [],
  analysisLimit: '',
  storageLimit: '',
  creditAllowance: '0',
  isActive: true,
  stripePriceId: '',
  stripeAnnualPriceId: '',
}

const AdminPlans = () => {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const { canWrite } = usePermissions()
  const canModify = canWrite('billing')

  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null)
  const [form, setForm] = useState<PlanFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [featureInput, setFeatureInput] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminApi.getPlans({ pageSize: 100 })
      if (res.data.success) {
        setPlans(res.data.data)
      }
    } catch {
      toast.error(t('admin.error_updating'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getPlans({ pageSize: 100 })
        if (res.data.success) {
          setPlans(res.data.data)
        }
      } catch {
        toast.error(t('admin.error_updating'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [t])

  const openCreate = () => {
    setEditingPlan(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (plan: AdminPlan) => {
    setEditingPlan(plan)
    setForm({
      name: plan.name,
      slug: plan.slug,
      price: plan.price?.toString() ?? '',
      billingCycle: plan.billingCycle,
      features: [...plan.features],
      analysisLimit: plan.analysisLimit.toString(),
      storageLimit: plan.storageLimit.toString(),
      creditAllowance: plan.creditAllowance.toString(),
      isActive: plan.isActive,
      stripePriceId: plan.stripePriceId ?? '',
      stripeAnnualPriceId: plan.stripeAnnualPriceId ?? '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error(t('admin.plan_validation_required'))
      return
    }

    try {
      setSaving(true)
      const payload: CreatePlanInput = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        price: form.price ? parseFloat(form.price) : null,
        billingCycle: form.billingCycle,
        features: form.features.filter((f) => f.trim()),
        analysisLimit: parseInt(form.analysisLimit, 10) || 0,
        storageLimit: parseInt(form.storageLimit, 10) || 0,
        creditAllowance: parseInt(form.creditAllowance, 10) || 0,
        isActive: form.isActive,
      }
      if (form.stripePriceId) payload.stripePriceId = form.stripePriceId.trim()
      if (form.stripeAnnualPriceId)
        payload.stripeAnnualPriceId = form.stripeAnnualPriceId.trim()

      if (editingPlan) {
        await adminApi.updatePlan(editingPlan._id, payload)
        toast.success(t('admin.plan_updated'))
      } else {
        await adminApi.createPlan(payload)
        toast.success(t('admin.plan_created'))
      }
      setShowModal(false)
      fetchPlans()
    } catch {
      toast.error(t('admin.error_updating'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deletePlan(id)
      toast.success(t('admin.plan_deleted'))
      setDeleteConfirm(null)
      fetchPlans()
    } catch {
      toast.error(t('admin.error_updating'))
    }
  }

  const addFeature = () => {
    const val = featureInput.trim()
    if (val && !form.features.includes(val)) {
      setForm({ ...form, features: [...form.features, val] })
    }
    setFeatureInput('')
  }

  const removeFeature = (index: number) => {
    setForm({
      ...form,
      features: form.features.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold">
          {t('admin.plans_title')}
        </h1>
        {canModify && (
          <button
            onClick={openCreate}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-xs transition-all"
          >
            <Plus size={18} />
            {t('admin.plans_create')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground py-20 text-center">
          {t('common.loading')}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-muted-foreground py-20 text-center">
          {t('admin.no_data')}
        </div>
      ) : (
        <div className="border-border/40 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground border-border/40 border-b text-xs font-bold tracking-wider uppercase">
                <th className="px-5 py-4 text-start">{t('admin.plan_name')}</th>
                <th className="px-5 py-4 text-start">{t('admin.plan_slug')}</th>
                <th className="px-5 py-4 text-start">
                  {t('admin.plan_price')}
                </th>
                <th className="px-5 py-4 text-start">
                  {t('admin.plan_billing_cycle')}
                </th>
                <th className="px-5 py-4 text-start">
                  {t('admin.plan_analysis_limit')}
                </th>
                <th className="px-5 py-4 text-start">
                  {t('admin.plan_credit_allowance')}
                </th>
                <th className="px-5 py-4 text-start">{t('admin.status')}</th>
                {canModify && (
                  <th className="px-5 py-4 text-start">{t('admin.actions')}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-border/40 divide-y">
              {plans.map((plan) => (
                <tr
                  key={plan._id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="text-foreground max-w-[180px] truncate px-5 py-4 font-semibold">
                    {plan.name}
                  </td>
                  <td className="text-muted-foreground px-5 py-4 font-mono text-xs">
                    {plan.slug}
                  </td>
                  <td className="text-foreground px-5 py-4 font-semibold tabular-nums">
                    {plan.price !== null && plan.price !== undefined
                      ? `$${plan.price}`
                      : '—'}
                  </td>
                  <td className="text-muted-foreground px-5 py-4 capitalize">
                    {plan.billingCycle}
                  </td>
                  <td className="text-foreground px-5 py-4 tabular-nums">
                    {plan.analysisLimit === -1
                      ? '∞'
                      : plan.analysisLimit.toLocaleString()}
                  </td>
                  <td className="text-foreground px-5 py-4 tabular-nums">
                    {plan.creditAllowance.toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${
                        plan.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {plan.isActive
                        ? t('admin.status_active')
                        : t('admin.status_inactive')}
                    </span>
                  </td>
                  {canModify && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(plan)}
                          className="hover:bg-primary/10 text-primary rounded-lg p-2 transition-colors"
                          title={t('admin.plan_edit')}
                        >
                          <Pencil size={16} />
                        </button>
                        {deleteConfirm === plan._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(plan._id)}
                              className="bg-destructive text-destructive-foreground rounded-lg p-2 transition-colors"
                              title={t('common.confirm')}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="hover:bg-muted text-muted-foreground rounded-lg p-2 transition-colors"
                              title={t('common.cancel')}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(plan._id)}
                            className="hover:bg-destructive/10 text-destructive rounded-lg p-2 transition-colors"
                            title={t('admin.plan_delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 py-10 backdrop-blur-sm">
          <div
            className={`bg-card mx-4 w-full max-w-2xl rounded-3xl border p-8 shadow-2xl ${
              isRtl ? 'text-right' : 'text-left'
            }`}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-foreground text-xl font-bold">
                {editingPlan
                  ? t('admin.plan_edit_title')
                  : t('admin.plan_create_title')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:bg-muted rounded-xl p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {t('admin.plan_name')}
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl border px-4 py-2.5 text-sm transition-colors outline-none"
                  placeholder={t('admin.plan_name')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {t('admin.plan_slug')}
                </label>
                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl border px-4 py-2.5 text-sm transition-colors outline-none"
                  placeholder="e.g. pro-plan"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {t('admin.plan_price')} (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl border px-4 py-2.5 text-sm transition-colors outline-none"
                  placeholder="0.00"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {t('admin.plan_billing_cycle')}
                </label>
                <select
                  value={form.billingCycle}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      billingCycle: e.target.value as 'monthly' | 'annual',
                    })
                  }
                  className="border-border bg-background text-foreground focus:border-primary/50 rounded-xl border px-4 py-2.5 text-sm transition-colors outline-none"
                >
                  <option value="monthly">{t('pricing.monthly')}</option>
                  <option value="annual">{t('pricing.annual')}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {t('admin.plan_analysis_limit')}
                </label>
                <input
                  type="number"
                  min="-1"
                  value={form.analysisLimit}
                  onChange={(e) =>
                    setForm({ ...form, analysisLimit: e.target.value })
                  }
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl border px-4 py-2.5 text-sm transition-colors outline-none"
                  placeholder="-1 = unlimited"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {t('admin.plan_storage_limit')}
                </label>
                <input
                  type="number"
                  min="-1"
                  value={form.storageLimit}
                  onChange={(e) =>
                    setForm({ ...form, storageLimit: e.target.value })
                  }
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl border px-4 py-2.5 text-sm transition-colors outline-none"
                  placeholder="-1 = unlimited"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {t('admin.plan_credit_allowance')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.creditAllowance}
                  onChange={(e) =>
                    setForm({ ...form, creditAllowance: e.target.value })
                  }
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl border px-4 py-2.5 text-sm transition-colors outline-none"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {t('admin.plan_is_active')}
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-foreground text-sm">
                    {form.isActive
                      ? t('admin.status_active')
                      : t('admin.status_inactive')}
                  </span>
                </label>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="stripe-price-id"
                  className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                >
                  Stripe Price ID
                </label>
                <input
                  id="stripe-price-id"
                  value={form.stripePriceId}
                  onChange={(e) =>
                    setForm({ ...form, stripePriceId: e.target.value })
                  }
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl border px-4 py-2.5 text-sm transition-colors outline-none"
                  placeholder="price_xxx"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="stripe-annual-price-id"
                  className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                >
                  Stripe Annual Price ID
                </label>
                <input
                  id="stripe-annual-price-id"
                  value={form.stripeAnnualPriceId}
                  onChange={(e) =>
                    setForm({ ...form, stripeAnnualPriceId: e.target.value })
                  }
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl border px-4 py-2.5 text-sm transition-colors outline-none"
                  placeholder="price_xxx"
                />
              </div>
            </div>

            {/* Features */}
            <div className="mt-5 flex flex-col gap-1.5">
              <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                {t('admin.plan_features')}
              </label>
              <div className="flex gap-2">
                <input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addFeature()
                    }
                  }}
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 flex-1 rounded-xl border px-4 py-2.5 text-sm transition-colors outline-none"
                  placeholder={t('admin.plan_feature_placeholder')}
                />
                <button
                  onClick={addFeature}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors"
                >
                  {t('common.add')}
                </button>
              </div>
              {form.features.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.features.map((feat, index) => (
                    <span
                      key={index}
                      className="bg-muted text-foreground flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    >
                      {feat}
                      <button
                        onClick={() => removeFeature(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:bg-muted rounded-xl px-6 py-2.5 text-sm font-bold transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold shadow-xs transition-all disabled:opacity-50"
              >
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation toast alternative handled inline */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 py-20 backdrop-blur-sm">
          <div className="bg-card mx-4 mt-10 w-full max-w-md rounded-3xl border p-8 text-center shadow-2xl">
            <AlertTriangle
              size={40}
              className="text-destructive mx-auto mb-4"
            />
            <h3 className="text-foreground mb-2 text-lg font-bold">
              {t('admin.plan_delete_confirm')}
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">
              {t('admin.plan_delete_warning')}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-muted-foreground hover:bg-muted rounded-xl px-6 py-2.5 text-sm font-bold transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl px-6 py-2.5 text-sm font-bold transition-colors"
              >
                {t('admin.plan_delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPlans
