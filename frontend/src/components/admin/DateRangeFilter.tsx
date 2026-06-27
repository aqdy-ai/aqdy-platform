import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Filter, RotateCcw } from 'lucide-react'

interface DateRangeFilterProps {
  initialStartDate?: string
  initialEndDate?: string
  onApply: (startDate: string, endDate: string) => void
  onReset: () => void
  isPopover?: boolean
  isOverridden?: boolean
  onUseGlobal?: () => void
}

export function DateRangeFilter({
  initialStartDate = '',
  initialEndDate = '',
  onApply,
  onReset,
  isPopover = false,
  isOverridden = false,
  onUseGlobal,
}: DateRangeFilterProps) {
  const { t } = useTranslation()
  const [start, setStart] = useState(initialStartDate)
  const [end, setEnd] = useState(initialEndDate)
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Track previous prop values so we only update state when props truly change
  const prevStartRef = useRef(initialStartDate)
  const prevEndRef = useRef(initialEndDate)
  if (prevStartRef.current !== initialStartDate) {
    prevStartRef.current = initialStartDate
    setStart(initialStartDate)
  }
  if (prevEndRef.current !== initialEndDate) {
    prevEndRef.current = initialEndDate
    setEnd(initialEndDate)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isPopover && isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, isPopover])

  const handleApply = () => {
    if (start && end && new Date(start) > new Date(end)) {
      setError(
        t('admin.date_error', {
          defaultValue: 'Start date cannot be after end date',
        })
      )
      return
    }
    setError('')
    onApply(start, end)
    setIsOpen(false)
  }

  const handleReset = () => {
    setStart('')
    setEnd('')
    setError('')
    onReset()
    setIsOpen(false)
  }

  const filterFields = (
    <div className="flex min-w-[240px] flex-col gap-3 p-1">
      <div>
        <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
          {t('admin.start_date', { defaultValue: 'Start Date' })}
        </label>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="bg-background border-border/65 text-foreground focus:border-primary/70 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
        />
      </div>
      <div>
        <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
          {t('admin.end_date', { defaultValue: 'End Date' })}
        </label>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="bg-background border-border/65 text-foreground focus:border-primary/70 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
        />
      </div>
      {error && (
        <p className="text-destructive text-xs font-semibold">{error}</p>
      )}
      <div className="mt-1 flex items-center justify-between gap-2">
        <button
          onClick={handleReset}
          className="bg-muted hover:bg-muted/80 text-muted-foreground flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all"
        >
          <RotateCcw size={12} />
          {t('common.reset', { defaultValue: 'Reset' })}
        </button>
        <button
          onClick={handleApply}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 rounded-xl px-4 py-2 text-xs font-bold transition-all"
        >
          {t('common.apply', { defaultValue: 'Apply' })}
        </button>
      </div>
    </div>
  )

  if (isPopover) {
    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          {isOverridden && (
            <span className="flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-black text-amber-500">
              {t('admin.custom_range', { defaultValue: 'Custom Range' })}
              {onUseGlobal && (
                <button
                  onClick={onUseGlobal}
                  className="ml-1 text-[10px] font-bold uppercase hover:underline"
                >
                  ({t('admin.use_global', { defaultValue: 'Use Global' })})
                </button>
              )}
            </span>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border/30 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all"
          >
            <Filter size={13} />
            {t('admin.filter', { defaultValue: 'Filter' })}
          </button>
        </div>

        {isOpen && (
          <div className="bg-card border-border/40 absolute right-0 z-50 mt-2 min-w-[280px] rounded-2xl border p-4 shadow-xl">
            {filterFields}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-card/40 border-border/40 flex flex-wrap items-end gap-3 rounded-2xl border p-4">
      <div className="flex min-w-[200px] flex-1 items-center gap-2">
        <Calendar className="text-primary shrink-0" size={16} />
        <div className="flex-1">
          <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
            {t('admin.start_date', { defaultValue: 'Start Date' })}
          </label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-background border-border/50 text-foreground focus:border-primary/50 w-full rounded-xl border px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
      </div>
      <div className="flex min-w-[200px] flex-1 items-center gap-2">
        <Calendar className="text-primary shrink-0" size={16} />
        <div className="flex-1">
          <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
            {t('admin.end_date', { defaultValue: 'End Date' })}
          </label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-background border-border/50 text-foreground focus:border-primary/50 w-full rounded-xl border px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
      </div>
      {error && (
        <p className="text-destructive mt-1 w-full text-xs font-semibold">
          {error}
        </p>
      )}
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={handleReset}
          className="bg-muted hover:bg-muted/80 text-muted-foreground flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all"
        >
          <RotateCcw size={12} />
          {t('common.reset', { defaultValue: 'Reset' })}
        </button>
        <button
          onClick={handleApply}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 py-2 text-xs font-bold transition-all"
        >
          {t('common.apply', { defaultValue: 'Apply' })}
        </button>
      </div>
    </div>
  )
}
