
// Compact variant   → embedded in <Navbar />
// Expanded variant  → embedded in <AccountSettings /> aside column
//
// API contract:
//   GET /api/account/credits  →  { balance, planAllowance, ledger[] }
//
// Progress states:
//   normal  → remainingPct > 20 %   (blue primary bar)
//   amber   → 0 < remainingPct ≤ 20 % (amber-500 bar + warning icon)
//   empty   → balance === 0          (red bar + Upgrade CTA)

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpCircle,
  Coins,
  TrendingDown,
  RefreshCw,
  Zap,
} from 'lucide-react'

import { accountApi } from '../services/accountApi'
import type { CreditsData, CreditLedgerEntry } from '../types/account'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface CreditsBadgeProps {
  /** 'compact'  → small pill for Navbar
   *  'expanded' → full card for AccountSettings sidebar  */
  variant?: 'compact' | 'expanded'
}

type ProgressState = 'normal' | 'amber' | 'empty'

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function resolveProgressState(
  balance: number,
  planAllowance: number
): ProgressState {
  if (balance <= 0) return 'empty'
  if (planAllowance <= 0) return 'normal'
  const remainingPct = (balance / planAllowance) * 100
  if (remainingPct <= 20) return 'amber'
  return 'normal'
}

function getBarColor(state: ProgressState): string {
  switch (state) {
    case 'empty':
      return 'bg-destructive'
    case 'amber':
      return 'bg-amber-500'
    default:
      return 'bg-primary'
  }
}

/** Friendly label for a ledger reason key (falls back to reason string) */
function reasonLabel(
  reason: CreditLedgerEntry['reason'],
  t: (k: string) => string
): string {
  const key = `credits.reason_${reason}`
  const translated = t(key)
  // If translation key not found, return the raw reason
  return translated === key ? reason : translated
}

/** Icon for a ledger reason */
function ReasonIcon({ reason }: { reason: CreditLedgerEntry['reason'] }) {
  switch (reason) {
    case 'analysis_deduction':
    case 'chat_deduction':
      return <TrendingDown size={12} className="shrink-0 text-destructive" />
    case 'plan_topup':
    case 'refund':
      return <RefreshCw size={12} className="shrink-0 text-emerald-500" />
    default:
      return <Zap size={12} className="shrink-0 text-muted-foreground" />
  }
}

// ─────────────────────────────────────────────────────────
// Skeleton / Error atoms
// ─────────────────────────────────────────────────────────

function CompactSkeleton() {
  return (
    <div
      role="status"
      aria-label="loading credits"
      className="bg-muted h-8 w-24 animate-pulse rounded-xl"
    />
  )
}

