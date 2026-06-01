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

interface PricingProps {
  userPlan?: string | null
  isLoggedIn?: boolean
}

export default function Pricing({
  userPlan = null,
  isLoggedIn = false,
}: PricingProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true)

        const mockData = {
          success: true,
          data: [
            {
              id: '1',
              name: 'Free',
              price: '0',
              limits: { analysis: '3', storage: '100MB' },
              features: [
                'Basic AI contract check',
                'Standard support',
                'AR/EN interface',
              ],
            },
            {
              id: '2',
              name: 'Pro',
              price: '29',
              limits: { analysis: '50', storage: '2GB' },
              features: [
                'Advanced AI classification',
                'Priority support',
                'Deep risk assessment',
              ],
            },
            {
              id: '3',
              name: 'Enterprise',
              price: 'Custom',
              limits: { analysis: 'Unlimited', storage: 'Unlimited' },
              features: [
                'Custom fine-tuning',
                'Dedicated AI pipeline',
                '24/7 legal tech support',
              ],
            },
          ],
        }

        await new Promise((resolve) => setTimeout(resolve, 600))
        setPlans(mockData.data)
      } catch (e: unknown) {
        const err = e as Error
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [isRtl])

  const getBadge = (plan: Plan): string | null => {
    if (
      isLoggedIn &&
      userPlan &&
      plan.name.toLowerCase() === userPlan.toLowerCase()
    ) {
      return t('pricing.current_plan')
    }
    if (plan.name.toLowerCase() === 'pro') {
      return t('pricing.most_popular')
    }
    return null
  }

  const planCta = (plan: Plan) => {
    const isCurrent =
      isLoggedIn &&
      userPlan &&
      plan.name.toLowerCase() === userPlan.toLowerCase()

    if (plan.name.toLowerCase() === 'free') {
      return (
        <Link
          to="/register"
          className={`block w-full rounded-xl border px-4 py-2.5 text-center font-semibold transition-colors duration-200 ${
            isCurrent
              ? 'bg-secondary text-muted-foreground pointer-events-none border-transparent'
              : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
          }`}
        >
          {t('pricing.get_started_free')}
        </Link>
      )
    }
    if (plan.name.toLowerCase() === 'pro') {
      return (
        <Link
          to={`/checkout?plan=pro&cycle=${billing}`}
          className={`btn-primary block w-full rounded-xl py-2.5 text-center transition-all duration-200 ${
            isCurrent
              ? 'bg-secondary text-muted-foreground pointer-events-none border-transparent'
              : 'shadow-primary/10 shadow-md'
          }`}
        >
          {t('pricing.upgrade_to_pro')}
        </Link>
      )
    }
    return (
      <a
        href="mailto:partnerships@aqdy.ai?subject=Enterprise%20Plan%20Inquiry"
        className="border-accent text-accent hover:bg-accent hover:text-accent-foreground block w-full rounded-xl border px-4 py-2.5 text-center font-semibold transition-colors duration-200"
      >
        {t('pricing.contact_us')}
      </a>
    )
  }

  if (loading) {
    return (
      <div className="bg-background flex flex-1 items-center justify-center">
        <span className="text-muted-foreground animate-pulse text-lg font-medium">
          {t('pricing.loading')}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-background text-destructive px-4 py-12 text-center font-medium">
        <p>
          {t('pricing.error')}: {error}
        </p>
      </div>
    )
  }

  return (
    <section
      className="bg-background text-foreground flex-1 py-20 transition-colors duration-500"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-6xl px-4">
        {/* العناوين المعتمدة على الـ Foregrounds والـ Variables الذكية */}
        <h1 className="text-foreground mb-4 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t('pricing.title')}
        </h1>
        <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-center text-base sm:text-lg">
          {isRtl
            ? 'اختر الخطة المناسبة لمتطلباتك، وابدأ في تحليل عقودك الذكية اليوم بكل ثقة.'
            : 'Choose the plan that fits your needs and analyze your contracts with confidence.'}
        </p>

        {/* سويتش الفوترة - متناسق مع ألوان المودز الأساسية */}
        <div className="bg-secondary mx-auto mb-16 flex max-w-xs justify-center gap-2 rounded-xl p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all duration-200 ${
              billing === 'monthly'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setBilling('monthly')}
          >
            {t('pricing.monthly')}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all duration-200 ${
              billing === 'annual'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setBilling('annual')}
          >
            {t('pricing.annual')}
          </button>
        </div>

        {/* شبكة الكروت بالاعتماد الكامل على الـ Tokenization */}
        <div className="grid items-stretch gap-8 md:grid-cols-3">
          {plans.map((plan) => {
            const isPro = plan.name.toLowerCase() === 'pro'
            const badgeText = getBadge(plan)
            const isCurrentBadge = badgeText === t('pricing.current_plan')

            return (
              <div
                key={plan.id}
                className={`bg-card relative flex flex-col justify-between rounded-2xl border p-8 transition-all duration-300 ${
                  isPro
                    ? 'border-primary z-10 shadow-xl md:scale-105'
                    : 'border-border shadow-sm hover:shadow-md'
                }`}
              >
                {/* الشارة العلوية - الـ Pro يأخذ لون الـ Accent الياقوتي الملفت والـ Current يأخذ لون الـ Primary */}
                {badgeText && (
                  <div
                    className={`absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-1 text-xs font-bold tracking-wider uppercase shadow-sm ${
                      isCurrentBadge
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground animate-pulse'
                    }`}
                  >
                    {badgeText}
                  </div>
                )}

                <div>
                  <h2 className="text-card-foreground mb-3 text-center text-xl font-bold">
                    {plan.name}
                  </h2>

                  {/* قسم السعر الخاضع للهوية الملكية */}
                  <div className="text-card-foreground mb-6 text-center">
                    {plan.price.toLowerCase() === 'custom' ? (
                      <p className="text-accent py-1 text-2xl font-bold tracking-tight">
                        {plan.price}
                      </p>
                    ) : (
                      <p className="text-3xl font-extrabold tracking-tight">
                        ${plan.price}
                        <span className="text-muted-foreground mr-1 ml-1 text-xs font-medium">
                          {billing === 'annual'
                            ? t('pricing.per_year')
                            : t('pricing.per_month')}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* صندوق حدود الاستخدام - متوافق مع درجات الـ Muted */}
                  <div className="bg-muted text-muted-foreground border-border mb-6 space-y-2 rounded-xl border p-4 text-xs">
                    <p className="flex justify-between font-medium">
                      <span>{t('pricing.analysis_limit')}:</span>
                      <span className="text-card-foreground font-bold">
                        {plan.limits?.analysis ?? '—'}
                      </span>
                    </p>
                    <p className="flex justify-between font-medium">
                      <span>{t('pricing.storage_limit')}:</span>
                      <span className="text-card-foreground font-bold">
                        {plan.limits?.storage ?? '—'}
                      </span>
                    </p>
                  </div>

                  {/* المزايا مع تشيك الأيكون بنفسجي ملكي متناسق */}
                  <ul className="text-card-foreground/90 mb-8 space-y-3.5 text-sm">
                    {plan.features?.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check
                          size={16}
                          className="text-primary mt-0.5 flex-shrink-0 font-bold"
                        />
                        <span className="leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto w-full">{planCta(plan)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
