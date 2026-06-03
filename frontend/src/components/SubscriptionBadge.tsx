// src/components/SubscriptionBadge.tsx
import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle, ArrowUpCircle } from 'lucide-react'

// تحديد الـ Interfaces الصارمة للبيانات لمنع الـ any
interface SubscriptionData {
  planName: string
  usedAnalyses: number
  limitAnalyses: number
  renewalDate: string
}

interface SubscriptionBadgeProps {
  variant?: 'compact' | 'full'
}

export default function SubscriptionBadge({
  variant = 'compact',
}: SubscriptionBadgeProps) {
  // 🌟 تعديل: حذفنا 't' لأننا بنعتمد على الـ Language Switcher والـ isRtl لتوفير دعم الـ AR/EN
  const { i18n } = useTranslation()
  const location = useLocation()
  const isRtl = i18n.language === 'ar'

  const [subData, setSubData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // دالة جلب البيانات مع تأمين الـ Types
  const fetchSubscription = useCallback(async () => {
    try {
      const response = await fetch('/api/account/subscription')
      if (response.ok) {
        const res = await response.json()
        if (res && res.success) {
          setSubData(res.data)
        }
      }
    } catch (error: unknown) {
      const err = error as Error
      console.error('Subscription fetch error:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // 🎯 جلب البيانات عند الـ Mount وعند تغيير الـ location مع فك الارتباط المتزامن لحماية الـ Performance
  useEffect(() => {
    const loadData = async () => {
      await fetchSubscription()
    }
    // تنفيذ الدالة بشكل غير متزامن صريح لمنع الـ cascading renders
    void loadData()
  }, [location.pathname, fetchSubscription])

  if (loading || !subData) {
    return <div className="bg-muted h-8 w-24 animate-pulse rounded-lg" />
  }

  const { planName, usedAnalyses, limitAnalyses, renewalDate } = subData

  // حساب نسبة الاستهلاك بدقة
  const usagePercentage = Math.min((usedAnalyses / limitAnalyses) * 100, 100)
  const isWarningState = usagePercentage > 80 && usagePercentage < 100
  const isAtLimitState = usagePercentage >= 100

  // تحديد لون الـ Progress Bar بناءً على نسبة الاستهلاك
  const getProgressBarColor = () => {
    if (isAtLimitState) return 'bg-destructive'
    if (isWarningState) return 'bg-amber-500' // لون أصفر/برتقالي عند تخطي الـ 80%
    return 'bg-primary'
  }

  // ====== 1️⃣ النسخة المختصرة المدمجة للـ Navbar ======
  if (variant === 'compact') {
    return (
      <div
        className="border-border/60 bg-card/50 flex items-center gap-3 rounded-xl border p-2 text-xs shadow-sm"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="flex flex-col">
          <span className="text-foreground font-bold">
            {planName}
            {isWarningState && (
              <AlertTriangle
                size={12}
                className="mx-1 inline animate-bounce text-amber-500"
              />
            )}
          </span>
          <span className="text-muted-foreground text-[10px]">
            {usedAnalyses} / {limitAnalyses}
          </span>
        </div>

        {/* شريط التقدم الصغير */}
        <div className="bg-secondary relative h-2 w-16 overflow-hidden rounded-full">
          <div
            className={`h-full transition-all duration-500 ${getProgressBarColor()}`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>

        {isAtLimitState && (
          <Link
            to="/pricing"
            className="bg-accent text-accent-foreground flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-opacity hover:opacity-90"
          >
            <ArrowUpCircle size={12} />
            {isRtl ? 'ترقية' : 'Upgrade'}
          </Link>
        )}
      </div>
    )
  }

  // ====== 2️⃣ النسخة الكاملة لصفحة الـ Dashboard ======
  return (
    <div
      className="border-border bg-card rounded-2xl border p-6 shadow-md"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-muted-foreground text-sm font-semibold">
            {isRtl ? 'خطة الاشتراك الحالية' : 'Current Subscription Plan'}
          </h3>
          <p className="text-foreground mt-0.5 text-2xl font-extrabold tracking-tight">
            {planName}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            isAtLimitState
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {isAtLimitState
            ? isRtl
              ? 'منتهي'
              : 'Limit Reached'
            : isRtl
              ? 'نشط'
              : 'Active'}
        </span>
      </div>

      {/* الـ Progress Tracker الرئيسي */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-muted-foreground">
            {isRtl
              ? 'التحليلات المستخدمة هذا الشهر'
              : 'Analyses used this month'}
          </span>
          <span className="text-foreground font-bold">
            {usedAnalyses} / {limitAnalyses}
          </span>
        </div>

        {/* شريط التقدم الكبير */}
        <div className="bg-secondary h-3 w-full overflow-hidden rounded-full">
          <div
            className={`h-full transition-all duration-500 ${getProgressBarColor()}`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
      </div>

      {/* التحذيرات البصرية وزر الترقية الفوري عند الـ Limit */}
      <div className="border-border/50 mt-5 flex flex-col justify-between gap-4 border-t pt-4 sm:flex-row sm:items-center">
        <p className="text-muted-foreground text-xs">
          {isRtl ? 'تاريخ التجديد القادم:' : 'Next renewal date:'}{' '}
          <span className="text-foreground font-semibold">{renewalDate}</span>
        </p>

        {isWarningState && (
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 p-2 text-xs font-medium text-amber-600">
            <AlertTriangle size={14} />
            <span>
              {isRtl
                ? 'لقد اقتربت من نفاد الحد المسموح!'
                : 'Approaching monthly limit!'}
            </span>
          </div>
        )}

        {isAtLimitState && (
          <Link
            to="/pricing"
            className="bg-accent text-accent-foreground hover:bg-accent/90 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-colors sm:w-auto"
          >
            <ArrowUpCircle size={14} />
            {isRtl ? 'اشترك الآن ورقّي باقتك' : 'Upgrade Now'}
          </Link>
        )}
      </div>
    </div>
  )
}
