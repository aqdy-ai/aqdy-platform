// src/components/SubscriptionBadge.tsx

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle, ArrowUpCircle } from 'lucide-react'

import { accountApi } from '../services/accountApi'
import type { SubscriptionBadgeProps } from '../types/subscription'
import type { SubscriptionInfo } from '@/types/account'

export default function SubscriptionBadge({
  variant = 'compact',
}: SubscriptionBadgeProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const isRtl = i18n.language === 'ar'

  const [subData, setSubData] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadSubscription = async () => {
      try {
        const subscription = await accountApi.getSubscription()

        if (mounted) {
          setSubData(subscription)
        }
      } catch (error) {
        console.error('Subscription fetch error:', error)

        if (mounted) {
          setSubData(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadSubscription()

    return () => {
      mounted = false
    }
  }, [location.pathname])

  if (loading) {
    return <div className="bg-muted h-8 w-24 animate-pulse rounded-lg" />
  }

  if (!subData) return null

  const { planName, analysesUsed, analysesAllowed, renewalDate } = subData

  const isUnlimited = analysesAllowed === -1

  const usagePercentage = isUnlimited
    ? 0
    : analysesAllowed > 0
      ? Math.min((analysesUsed / analysesAllowed) * 100, 100)
      : 0

  const isWarningState =
    !isUnlimited && usagePercentage > 80 && usagePercentage < 100

  const isAtLimitState = !isUnlimited && usagePercentage >= 100

  const getProgressBarColor = () => {
    if (isAtLimitState) return 'bg-destructive'
    if (isWarningState) return 'bg-amber-500'
    return 'bg-primary'
  }

  // ====== Compact Navbar Version ======
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
            {isUnlimited
              ? t('account.unlimited', 'Unlimited')
              : `${analysesUsed} / ${analysesAllowed}`}
          </span>
        </div>

        {!isUnlimited && (
          <div className="bg-secondary relative h-2 w-16 overflow-hidden rounded-full">
            <div
              className={`h-full transition-all duration-500 ${getProgressBarColor()}`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        )}

        {isAtLimitState && (
          <Link
            to="/pricing"
            className="bg-accent text-accent-foreground flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-opacity hover:opacity-90"
          >
            <ArrowUpCircle size={12} />
            {t('billing.upgrade')}
          </Link>
        )}
      </div>
    )
  }

  // ====== Full Dashboard Version ======
  return (
    <div
      className="border-border bg-card rounded-2xl border p-6 shadow-md"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-muted-foreground text-sm font-semibold">
            {t('account.planSectionTitle')}
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
            ? t('account.status_suspended')
            : t('account.status_active')}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-muted-foreground">
            {t('account.analysesUsageLabel')}
          </span>

          <span className="text-foreground font-bold">
            {isUnlimited
              ? t('account.unlimited', 'Unlimited')
              : `${analysesUsed} / ${analysesAllowed}`}
          </span>
        </div>

        {!isUnlimited && (
          <div className="bg-secondary h-3 w-full overflow-hidden rounded-full">
            <div
              className={`h-full transition-all duration-500 ${getProgressBarColor()}`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        )}
      </div>

      <div className="border-border/50 mt-5 flex flex-col justify-between gap-4 border-t pt-4 sm:flex-row sm:items-center">
        <p className="text-muted-foreground text-xs">
          {t('account.renewalDateLabel')}:{' '}
          <span className="text-foreground font-semibold">
            {new Date(renewalDate).toLocaleDateString(
              isRtl ? 'ar-EG' : 'en-US'
            )}
          </span>
        </p>

        {isWarningState && (
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 p-2 text-xs font-medium text-amber-600">
            <AlertTriangle size={14} />
            <span>{t('account.upgradeNotAvailable')}</span>
          </div>
        )}

        {isAtLimitState && (
          <Link
            to="/pricing"
            className="bg-accent text-accent-foreground hover:bg-accent/90 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-colors sm:w-auto"
          >
            <ArrowUpCircle size={14} />
            {t('billing.upgrade_plan')}
          </Link>
        )}
      </div>
    </div>
  )
}
