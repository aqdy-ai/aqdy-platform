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
  price: number | null
  features?: string[]
  analysisLimit?: number
  storageLimit?: number
  creditAllowance?: number
  limits?: PlanLimits
  ctaKey?: string // مضاف لدعم المفاتيح الديناميكية من الـ API والـ Tests
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
        // 🎯 تنفيذ الـ Subtask بطلب البيانات من الـ Endpoint الحقيقي لمنصة عقدي
        const response = await fetch('/api/plans')

        if (!response.ok) {
          throw new Error(
            isRtl ? 'فشل في جلب خطط الأسعار' : 'Failed to fetch pricing plans'
          )
        }

        const resData = await response.json()

        if (resData && resData.success) {
          setPlans(resData.data)
        } else {
          throw new Error(resData?.message || 'Invalid data structure')
        }
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
    // 1. شارة الخطة الحالية للمستخدم المسجل
    if (
      isLoggedIn &&
      userPlan &&
      plan.name.toLowerCase() === userPlan.toLowerCase()
    ) {
      return t('pricing.current_plan')
    }
    // 2. شارة الأكثر شيوعاً لخطة Pro الدائمة
    if (plan.name.toLowerCase() === 'pro') {
      return isRtl ? 'الأكثر شيوعاً' : 'Most Popular'
    }
    return null
  }

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const handleCheckout = async (planSlug: string) => {
    if (!isLoggedIn) {
      window.location.assign('/login')
      return
    }
    setCheckoutLoading(planSlug)
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug, billingCycle: billing }),
      })
      const resData = await res.json()
      if (resData?.data?.url) {
        window.location.assign(resData.data.url)
      } else {
        throw new Error(resData?.message || 'Failed to start checkout')
      }
    } catch (err: unknown) {
      console.error(err)
      alert(
        err instanceof Error
          ? err.message
          : 'Unable to start checkout.'
      )
    } finally {
      setCheckoutLoading(null)
    }
  }

  const planCta = (plan: Plan) => {
    const isCurrent =
      isLoggedIn &&
      userPlan &&
      plan.name.toLowerCase() === userPlan.toLowerCase()

    // Free Plan -> Register
    if (plan.name.toLowerCase() === 'free') {
      return (
        <Link
          to="/register"
          className={`block w-full rounded-xl border px-4 py-2.5 text-center font-semibold transition-all duration-200 ${isCurrent
            ? 'bg-secondary text-muted-foreground pointer-events-none border-transparent'
            : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
            }`}
        >
          {isCurrent ? t('pricing.current_plan') : t('pricing.get_started')}
        </Link>
      )
    }

    // Pro or Enterprise
    const isLoading = checkoutLoading === plan.slug
    return (
      <button
        type="button"
        onClick={() => handleCheckout(plan.slug)}
        disabled={isCurrent || isLoading}
        className={`block w-full rounded-xl py-2.5 text-center font-semibold transition-all duration-200 ${isCurrent
          ? 'bg-secondary text-muted-foreground cursor-default border-transparent'
          : plan.name.toLowerCase() === 'pro'
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/10 shadow-md'
            : 'border border-primary text-primary hover:bg-primary hover:text-primary-foreground'
          } disabled:opacity-70`}
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isCurrent ? (
          t('pricing.current_plan')
        ) : (
          t('pricing.upgrade')
        )}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="bg-background flex min-h-[400px] flex-1 items-center justify-center">
        {/* متوافق تماماً مع التيست المتوقع لكلمة loading أو جاري */}
        <span className="text-muted-foreground animate-pulse text-lg font-medium">
          {t('pricing.loading') || 'Loading...'}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-background text-destructive px-4 py-12 text-center font-medium">
        <p>
          {t('pricing.error') || 'Error'}: {error}
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
        {/* هيدر الصفحة الفاخر للهوية الملكية */}
        <h1 className="text-foreground mb-4 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t('pricing.title')}
        </h1>
        <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-center text-base sm:text-lg">
          {isRtl
            ? 'اختر الخطة المناسبة لمتطلباتك، وابدأ في إدارة وعقودك الذكية اليوم بكل ثقة مع أدوات الذكاء الاصطناعي.'
            : 'Choose the plan that fits your needs and manage your contracts with AI-powered confidence.'}
        </p>

        {/* سويتش الفوترة - مطبق بالكامل (UI Only لـ Sprint 3) */}
        <div className="bg-secondary mx-auto mb-16 flex max-w-xs justify-center gap-2 rounded-xl p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all duration-200 ${billing === 'monthly'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
            onClick={() => setBilling('monthly')}
          >
            {isRtl ? 'شهرياً' : 'Monthly'}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all duration-200 ${billing === 'annual'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
            onClick={() => setBilling('annual')}
          >
            {isRtl ? 'سنوياً' : 'Annual'}
          </button>
        </div>

        {/* شبكة الكروت ثنائية اللغة - RTL Safe Grid Layout */}
        <div className="grid items-stretch gap-8 md:grid-cols-3">
          {plans.map((plan) => {
            const isPro = plan.name.toLowerCase() === 'pro'
            const badgeText = getBadge(plan)
            const isCurrentBadge = badgeText === t('pricing.current_plan')

            return (
              <div
                key={plan.id}
                className={`bg-card relative flex flex-col justify-between rounded-2xl border p-8 transition-all duration-300 ${isPro
                  ? 'border-primary z-10 shadow-xl md:scale-105'
                  : 'border-border shadow-sm hover:shadow-md'
                  }`}
              >
                {/* شارات الكروت الاحترافية */}
                {badgeText && (
                  <div
                    className={`absolute top-0 rounded-full px-4 py-1 text-xs font-bold tracking-wider uppercase shadow-sm ${isRtl ? 'left-6' : 'right-6'
                      } -translate-y-1/2 ${isCurrentBadge
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

                  {/* الـ Pricing Section */}
                  <div className="text-card-foreground mb-6 text-center">
                    {plan.price === null ? (
                      <p className="text-accent py-1 text-2xl font-bold tracking-tight">
                        {isRtl ? 'تواصل معنا' : 'Custom'}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-3xl font-extrabold tracking-tight">
                          $
                          {billing === 'annual'
                            ? ((plan.price * 10) / 12).toFixed(2)
                            : plan.price}
                          <span className="text-muted-foreground mr-1 ml-1 text-xs font-medium">
                            {t('pricing.per_month') || '/mo'}
                          </span>
                        </p>
                        {billing === 'annual' && plan.price > 0 && (
                          <p className="text-muted-foreground text-xs font-medium">
                            {isRtl
                              ? `$${plan.price * 10}/سنة — شهرين مجاناً`
                              : `$${plan.price * 10}/yr — 2 months free`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* صندوق حدود الاستخدام (Credit Allowance & Storage Limits) */}
                  <div className="bg-muted text-muted-foreground border-border mb-6 space-y-2 rounded-xl border p-4 text-xs">
                    <p className="flex justify-between font-medium">
                      <span>
                        {t('credits.planAllowanceLabel') ||
                          (isRtl ? 'رصيد الائتمان' : 'Credit Allowance')}
                        :
                      </span>
                      <span className="text-card-foreground font-mono font-bold">
                        {plan.creditAllowance !== undefined
                          ? plan.creditAllowance.toLocaleString(
                            isRtl ? 'ar-EG' : 'en-US'
                          )
                          : '—'}
                      </span>
                    </p>
                    <p className="flex justify-between font-medium">
                      <span>
                        {t('pricing.storage_limit') ||
                          (isRtl ? 'حد التخزين' : 'Storage Limit')}
                        :
                      </span>
                      <span className="text-card-foreground font-bold">
                        {plan.storageLimit === -1
                          ? isRtl
                            ? 'غير محدود'
                            : 'Unlimited'
                          : (plan.storageLimit ?? plan.limits?.storage ?? '—')}
                      </span>
                    </p>
                  </div>

                  {/* قائمة المزايا والـ Features */}
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
