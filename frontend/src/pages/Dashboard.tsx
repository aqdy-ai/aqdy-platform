import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  ArrowUpCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import RiskAnalysisDashboard from '@/pages/RiskAnalysisDashboard'
import SubscriptionBadge from '@/components/SubscriptionBadge'
import { accountApi } from '@/services/accountApi'

export default function TestPage() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    let handled = false

    if (params.get('cancel_success') === 'true') {
      toast.success(t('billing.cancellationConfirmed'))
      handled = true
    }
    if (params.get('topup_success') === 'true') {
      toast.success(t('billing.creditTopupSuccess'))
      handled = true
    }

    if (handled) {
      navigate(location.pathname, { replace: true })
    }
  }, [location.search, navigate, t, location.pathname])

  const { data: subscription } = useQuery({
    queryKey: ['account-subscription'],
    queryFn: async () => await accountApi.getSubscription(),
    staleTime: 1000 * 60 * 5,
  })

  const paymentFailed = subscription?.paymentStatus === 'failed'

  let isExpired = false
  let gracePeriodDays = 0

  if (subscription?.endDate) {
    const end = new Date(subscription.endDate)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      isExpired = true
    } else if (diffDays <= 3) {
      gracePeriodDays = diffDays
    }
  }

  return (
    <div
      className="bg-background min-h-screen py-10"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-7xl space-y-8 px-6">
        {/* Payment Failed Banner */}
        {paymentFailed && (
          <div className="bg-destructive/10 border-destructive/20 text-destructive flex flex-col items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="shrink-0" />
              <p className="text-sm font-semibold">
                {t('dashboard.payment_failed')}
              </p>
            </div>
            <Link
              to="/pricing"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-colors"
            >
              {t('dashboard.retry_payment')}
            </Link>
          </div>
        )}

        {/* Grace Period Warning Banner */}
        {gracePeriodDays > 0 && !isExpired && !paymentFailed && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-600 shadow-sm">
            <AlertTriangle size={24} className="shrink-0" />
            <p className="text-sm font-semibold">
              {t('dashboard.grace_period_warning', { days: gracePeriodDays })}
            </p>
          </div>
        )}

        {/* Main Content Area */}
        {isExpired ? (
          <div className="border-border bg-card flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border p-8 text-center shadow-lg">
            <div className="mb-6 rounded-full bg-red-500/10 p-6 text-red-500">
              <ShieldAlert size={48} />
            </div>
            <h2 className="text-foreground mb-4 text-3xl font-black">
              {t('dashboard.subscription_expired')}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md text-base font-medium">
              {t('dashboard.subscription_expired_desc')}
            </p>
            <Link
              to="/pricing"
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-6 py-3 text-lg font-bold shadow-md transition-all active:scale-95"
            >
              <ArrowUpCircle size={20} />
              {t('dashboard.upgrade_to_continue')}
            </Link>
          </div>
        ) : (
          <RiskAnalysisDashboard />
        )}

        <div className="max-w-md md:max-w-full">
          <SubscriptionBadge variant="full" />
        </div>
      </div>
    </div>
  )
}
