import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ExportReportButton() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // إغلاق القائمة عند الضغط خارجها أو عند الضغط على Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleExport = (type: 'pdf' | 'docx') => {
    setIsOpen(false)
    console.log(`Exporting report as ${type}...`)
  }

  return (
    <div className="relative inline-block text-start" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="export-dropdown-menu"
        className={cn(
          'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring ring-offset-background flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          isOpen && 'bg-primary/90'
        )}
      >
        <Download className="h-4 w-4" />
        <span>{t('dashboard.export_report')}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="export-dropdown-menu"
          role="menu"
          aria-label={t('dashboard.export_report')}
          className="border-border bg-card animate-in fade-in slide-in-from-top-2 absolute end-0 z-50 mt-2 w-48 origin-top-right rounded-xl border p-1.5 shadow-lg ring-1 ring-black/5 duration-150"
        >
          {/* PDF Option */}
          <button
            onClick={() => handleExport('pdf')}
            role="menuitem"
            className="text-foreground hover:bg-muted/80 focus:bg-muted/80 focus-visible:ring-primary/20 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
          >
            <FileText className="h-4 w-4 text-red-500" aria-hidden="true" />
            <span>{t('dashboard.export_pdf')}</span>
          </button>

          {/* DOCX Option */}
          <button
            onClick={() => handleExport('docx')}
            role="menuitem"
            className="text-foreground hover:bg-muted/80 focus:bg-muted/80 focus-visible:ring-primary/20 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
          >
            <FileSpreadsheet
              className="h-4 w-4 text-blue-500"
              aria-hidden="true"
            />
            <span>{t('dashboard.export_docx')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
