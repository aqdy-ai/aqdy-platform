// src/pages/Pricing.tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'

interface PlanLimits {
  analysis?: string
  storage?: string
}

export interface Plan {
  id: string
  name: string
  price: string
  features?: string[]
  limits?: PlanLimits
}

/**
 * Pricing page component.
 * Fetches plan data from GET /api/plans and renders three plan cards.
 * Supports AR/EN languages with RTL‑safe layout.
 */
export default function Pricing() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly') // UI only

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/plans')

        // Debug logs
        console.log('[Pricing] Status:', res.status)
        console.log('[Pricing] Content-Type:', res.headers.get('content-type'))

        const contentType = res.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) {
          const body = await res.text()
          console.error('[Pricing] Non-JSON response body:', body.slice(0, 200))
          throw new Error(
            isRtl
              ? 'الخادم أرجع استجابة غير صالحة (ليست JSON). تأكد من تشغيل الـ Backend.'
              : 'Server returned a non-JSON response. Make sure the backend is running.'
          )
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(
            errData.message || `Request failed with status ${res.status}`
          )
        }

        const data = await res.json()
        console.log('[Pricing] API response:', data)

        // API returns { success: true, data: [...] }
        const plansList: Plan[] = data.data ?? data.plans ?? []
        setPlans(plansList)
      } catch (e: unknown) {
        const err = e as Error
        console.error('[Pricing] Fetch error:', err.message)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [isRtl])

  // TODO: integrate auth context to get the active plan ID of the logged‑in user
  const currentPlanId: string | null = null

  const getBadge = (plan: Plan): string | null => {
    if (plan.name.toLowerCase() === 'pro') return t('pricing.most_popular')
    if (plan.id === currentPlanId) return t('pricing.current_plan')
    return null
  }

  const planCta = (plan: Plan) => {
    if (plan.name.toLowerCase() === 'free') {
      return (
        <Link to="/register" className="btn-primary">
          {t('pricing.get_started_free')}
        </Link>
      )
    }
    if (plan.name.toLowerCase() === 'pro') {
      return (
        <button className="btn-primary" disabled>
          {t('pricing.upgrade_to_pro')}
        </button>
      )
    }
    return (
      <a href="mailto:sales@example.com" className="btn-primary">
        {t('pricing.contact_us')}
      </a>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <span className="animate-pulse text-lg">{t('pricing.loading')}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center text-red-600">
        <p>
          {t('pricing.error')}: {error}
        </p>
      </div>
    )
  }

  return (
    <section className={isRtl ? 'direction-rtl' : ''} dir={i18n.language}>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="mb-8 text-center text-4xl font-bold">
          {t('pricing.title')}
        </h1>
        {/* Billing toggle – UI only */}
        <div className="mb-6 flex justify-center space-x-4">
          <button
            className={`rounded px-4 py-2 ${billing === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            onClick={() => setBilling('monthly')}
          >
            {t('pricing.monthly')}
          </button>
          <button
            className={`rounded px-4 py-2 ${billing === 'annual' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            onClick={() => setBilling('annual')}
          >
            {t('pricing.annual')}
          </button>
        </div>
        {/* Cards grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-card/50 border-border/30 relative rounded-2xl border p-6 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl"
            >
              {getBadge(plan) && (
                <div className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-sm shadow-md">
                  {getBadge(plan)}
                </div>
              )}
              <h2 className="mb-2 text-center text-2xl font-semibold">
                {plan.name}
              </h2>
              <p className="text-muted-foreground mb-4 text-center">
                {t('pricing.price', {
                  price: plan.price,
                  cycle:
                    billing === 'annual'
                      ? t('pricing.per_year')
                      : t('pricing.per_month'),
                })}
              </p>
              <ul className="mb-6 space-y-2">
                {plan.features?.map((feat, i) => (
                  <li key={i} className="flex items-center space-x-2">
                    <Check size={16} className="text-primary" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <div className="mb-4 text-center">
                <p className="font-medium">
                  {t('pricing.analysis_limit')}: {plan.limits?.analysis ?? '—'}
                </p>
                <p className="font-medium">
                  {t('pricing.storage_limit')}: {plan.limits?.storage ?? '—'}
                </p>
              </div>
              <div className="text-center">{planCta(plan)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
