import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  ArrowUpDown,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  Lock,
  ChevronDown,
} from 'lucide-react'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { ContractHistoryRow } from '../components/ContractHistoryRow'
import { UpgradeModal } from '../components/UpgradeModal'
import { cn } from '@/lib/utils'

interface ContractData {
  contractId: string
  filename: string
  uploadDate: string
  language: string
  fileSize: number
  status: 'analyzed' | 'pending' | 'failed'
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | null
  analysisId: string | null
  riskSummary?: { ar: string; en: string } | null
  totalClauses?: number | null
  riskyClausesCount?: number | null
  version?: number
}

interface FetchContractsResponse {
  contracts: ContractData[]
  total: number
  page: number
  totalPages: number
  limit: number
}

export default function ContractHistory() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  // Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState('')
  const [appliedDateTo, setAppliedDateTo] = useState('')
  const [riskFilter, setRiskFilter] = useState('') // '', 'high', 'medium', 'low'
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Sorting States
  const [sortBy, setSortBy] = useState<
    'uploadedAt' | 'analyzedAt' | 'riskLevel'
  >('uploadedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Modals & UI States
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)

  // Search Debounce Effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Close export dropdown on click outside
  useEffect(() => {
    if (!exportDropdownOpen) return
    const closeDropdown = () => setExportDropdownOpen(false)
    document.addEventListener('click', closeDropdown)
    return () => document.removeEventListener('click', closeDropdown)
  }, [exportDropdownOpen])

  // React Query - Subscription Fetch
  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await fetch('/api/account/subscription')
      if (!response.ok) throw new Error('Failed to load subscription')
      const resData = await response.json()
      return resData.data
    },
  })

  const userPlan = subscriptionData?.subscription?.planId?.slug || 'free'
  const isProOrEnterprise = ['pro', 'enterprise', 'premium'].includes(userPlan)

  // React Query - Contracts Fetch
  const { data, isLoading, isError, refetch } =
    useQuery<FetchContractsResponse>({
      queryKey: [
        'contracts',
        debouncedSearchQuery,
        appliedDateFrom,
        appliedDateTo,
        riskFilter,
        page,
        limit,
        sortBy,
        sortOrder,
      ],
      queryFn: async () => {
        const params = new URLSearchParams()
        params.append('page', String(page))
        params.append('limit', String(limit))
        params.append('sortBy', sortBy)
        params.append('sortOrder', sortOrder)
        if (debouncedSearchQuery)
          params.append('filename', debouncedSearchQuery)
        if (appliedDateFrom)
          params.append(
            'uploadedAfter',
            new Date(appliedDateFrom).toISOString()
          )
        if (appliedDateTo) {
          const toDate = new Date(appliedDateTo)
          toDate.setHours(23, 59, 59, 999)
          params.append('uploadedBefore', toDate.toISOString())
        }
        if (riskFilter) params.append('riskLevel', riskFilter)

        const response = await fetch(
          `/api/account/contracts?${params.toString()}`
        )
        if (!response.ok) throw new Error('Failed to fetch contracts')
        const resData = await response.json()
        return resData.data as FetchContractsResponse
      },
    })

  // Handlers
  const handleSort = (field: 'uploadedAt' | 'analyzedAt' | 'riskLevel') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const handleExportClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isProOrEnterprise) {
      setUpgradeModalOpen(true)
    } else {
      setExportDropdownOpen((prev) => !prev)
    }
  }

  const triggerDownload = (format: 'csv' | 'json') => {
    window.open(`/api/account/contracts/export?format=${format}`, '_blank')
  }

  const handleApplyDateFilter = () => {
    setAppliedDateFrom(dateFrom)
    setAppliedDateTo(dateTo)
    setPage(1)
  }

  const resetFilters = () => {
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
    setAppliedDateFrom('')
    setAppliedDateTo('')
    setRiskFilter('')
    setPage(1)
  }

  // Row callbacks
  const handleDeleteSuccess = () => {
    refetch()
  }

  const handleReanalyzeSuccess = () => {
    refetch()
  }

  const hasActiveFilters =
    searchQuery !== '' ||
    appliedDateFrom !== '' ||
    appliedDateTo !== '' ||
    riskFilter !== ''
  const showEmptyState =
    !isLoading && !isError && data?.contracts?.length === 0 && !hasActiveFilters
  const showNoResults =
    !isLoading && !isError && data?.contracts?.length === 0 && hasActiveFilters

  return (
    <div className="animate-in fade-in space-y-8 py-10 duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {t('history.title', { defaultValue: 'Contract History' })}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-semibold">
            {t('history.subtitle', {
              defaultValue:
                'View and manage all your past contracts and their analysis reports.',
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export Button (Pro gated) */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={handleExportClick}
              className="hover:border-primary hover:text-primary h-10 gap-2 rounded-xl px-4 font-bold shadow-sm transition-all"
              data-testid="export-button"
            >
              <Download size={15} />
              <span>{t('history.export_btn', { defaultValue: 'Export' })}</span>
              {!isProOrEnterprise ? (
                <Lock size={12} className="shrink-0 text-amber-500" />
              ) : (
                <ChevronDown size={14} className="opacity-50" />
              )}
            </Button>

            {/* Export Dropdown Options */}
            {exportDropdownOpen && (
              <div
                className={cn(
                  'border-border/50 bg-card animate-in fade-in-0 slide-in-from-top-1 absolute z-[40] mt-2 w-40 rounded-xl border p-1.5 shadow-xl backdrop-blur-md duration-150 end-0'
                )}
                data-testid="export-dropdown"
              >
                <button
                  onClick={() => triggerDownload('csv')}
                  className="hover:bg-primary/10 hover:text-primary flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-xs font-bold transition-colors"
                >
                  <FileSpreadsheet size={14} />
                  <span>
                    {t('history.export_csv', { defaultValue: 'Export CSV' })}
                  </span>
                </button>
                <button
                  onClick={() => triggerDownload('json')}
                  className="hover:bg-primary/10 hover:text-primary flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-xs font-bold transition-colors"
                >
                  <FileCode size={14} />
                  <span>
                    {t('history.export_json', { defaultValue: 'Export JSON' })}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Upload New CTA */}
          <Button
            asChild
            className="shadow-primary/10 h-10 gap-2 rounded-xl px-5 font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Link to="/">
              <Plus size={16} strokeWidth={2.5} />
              <span>
                {t('history.empty_cta', { defaultValue: 'Upload Contract' })}
              </span>
            </Link>
          </Button>
        </div>
      </div>

      <hr className="border-border/40" />

      {/* Filters Dashboard Card */}
      <div className="bg-card border-border/60 space-y-6 rounded-3xl border p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {/* Search bar */}
          <div className="relative">
            <Search className="text-muted-foreground/60 focus-within:text-primary absolute start-3 top-1/2 h-4 w-4 shrink-0 -translate-y-1/2 transition-colors" />
            <Input
              type="text"
              placeholder={t('history.search_placeholder', {
                defaultValue: 'Search by filename...',
              })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'bg-input/10 border-border/60 hover:border-border placeholder:text-muted-foreground/50 h-10 rounded-xl font-semibold ps-10'
              )}
              aria-label="Search filename"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={cn(
                  'text-muted-foreground/60 hover:text-foreground absolute end-2 top-1/2 -translate-y-1/2 rounded-full p-1'
                )}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date range from picker */}
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <Calendar
                className="text-muted-foreground/60 absolute start-3 top-1/2 h-4 w-4 shrink-0 -translate-y-1/2 cursor-pointer"
                onClick={(e) => {
                  const input = e.currentTarget.parentElement?.querySelector(
                    'input[type="date"]'
                  ) as HTMLInputElement | null
                  input?.showPicker()
                }}
              />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(1)
                }}
                placeholder={t('history.date_from', {
                  defaultValue: 'From Date',
                })}
                className={cn(
                  'bg-input/10 border-border/60 hover:border-border h-10 rounded-xl text-xs font-semibold ps-10'
                )}
                aria-label="From Date"
              />
            </div>
          </div>

          {/* Date range to picker */}
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <Calendar
                className="text-muted-foreground/60 absolute start-3 top-1/2 h-4 w-4 shrink-0 -translate-y-1/2 cursor-pointer"
                onClick={(e) => {
                  const input = e.currentTarget.parentElement?.querySelector(
                    'input[type="date"]'
                  ) as HTMLInputElement | null
                  input?.showPicker()
                }}
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
                placeholder={t('history.date_to', { defaultValue: 'To Date' })}
                className={cn(
                  'bg-input/10 border-border/60 hover:border-border h-10 rounded-xl text-xs font-semibold ps-10'
                )}
                aria-label="To Date"
              />
            </div>
          </div>

          {/* Apply Filter Button */}
          <div className="flex items-end gap-2">
            <Button
              onClick={handleApplyDateFilter}
              className="h-10 w-full rounded-xl px-5 text-xs font-bold shadow-sm"
            >
              {isRtl ? 'تطبيق' : 'Apply'}
            </Button>
          </div>

          {/* Risk Level Filter dropdown */}
          <div className="flex gap-2">
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value)
                setPage(1)
              }}
              className="border-border/60 bg-card text-muted-foreground hover:border-border focus:border-primary focus:ring-primary h-10 w-full rounded-xl border px-3.5 text-sm font-semibold transition-all outline-none focus:ring-1"
              aria-label="Filter by Risk Level"
            >
              <option value="">
                {t('history.risk_all', { defaultValue: 'All Risk Levels' })}
              </option>
              <option value="high">
                {t('history.risk_high', { defaultValue: 'High Risk' })}
              </option>
              <option value="medium">
                {t('history.risk_medium', { defaultValue: 'Medium Risk' })}
              </option>
              <option value="low">
                {t('history.risk_low', { defaultValue: 'Low Risk' })}
              </option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="border-border/60 hover:bg-muted h-10 shrink-0 rounded-xl px-3 font-semibold"
                title="Reset Filters"
                data-testid="reset-filters"
              >
                <X size={15} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      {!showEmptyState && !showNoResults && (
        <div className="bg-card border-border/60 overflow-hidden rounded-3xl border shadow-sm transition-all duration-300">
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse text-start text-sm"
              role="table"
            >
              <thead>
                <tr className="border-border/40 bg-muted/40 text-muted-foreground border-b font-bold">
                  <th className="px-6 py-4 text-start font-black">
                    <button
                      onClick={() => handleSort('uploadedAt')}
                      className="hover:text-primary flex items-center gap-1 transition-colors focus:outline-none"
                    >
                      {t('history.table_filename', {
                        defaultValue: 'Filename',
                      })}
                      <ArrowUpDown size={12} className="opacity-50" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-start font-black">
                    {t('history.table_upload_date', {
                      defaultValue: 'Upload Date',
                    })}
                  </th>
                  <th className="px-6 py-4 text-start font-black">
                    {t('history.table_status', { defaultValue: 'Status' })}
                  </th>
                  <th className="px-6 py-4 text-start font-black">
                    <button
                      onClick={() => handleSort('riskLevel')}
                      className="hover:text-primary flex items-center gap-1 transition-colors focus:outline-none"
                    >
                      {t('history.table_risk', { defaultValue: 'Risk Level' })}
                      <ArrowUpDown size={12} className="opacity-50" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-end font-black">
                    {t('history.table_actions', { defaultValue: 'Actions' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border/30 divide-y">
                {isLoading ? (
                  Array.from({ length: limit }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted h-9 w-9 shrink-0 rounded-xl" />
                          <div className="flex-1 space-y-2">
                            <div className="bg-muted h-4 w-32 rounded" />
                            <div className="bg-muted h-3 w-12 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="bg-muted h-4 w-24 rounded" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="bg-muted h-5 w-16 rounded-full" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="bg-muted h-5 w-20 rounded-full" />
                      </td>
                      <td className="px-6 py-5 text-end">
                        <div className="bg-muted inline-block h-8 w-24 rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : isError ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-16 text-center text-sm font-semibold text-red-500"
                    >
                      {t('common.error', {
                        defaultValue:
                          'Something went wrong while fetching data. Please try again.',
                      })}
                    </td>
                  </tr>
                ) : (
                  data?.contracts?.map((contract) => (
                    <ContractHistoryRow
                      key={contract.contractId}
                      contract={contract}
                      onDeleteSuccess={handleDeleteSuccess}
                      onReanalyzeSuccess={handleReanalyzeSuccess}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!isLoading && !isError && data && (
            <div className="border-border/40 flex flex-col items-center justify-between gap-4 border-t px-6 py-4 sm:flex-row">
              <div className="text-muted-foreground flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span>
                    {t('history.items_per_page', {
                      defaultValue: 'Items per page',
                    })}
                  </span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value))
                      setPage(1)
                    }}
                    className="border-border/60 bg-card text-foreground h-8 rounded-lg border px-2 font-bold outline-none"
                    aria-label="Items per page"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <span>
                  {t('history.pagination_show', { defaultValue: 'Showing' })}{' '}
                  {(page - 1) * limit + 1} -{' '}
                  {Math.min(page * limit, data.total)}{' '}
                  {t('history.pagination_of', { defaultValue: 'of' })}{' '}
                  {data.total}
                </span>
              </div>

              {data.totalPages > 1 && (
                <div
                  className="flex items-center gap-1.5"
                  data-testid="pagination-nav"
                >
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="h-8 w-8 rounded-lg"
                    aria-label="Previous Page"
                  >
                    {isRtl ? (
                      <ChevronRight size={14} />
                    ) : (
                      <ChevronLeft size={14} />
                    )}
                  </Button>

                  {Array.from({ length: data.totalPages }).map((_, idx) => {
                    const pageNum = idx + 1
                    // Show a reasonable range of page buttons
                    if (
                      pageNum === 1 ||
                      pageNum === data.totalPages ||
                      Math.abs(pageNum - page) <= 1
                    ) {
                      return (
                        <Button
                          key={`page-${pageNum}`}
                          variant={page === pageNum ? 'default' : 'outline'}
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            'h-8 w-8 rounded-lg text-xs font-bold',
                            page === pageNum && 'shadow-primary/10 shadow-md'
                          )}
                        >
                          {pageNum}
                        </Button>
                      )
                    } else if (
                      (pageNum === 2 && page > 3) ||
                      (pageNum === data.totalPages - 1 &&
                        page < data.totalPages - 2)
                    ) {
                      return (
                        <span
                          key={`dots-${pageNum}`}
                          className="text-muted-foreground px-1 text-xs"
                        >
                          ...
                        </span>
                      )
                    }
                    return null
                  })}

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setPage((prev) => Math.min(prev + 1, data.totalPages))
                    }
                    disabled={page === data.totalPages}
                    className="h-8 w-8 rounded-lg"
                    aria-label="Next Page"
                  >
                    {isRtl ? (
                      <ChevronLeft size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State (No Contracts at all) */}
      {showEmptyState && (
        <div className="bg-card border-border/60 animate-in fade-in flex flex-col items-center justify-center rounded-3xl border p-12 py-20 text-center shadow-sm duration-300">
          <div className="bg-primary/10 text-primary relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
            <div className="bg-primary/20 absolute inset-0 animate-pulse rounded-2xl blur-lg" />
            <Sparkles size={32} className="relative" />
          </div>
          <h2 className="mb-2 text-2xl font-black tracking-tight">
            {t('history.empty_title', { defaultValue: 'No Contracts Yet' })}
          </h2>
          <p className="text-muted-foreground mx-auto mb-8 max-w-sm text-sm leading-relaxed font-semibold">
            {t('history.empty_desc', {
              defaultValue:
                'Get started by uploading and analyzing your first legal contract.',
            })}
          </p>
          <Button
            asChild
            className="shadow-primary/10 h-11 rounded-xl px-6 font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <Link to="/">
              <Plus size={16} strokeWidth={2.5} className="mr-1.5" />
              <span>
                {t('history.empty_cta', {
                  defaultValue: 'Upload New Contract',
                })}
              </span>
            </Link>
          </Button>
        </div>
      )}

      {/* No Search Results State */}
      {showNoResults && (
        <div className="bg-card border-border/60 animate-in fade-in flex flex-col items-center justify-center rounded-3xl border p-12 py-16 text-center shadow-sm duration-300">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Search size={24} />
          </div>
          <h3 className="mb-2 text-lg font-bold tracking-tight">
            {isRtl ? 'لا توجد نتائج مطابقة' : 'No matches found'}
          </h3>
          <p className="text-muted-foreground mx-auto mb-6 max-w-sm text-xs font-semibold">
            {isRtl
              ? 'لم نعثر على أي عقود تطابق خيارات البحث الحالية. جرب تغيير الفلاتر أو الكلمات الدلالية.'
              : "We couldn't find any contracts matching your search filters. Try clearing some criteria."}
          </p>
          <Button
            variant="outline"
            onClick={resetFilters}
            className="h-9 rounded-xl px-4 font-bold transition-all"
          >
            {isRtl ? 'إعادة تعيين الفلاتر' : 'Clear Filters'}
          </Button>
        </div>
      )}

      {/* Upgrade Modal Trigger */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
      />
    </div>
  )
}
