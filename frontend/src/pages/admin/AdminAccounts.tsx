import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  UserCheck,
  UserX,
  CreditCard,
  ChevronDown,
  Loader2,
  User,
  Mail,
  CheckCircle,
} from 'lucide-react'
import { adminApi, UserAccount } from '../../services/adminApi'
import { toast } from 'sonner'

const AdminAccounts = () => {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 15

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminApi.getAccounts({
        page,
        pageSize,
        planSlug: planFilter || undefined,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
      })
      if (res.data.success) {
        setAccounts(res.data.data)
        setTotalPages(res.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      toast.error(t('admin.error_updating'))
    } finally {
      setLoading(false)
    }
  }, [page, planFilter, statusFilter, searchTerm, t])

  useEffect(() => {
    // Debounce search a bit
    const delayDebounceFn = setTimeout(() => {
      fetchAccounts()
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [fetchAccounts])

  const handlePlanChange = async (userId: string, newPlanSlug: string) => {
    try {
      setUpdatingId(userId)
      const res = await adminApi.updateAccount(userId, {
        planSlug: newPlanSlug,
      })
      if (res.data.success) {
        toast.success(t('admin.plan_updated'))
        // Update local state
        setAccounts((prev) =>
          prev.map((acc) =>
            acc._id === userId
              ? {
                  ...acc,
                  planSlug: res.data.data.planSlug,
                  plan: res.data.data.plan,
                  creditBalance: res.data.data.creditBalance,
                }
              : acc
          )
        )
      }
    } catch (error) {
      console.error('Failed to update plan:', error)
      toast.error(t('admin.error_updating'))
    } finally {
      setUpdatingId(null)
    }
  }

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    try {
      setUpdatingId(userId)
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended'
      const res = await adminApi.updateAccount(userId, { status: newStatus })
      if (res.data.success) {
        toast.success(t('admin.status_updated'))
        // Update local state
        setAccounts((prev) =>
          prev.map((acc) =>
            acc._id === userId ? { ...acc, status: res.data.data.status } : acc
          )
        )
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error(t('admin.error_updating'))
    } finally {
      setUpdatingId(null)
    }
  }

  const handleVerifyToggle = async (
    userId: string,
    currentVerified: boolean
  ) => {
    try {
      setUpdatingId(userId)
      const res = await adminApi.updateAccount(userId, {
        isEmailVerified: !currentVerified,
      })
      if (res.data.success) {
        toast.success(t('admin.email_verified_updated'))
        // Update local state
        setAccounts((prev) =>
          prev.map((acc) =>
            acc._id === userId
              ? { ...acc, isEmailVerified: res.data.data.isEmailVerified }
              : acc
          )
        )
      }
    } catch (error) {
      console.error('Failed to update email verification status:', error)
      toast.error(t('admin.error_updating'))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-10">
        <h1 className="text-foreground text-3xl font-black tracking-tight">
          {t('admin.accounts_title')}
        </h1>
        <p className="text-muted-foreground text-sm font-semibold">
          {t('common.tagline')}
        </p>
      </div>

      {/* Filters bar */}
      <div className="border-border/40 bg-card/25 mb-8 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(1)
            }}
            placeholder={t('admin.search_placeholder')}
            className="bg-background/50 border-border/50 focus:border-primary placeholder:text-muted-foreground/60 w-full rounded-xl border py-2.5 ps-10 pe-4 text-sm transition-all outline-none"
          />
        </div>

        {/* Plan Filter */}
        <div className="relative">
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value)
              setPage(1)
            }}
            className="bg-background/50 border-border/50 focus:border-primary text-foreground min-w-[140px] cursor-pointer appearance-none rounded-xl border py-2.5 pr-10 pl-4 text-sm transition-all outline-none"
          >
            <option value="">{t('admin.filter_plan')}</option>
            <option value="free">{t('admin.plan_free')}</option>
            <option value="pro">{t('admin.plan_pro')}</option>
            <option value="enterprise">{t('admin.plan_enterprise')}</option>
          </select>
          <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="bg-background/50 border-border/50 focus:border-primary text-foreground min-w-[140px] cursor-pointer appearance-none rounded-xl border py-2.5 pr-10 pl-4 text-sm transition-all outline-none"
          >
            <option value="">{t('admin.filter_status')}</option>
            <option value="active">{t('admin.status_active')}</option>
            <option value="suspended">{t('admin.status_suspended')}</option>
          </select>
          <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="border-border/40 bg-card/10 overflow-hidden rounded-3xl border shadow-sm backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start">
            <thead>
              <tr className="border-border/40 text-muted-foreground bg-card/30 border-b text-xs font-bold tracking-wider uppercase">
                <th className="px-6 py-4 text-start font-black">
                  {t('admin.name')}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {t('admin.plan')}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {t('admin.credit_balance')}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {t('admin.status')}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {t('admin.joined_date')}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {t('admin.last_login')}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {t('admin.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-border/40 divide-y">
              {loading && accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-muted-foreground px-6 py-12 text-center font-semibold"
                  >
                    {t('admin.no_data')}
                  </td>
                </tr>
              ) : (
                accounts.map((account) => {
                  const isSuspended = account.status === 'suspended'
                  const statusBadgeColor = isSuspended
                    ? 'bg-rose-500/10 text-rose-500'
                    : 'bg-emerald-500/10 text-emerald-500'

                  return (
                    <tr
                      key={account._id}
                      className="hover:bg-card/20 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl font-bold">
                            <User className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-foreground text-sm font-bold">
                              {account.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {account.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-6 py-4.5">
                        <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-bold capitalize">
                          {t(
                            `admin.plan_${account.planSlug === 'premium' ? 'pro' : account.planSlug || 'free'}`
                          )}
                        </span>
                      </td>

                      {/* Credit Balance */}
                      <td className="px-6 py-4.5">
                        <div className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                          <CreditCard className="text-muted-foreground h-4 w-4" />
                          {account.creditBalance?.toLocaleString() || 0}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5">
                        <div className="flex flex-col items-start gap-1.5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeColor}`}
                          >
                            {t(`admin.status_${account.status}`)}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                              account.isEmailVerified
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}
                          >
                            {account.isEmailVerified
                              ? t('admin.verified')
                              : t('admin.unverified')}
                          </span>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="text-muted-foreground px-6 py-4.5 text-xs font-semibold">
                        {new Date(account.createdAt).toLocaleDateString(
                          i18n.language,
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="text-muted-foreground px-6 py-4.5 text-xs font-semibold">
                        {account.lastLogin
                          ? new Date(account.lastLogin).toLocaleString(
                              i18n.language,
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          {/* Plan selector */}
                          <div className="relative">
                            <select
                              disabled={updatingId === account._id}
                              value={account.planSlug || 'free'}
                              onChange={(e) =>
                                handlePlanChange(account._id, e.target.value)
                              }
                              className="bg-background/80 border-border/60 hover:border-primary text-foreground cursor-pointer appearance-none rounded-xl border px-3 py-1.5 pr-8 text-xs font-bold transition-all outline-none disabled:opacity-50"
                            >
                              <option value="free">
                                {t('admin.plan_free')}
                              </option>
                              <option value="pro">{t('admin.plan_pro')}</option>
                              <option value="enterprise">
                                {t('admin.plan_enterprise')}
                              </option>
                            </select>
                            <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 h-3 w-3 -translate-y-1/2" />
                          </div>

                          {/* Status Toggle Button */}
                          <button
                            disabled={updatingId === account._id}
                            onClick={() =>
                              handleStatusToggle(account._id, account.status)
                            }
                            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all disabled:opacity-50 ${
                              isSuspended
                                ? 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                                : 'border-rose-500/30 text-rose-500 hover:bg-rose-500/10'
                            }`}
                          >
                            {isSuspended ? (
                              <>
                                <UserCheck className="h-3.5 w-3.5" />
                                {t('admin.activate')}
                              </>
                            ) : (
                              <>
                                <UserX className="h-3.5 w-3.5" />
                                {t('admin.suspend')}
                              </>
                            )}
                          </button>

                          {/* Email Verification Toggle Button */}
                          <button
                            disabled={updatingId === account._id}
                            onClick={() =>
                              handleVerifyToggle(
                                account._id,
                                !!account.isEmailVerified
                              )
                            }
                            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all disabled:opacity-50 ${
                              account.isEmailVerified
                                ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10'
                                : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                            }`}
                          >
                            {account.isEmailVerified ? (
                              <>
                                <Mail className="h-3.5 w-3.5" />
                                {t('admin.unverify_email')}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3.5 w-3.5" />
                                {t('admin.verify_email')}
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="border-border/40 bg-card/30 flex items-center justify-between border-t px-6 py-4">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="border-border/50 text-foreground hover:bg-muted rounded-xl border px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
            >
              {isRtl ? 'السابق' : 'Previous'}
            </button>
            <span className="text-muted-foreground text-xs font-bold">
              {isRtl
                ? `صفحة ${page} من ${totalPages}`
                : `Page ${page} of ${totalPages}`}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="border-border/50 text-foreground hover:bg-muted rounded-xl border px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
            >
              {isRtl ? 'التالي' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAccounts
