import { createContext, useContext, useState, ReactNode } from 'react'

interface DashboardFilterContextType {
  startDate: string
  endDate: string
  setDates: (start: string, end: string) => void
  resetDates: () => void
}

const DashboardFilterContext = createContext<
  DashboardFilterContextType | undefined
>(undefined)

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const setDates = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
  }

  const resetDates = () => {
    setStartDate('')
    setEndDate('')
  }

  return (
    <DashboardFilterContext.Provider
      value={{ startDate, endDate, setDates, resetDates }}
    >
      {children}
    </DashboardFilterContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDashboardFilter() {
  const context = useContext(DashboardFilterContext)
  if (!context) {
    throw new Error(
      'useDashboardFilter must be used within a DashboardFilterProvider'
    )
  }
  return context
}
