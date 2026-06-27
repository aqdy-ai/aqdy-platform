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

  useEffect(() => {
    setStart(initialStartDate)
    setEnd(initialEndDate)
  }, [initialStartDate, initialEndDate])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
      setError(t('admin.date_error', { defaultValue: 'Start date cannot be after end date' }))
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
    <div className="flex flex-col gap-3 p-1 min-w-[240px]">
      <div>
        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
          {t('admin.start_date', { defaultValue: 'Start Date' })}
        </label>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="w-full text-sm bg-background border border-border/65 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/70"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
          {t('admin.end_date', { defaultValue: 'End Date' })}
        </label>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="w-full text-sm bg-background border border-border/65 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/70"
        />
      </div>
      {error && <p className="text-xs text-destructive font-semibold">{error}</p>}
      <div className="flex items-center justify-between gap-2 mt-1">
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl text-xs font-bold transition-all"
        >
          <RotateCcw size={12} />
          {t('common.reset', { defaultValue: 'Reset' })}
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold transition-all"
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
            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-xs font-black border border-amber-500/20">
              {t('admin.custom_range', { defaultValue: 'Custom Range' })}
              {onUseGlobal && (
                <button
                  onClick={onUseGlobal}
                  className="hover:underline text-[10px] ml-1 uppercase font-bold"
                >
                  ({t('admin.use_global', { defaultValue: 'Use Global' })})
                </button>
              )}
            </span>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold transition-all border border-border/30"
          >
            <Filter size={13} />
            {t('admin.filter', { defaultValue: 'Filter' })}
          </button>
        </div>

        {isOpen && (
          <div className="absolute right-0 mt-2 z-50 bg-card border border-border/40 rounded-2xl p-4 shadow-xl min-w-[280px]">
            {filterFields}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-card/40 border border-border/40 rounded-2xl">
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <Calendar className="text-primary shrink-0" size={16} />
        <div className="flex-1">
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
            {t('admin.start_date', { defaultValue: 'Start Date' })}
          </label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full text-sm bg-background border border-border/50 rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <Calendar className="text-primary shrink-0" size={16} />
        <div className="flex-1">
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
            {t('admin.end_date', { defaultValue: 'End Date' })}
          </label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full text-sm bg-background border border-border/50 rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>
      {error && <p className="w-full text-xs text-destructive font-semibold mt-1">{error}</p>}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl text-xs font-bold transition-all"
        >
          <RotateCcw size={12} />
          {t('common.reset', { defaultValue: 'Reset' })}
        </button>
        <button
          onClick={handleApply}
          className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold transition-all"
        >
          {t('common.apply', { defaultValue: 'Apply' })}
        </button>
      </div>
    </div>
  )
}
