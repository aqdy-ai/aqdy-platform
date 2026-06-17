import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Search,
  ChevronDown,
  Loader2,
  Download,
  Calendar,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  User,
} from 'lucide-react'
import { adminApi, PaymentRecord, PaymentUser } from '../../services/adminApi'
import { toast } from 'sonner'

/**
 * AdminPayments – Full table of all payments across all accounts.
 * Admin-only page protected by AdminRoute wrapper.
 */
const AdminPayments = () => {
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 15

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminApi.getPayments({
        page,
        pageSize,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo
          ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)).toISOString()
          : undefined,
      })
      if (res.data.success) {
        setPayments(res.data.data)
        setTotalPages(res.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error)
      toast.error(isRtl ? 'فشل في تحميل المدفوعات' : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, searchTerm, dateFrom, dateTo, isRtl])

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchPayments()
    }, 300)
    return () => clearTimeout(delay)
  }, [fetchPayments])

  // ── CSV Export ────────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    if (payments.length === 0) return

    const headers = [
      'Date',
      'User Name',
      'User Email',
      'Plan',
      'Amount',
      'Currency',
      'Status',
    ]

    const rows = payments.map((p) => {
      const pUser =
        typeof p.userId === 'object' && p.userId
          ? (p.userId as PaymentUser)
          : null

      return [
        new Date(p.createdAt).toISOString(),
        pUser ? `"${pUser.name.replace(/"/g, '""')}"` : '',
        pUser ? pUser.email : '',
        p.planSlug || '',
        String(p.amount),
        p.currency,
        p.status,
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `admin-payments-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    toast.success(
      isRtl ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully'
    )
  }, [payments, isRtl])

  // ── Helpers ──────────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return {
          color: 'bg-emerald-500/10 text-emerald-500',
          icon: <CheckCircle2 className="h-3 w-3" />,
          label: isRtl ? 'ناجح' : 'Succeeded',
        }
      case 'pending':
        return {
          color: 'bg-amber-500/10 text-amber-500',
          icon: <Clock className="h-3 w-3" />,
          label: isRtl ? 'قيد الانتظار' : 'Pending',
        }
      case 'failed':
        return {
          color: 'bg-rose-500/10 text-rose-500',
          icon: <XCircle className="h-3 w-3" />,
          label: isRtl ? 'فشل' : 'Failed',
        }
      case 'refunded':
        return {
          color: 'bg-blue-500/10 text-blue-500',
          icon: <RotateCcw className="h-3 w-3" />,
          label: isRtl ? 'مسترد' : 'Refunded',
        }
      default:
        return {
          color: 'bg-muted text-muted-foreground',
          icon: null,
          label: status,
        }
    }
  }

  const getPlanBadge = (planSlug: string | undefined) => {
    switch (planSlug) {
      case 'premium':
      case 'pro':
        return 'bg-indigo-500/10 text-indigo-500'
      case 'enterprise':
        return 'bg-amber-500/10 text-amber-600'
      default:
        return 'bg-primary/10 text-primary'
    }
  }

  const hasActiveFilters =
    searchTerm !== '' || statusFilter !== '' || dateFrom !== '' || dateTo !== ''

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Header */}
      <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-3xl font-black tracking-tight">
            {isRtl ? 'إدارة المدفوعات' : 'All Payments'}
          </h1>
          <p className="text-muted-foreground text-sm font-semibold">
            {isRtl
              ? 'عرض وإدارة جميع المدفوعات عبر كل الحسابات'
              : 'View and manage all payments across all accounts'}
          </p>
        </div>

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          disabled={payments.length === 0}
          data-testid="export-csv-btn"
          className="border-border/50 text-foreground hover:border-primary hover:text-primary flex items-center gap-2 rounded-xl border px-5 py-2.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isRtl ? 'تصدير CSV' : 'Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="border-border/40 bg-card/25 mb-8 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(1)
            }}
            placeholder={
              isRtl
                ? 'بحث بالمستخدم أو البريد الإلكتروني...'
                : 'Search by user name or email...'
            }
            data-testid="search-input"
            className="bg-background/50 border-border/50 focus:border-primary placeholder:text-muted-foreground/60 w-full rounded-xl border py-2.5 ps-10 pe-4 text-sm transition-all outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('')
                setPage(1)
              }}
              className="text-muted-foreground hover:text-foreground absolute end-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            data-testid="status-filter"
            className="bg-background/50 border-border/50 focus:border-primary text-foreground min-w-[140px] cursor-pointer appearance-none rounded-xl border py-2.5 pr-10 pl-4 text-sm transition-all outline-none"
          >
            <option value="">{isRtl ? 'كل الحالات' : 'All Statuses'}</option>
            <option value="succeeded">{isRtl ? 'ناجح' : 'Succeeded'}</option>
            <option value="pending">
              {isRtl ? 'قيد الانتظار' : 'Pending'}
            </option>
            <option value="failed">{isRtl ? 'فشل' : 'Failed'}</option>
            <option value="refunded">{isRtl ? 'مسترد' : 'Refunded'}</option>
          </select>
          <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
        </div>

        {/* Date From */}
        <div className="relative">
          <Calendar className="text-muted-foreground/60 pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
            data-testid="date-from"
            className="bg-background/50 border-border/50 focus:border-primary text-foreground min-w-[140px] rounded-xl border py-2.5 ps-10 pe-4 text-xs font-semibold transition-all outline-none"
          />
        </div>

        {/* Date To */}
        <div className="relative">
          <Calendar className="text-muted-foreground/60 pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(1)
            }}
            data-testid="date-to"
            className="bg-background/50 border-border/50 focus:border-primary text-foreground min-w-[140px] rounded-xl border py-2.5 ps-10 pe-4 text-xs font-semibold transition-all outline-none"
          />
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            data-testid="reset-filters"
            className="border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all"
          >
            <X className="h-3.5 w-3.5" />
            {isRtl ? 'إعادة تعيين' : 'Reset'}
          </button>
        )}
      </div>

      {/* Payments Table */}
      <div className="border-border/40 bg-card/10 overflow-hidden rounded-3xl border shadow-sm backdrop-blur-md">
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse text-start"
            role="table"
            data-testid="payments-table"
          >
            <thead>
              <tr className="border-border/40 text-muted-foreground bg-card/30 border-b text-xs font-bold tracking-wider uppercase">
                <th className="px-6 py-4 text-start font-black">
                  {isRtl ? 'التاريخ' : 'Date'}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {isRtl ? 'المستخدم' : 'User'}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {isRtl ? 'الخطة' : 'Plan'}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {isRtl ? 'المبلغ' : 'Amount'}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {isRtl ? 'العملة' : 'Currency'}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {isRtl ? 'الحالة' : 'Status'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-border/40 divide-y">
              {loading && payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-muted-foreground px-6 py-12 text-center font-semibold"
                    data-testid="no-data"
                  >
                    {isRtl ? 'لا توجد مدفوعات' : 'No payments found'}
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const pUser =
                    typeof payment.userId === 'object' && payment.userId
                      ? (payment.userId as PaymentUser)
                      : null
                  const statusBadge = getStatusBadge(payment.status)
                  const planBadgeColor = getPlanBadge(
                    pUser?.planSlug || payment.planSlug
                  )

                  return (
                    <tr
                      key={payment._id}
                      className="hover:bg-card/20 transition-colors"
                      data-testid="payment-row"
                    >
                      {/* Date */}
                      <td className="text-muted-foreground px-6 py-4.5 text-xs font-semibold whitespace-nowrap">
                        {new Date(payment.createdAt).toLocaleDateString(
                          i18n.language,
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
                      </td>

                      {/* User */}
                      <td className="px-6 py-4.5">
                        {pUser ? (
                          <Link
                            to={`/admin/accounts`}
                            className="group"
                            data-testid="user-link"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-xl">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-foreground group-hover:text-primary text-sm font-bold transition-colors">
                                  {pUser.name}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {pUser.email}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs font-semibold">
                            {isRtl ? 'مستخدم غير معروف' : 'Unknown User'}
                          </span>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="px-6 py-4.5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${planBadgeColor}`}
                        >
                          {pUser?.planSlug || payment.planSlug || 'free'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4.5">
                        <span className="text-foreground text-sm font-black">
                          {payment.amount.toLocaleString()}
                        </span>
                      </td>

                      {/* Currency */}
                      <td className="px-6 py-4.5">
                        <span className="text-muted-foreground text-xs font-bold uppercase">
                          {payment.currency}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusBadge.color}`}
                          data-testid="status-badge"
                        >
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>
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

export default AdminPayments