function ExpandedSkeleton() {
  return (
    <div
      role="status"
      aria-label="loading credits"
      className="border-border bg-card space-y-3 rounded-2xl border p-5 shadow-md"
    >
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-muted h-4 w-full animate-pulse rounded" />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

export default function CreditsBadge({ variant = 'compact' }: CreditsBadgeProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const isRtl = i18n.language === 'ar'

  const [data, setData] = useState<CreditsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(false)
      try {
        const result = await accountApi.getCredits()
        if (mounted) setData(result)
      } catch {
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [location.pathname])

  // ── Loading ─────────────────────────────────────────
  if (loading) {
    return variant === 'compact' ? <CompactSkeleton /> : <ExpandedSkeleton />
  }

  // ── Error / no data ─────────────────────────────────
  if (error || !data) {
    if (variant === 'compact') return null
    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        role="alert"
        className="border-destructive/40 bg-destructive/5 text-destructive rounded-2xl border p-5 text-sm font-semibold"
      >
        {t('credits.errorLoading')}
      </div>
    )
  }

  const { balance, planAllowance, ledger } = data

  const progressState = resolveProgressState(balance, planAllowance)
  const barColor = getBarColor(progressState)

  // Percentage filled = used credits (planAllowance - balance) relative to allowance
  const filledPct =
    planAllowance > 0
      ? Math.min(((planAllowance - balance) / planAllowance) * 100, 100)
      : balance > 0
        ? 0 // unlimited-style – just show full green
        : 100 // 0 balance, 0 allowance → show full red

  // Last 5 deduction-type entries for the mini ledger
  const miniLedger = ledger
    .filter(
      (e) =>
        e.reason === 'analysis_deduction' ||
        e.reason === 'chat_deduction' ||
        e.reason === 'manual_adjustment'
    )
    .slice(0, 5)

  const isZero = balance <= 0

  // ── Compact Navbar variant ───────────────────────────
  if (variant === 'compact') {
    return (
      <div
        id="credits-badge-compact"
        dir={isRtl ? 'rtl' : 'ltr'}
        className="border-border/60 bg-card/50 flex items-center gap-2.5 rounded-xl border p-2 text-xs shadow-sm"
        role="status"
        aria-label={t('credits.ariaLabel')}
      >
        {/* Coin icon */}
        <Coins
          size={14}
          className={
            isZero
              ? 'text-destructive'
              : progressState === 'amber'
                ? 'text-amber-500'
                : 'text-primary'
          }
          aria-hidden="true"
        />

        {/* Balance text */}
        <div className="flex flex-col leading-none">
          <span
            id="credits-balance-compact"
            className="text-foreground font-bold tabular-nums"
          >
            {balance.toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
          </span>
          <span className="text-muted-foreground text-[10px]">
            {t('credits.creditsLabel')}
          </span>
        </div>

        {/* Progress pill */}
        {planAllowance > 0 && (
          <div className="bg-secondary relative h-1.5 w-14 overflow-hidden rounded-full">
            <div
              className={`h-full transition-all duration-500 ${barColor}`}
              style={{ width: `${filledPct}%` }}
              role="progressbar"
              aria-valuenow={filledPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}

        {/* Amber warning icon */}
        {progressState === 'amber' && (
          <AlertTriangle
            size={12}
            className="animate-bounce text-amber-500"
            aria-hidden="true"
          />
        )}

        {/* Upgrade CTA at zero */}
        {isZero && (
          <Link
            to="/pricing"
            id="credits-upgrade-cta-compact"
            className="bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-colors"
            aria-label={t('credits.upgradeAriaLabel')}
          >
            <ArrowUpCircle size={11} aria-hidden="true" />
            {t('billing.upgrade')}
          </Link>
        )}
      </div>
    )
  }

  // ── Expanded Account-Settings variant ───────────────
  return (
    <div
      id="credits-badge-expanded"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="border-border bg-card rounded-2xl border p-6 shadow-md"
      role="region"
      aria-label={t('credits.ariaLabel')}
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Coins
            size={20}
            className={
              isZero
                ? 'text-destructive'
                : progressState === 'amber'
                  ? 'text-amber-500'
                  : 'text-primary'
            }
            aria-hidden="true"
          />
          <h3 className="text-foreground text-base font-bold">
            {t('credits.sectionTitle')}
          </h3>
        </div>

        {/* State badge */}
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            isZero
              ? 'bg-destructive/10 text-destructive'
              : progressState === 'amber'
                ? 'bg-amber-500/10 text-amber-600'
                : 'bg-primary/10 text-primary'
          }`}
        >
          {isZero
            ? t('credits.stateEmpty')
            : progressState === 'amber'
              ? t('credits.stateLow')
              : t('credits.stateHealthy')}
        </span>
      </div>

      {/* Balance + allowance */}
      <div className="mb-4 space-y-1">
        <div className="flex items-end justify-between">
          <span className="text-muted-foreground text-sm">
            {t('credits.currentBalanceLabel')}
          </span>
          <span
            id="credits-balance-expanded"
            className={`text-2xl font-extrabold tabular-nums ${
              isZero ? 'text-destructive' : 'text-foreground'
            }`}
          >
            {balance.toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
          </span>
        </div>

        {planAllowance > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('credits.planAllowanceLabel')}</span>
            <span className="font-semibold">
              {planAllowance.toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
            </span>
          </div>
        )}

        {/* Remaining text */}
        {planAllowance > 0 && (
          <p
            className={`text-xs font-medium ${
              isZero
                ? 'text-destructive'
                : progressState === 'amber'
                  ? 'text-amber-600'
                  : 'text-muted-foreground'
            }`}
          >
            {isZero
              ? t('credits.noCreditsRemaining')
              : t('credits.creditsRemaining', {
                  count: balance,
                  pct: Math.max(0, Math.round((balance / planAllowance) * 100)),
                })}
          </p>
        )}
      </div>

      {/* Progress bar */}
      {planAllowance > 0 && (
        <div className="bg-secondary mb-5 h-2.5 w-full overflow-hidden rounded-full">
          <div
            className={`h-full transition-all duration-700 ${barColor}`}
            style={{ width: `${filledPct}%` }}
            role="progressbar"
            aria-valuenow={filledPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('credits.progressAriaLabel')}
          />
        </div>
      )}

      {/* Amber warning banner */}
      {progressState === 'amber' && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{t('credits.lowBalanceWarning')}</span>
        </div>
      )}

      {/* Zero balance upgrade CTA */}
      {isZero && (
        <Link
          to="/pricing"
          id="credits-upgrade-cta-expanded"
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 mb-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-md transition-colors"
          aria-label={t('credits.upgradeAriaLabel')}
        >
          <ArrowUpCircle size={16} aria-hidden="true" />
          {t('credits.upgradeCta')}
        </Link>
      )}

      {/* Mini ledger – last 5 deductions */}
      {miniLedger.length > 0 && (
        <div className="border-border/40 border-t pt-4">
          <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
            {t('credits.recentDeductionsTitle')}
          </p>
          <ul className="space-y-2" aria-label={t('credits.recentDeductionsTitle')}>
            {miniLedger.map((entry) => (
              <li
                key={entry._id}
                className="bg-background flex items-center justify-between gap-2 rounded-xl px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ReasonIcon reason={entry.reason} />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-xs font-semibold">
                      {entry.metadata.contractId
                        ? `${t('credits.contractLabel')} · ${entry.metadata.contractId.slice(-6)}`
                        : reasonLabel(entry.reason, t)}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {new Date(entry.createdAt).toLocaleDateString(
                        isRtl ? 'ar-EG' : 'en-US',
                        { day: 'numeric', month: 'short', year: 'numeric' }
                      )}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-xs font-bold tabular-nums ${
                    entry.delta < 0 ? 'text-destructive' : 'text-emerald-600'
                  }`}
                >
                  {entry.delta > 0 ? '+' : ''}
                  {entry.delta.toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
