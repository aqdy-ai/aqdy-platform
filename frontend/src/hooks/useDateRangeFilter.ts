import { useState } from 'react'
import { useDashboardFilter } from '../context/DashboardFilterContext'

export function useDateRangeFilter() {
  const globalFilter = useDashboardFilter()
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  const [isOverridden, setIsOverridden] = useState(false)

  const effectiveStart = isOverridden ? customStart : globalFilter.startDate
  const effectiveEnd = isOverridden ? customEnd : globalFilter.endDate

  const applyCustomFilter = (start: string, end: string) => {
    setCustomStart(start)
    setCustomEnd(end)
    setIsOverridden(true)
  }

  const resetToGlobal = () => {
    setCustomStart('')
    setCustomEnd('')
    setIsOverridden(false)
  }

  return {
    startDate: effectiveStart,
    endDate: effectiveEnd,
    isOverridden,
    applyCustomFilter,
    resetToGlobal,
  }
}
