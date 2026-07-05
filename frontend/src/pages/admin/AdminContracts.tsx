import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Search,
  FileText,
  ChevronDown,
  Loader2,
  Download,
  Calendar,
  X,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { adminApi, AdminContract } from '../../services/adminApi'
import { toast } from 'sonner'

/**
 * AdminContracts – Full table of all contracts across all accounts.
 * Admin-only page protected by AdminRoute wrapper.
 */
const AdminContracts = () => {
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  const [contracts, setContracts] = useState<AdminContract[]>([])
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

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminApi.getContracts({
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
        setContracts(res.data.data)
        setTotalPages(res.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
      toast.error(isRtl ? 'فشل في تحميل العقود' : 'Failed to load contracts')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, searchTerm, dateFrom, dateTo, isRtl])

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchContracts()
    }, 300)
    return () => clearTimeout(delay)
  }, [fetchContracts])

  // ── CSV Export ────────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    if (contracts.length === 0) return

    const headers = [
      'Filename',
      'Owner Name',
      'Owner Email',
      'Upload Date',
      'Status',
      'Language',
      'File Size (bytes)',
    ]

    const rows = contracts.map((c) => [
      `"${c.filename.replace(/"/g, '""')}"`,
      c.owner ? `"${c.owner.name.replace(/"/g, '""')}"` : '',
      c.owner ? c.owner.email : '',
      new Date(c.uploadedAt).toISOString(),
      c.status,
      c.language,
      String(c.fileSize),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `admin-contracts-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    toast.success(
      isRtl ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully'
    )
  }, [contracts, isRtl])

  // ── Helpers ──────────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'analyzed':
        return {
          color: 'bg-emerald-500/10 text-emerald-500',
          icon: <CheckCircle2 className="h-3 w-3" />,
          label: isRtl ? 'تم التحليل' : 'Analyzed',
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
      default:
        return {
          color: 'bg-muted text-muted-foreground',
          icon: null,
          label: status,
        }
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
            {isRtl ? 'إدارة العقود' : 'All Contracts'}
          </h1>
          <p className="text-muted-foreground text-sm font-semibold">
            {isRtl
              ? 'عرض وإدارة جميع العقود عبر كل الحسابات'
              : 'View and manage all contracts across all accounts'}
          </p>
        </div>

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          disabled={contracts.length === 0}
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
            placeholder={isRtl ? 'بحث باسم الملف...' : 'Search by filename...'}
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
            className="bg-background/50 border-border/50 focus:border-primary text-foreground min-w-[140px] cursor-pointer appearance-none rounded-xl border py-2.5 ps-4 pe-10 text-sm transition-all outline-none"
          >
            <option value="">{isRtl ? 'كل الحالات' : 'All Statuses'}</option>
            <option value="analyzed">
              {isRtl ? 'تم التحليل' : 'Analyzed'}
            </option>
            <option value="pending">
              {isRtl ? 'قيد الانتظار' : 'Pending'}
            </option>
            <option value="failed">{isRtl ? 'فشل' : 'Failed'}</option>
          </select>
          <ChevronDown className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        </div>

        {/* Date From */}
        <div className="relative">
          <Calendar
            className="text-muted-foreground/60 absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer"
            onClick={(e) => {
              const input = e.currentTarget.parentElement?.querySelector(
                'input[type="date"]'
              ) as HTMLInputElement | null
              input?.showPicker()
            }}
          />
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
          <Calendar
            className="text-muted-foreground/60 absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer"
            onClick={(e) => {
              const input = e.currentTarget.parentElement?.querySelector(
                'input[type="date"]'
              ) as HTMLInputElement | null
              input?.showPicker()
            }}
          />
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

      {/* Contracts Table */}
      <div className="border-border/40 bg-card/10 overflow-hidden rounded-3xl border shadow-sm backdrop-blur-md">
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse text-start"
            role="table"
            data-testid="contracts-table"
          >
            <thead>
              <tr className="border-border/40 text-muted-foreground bg-card/30 border-b text-xs font-bold tracking-wider uppercase">
                <th className="px-6 py-4 text-start font-black">
                  {isRtl ? 'اسم الملف' : 'Filename'}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {isRtl ? 'المالك' : 'Owner'}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {isRtl ? 'تاريخ الرفع' : 'Upload Date'}
                </th>
                <th className="px-6 py-4 text-start font-black">
                  {isRtl ? 'الحالة' : 'Status'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-border/40 divide-y">
              {loading && contracts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-muted-foreground px-6 py-12 text-center font-semibold"
                    data-testid="no-data"
                  >
                    {isRtl ? 'لا توجد عقود' : 'No contracts found'}
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => {
                  const statusBadge = getStatusBadge(contract.status)

                  return (
                    <tr
                      key={contract._id}
                      className="hover:bg-card/20 transition-colors"
                      data-testid="contract-row"
                    >
                      {/* Filename */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-xl">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-foreground max-w-[200px] truncate text-sm font-bold">
                              {contract.filename}
                            </p>
                            <p className="text-muted-foreground text-[10px] uppercase">
                              {contract.language}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-6 py-4.5">
                        {contract.owner ? (
                          <Link
                            to={`/admin/accounts`}
                            className="group"
                            data-testid="owner-link"
                          >
                            <p className="text-foreground group-hover:text-primary text-sm font-bold transition-colors">
                              {contract.owner.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {contract.owner.email}
                            </p>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs font-semibold">
                            {isRtl ? 'مستخدم غير معروف' : 'Unknown User'}
                          </span>
                        )}
                      </td>

                      {/* Upload Date */}
                      <td className="text-muted-foreground px-6 py-4.5 text-xs font-semibold">
                        {new Date(contract.uploadedAt).toLocaleDateString(
                          i18n.language,
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
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

export default AdminContracts
