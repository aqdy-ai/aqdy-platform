import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ExportReportButton() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // إغلاق القائمة تلقائياً لو المستخدم ضغط في أي مكان برة الزرار
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = (type: 'pdf' | 'docx') => {
    setIsOpen(false)
    // 💡 هنا هنربط الـ Actual Integration الأسبوع الجاي يا ميرنا
    console.log(`Exporting report as ${type}...`)
  }

  return (
    <div className="relative inline-block text-start" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/20 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 focus:ring-2 focus:outline-none',
          isOpen && 'ring-primary/20 bg-primary/90 ring-2'
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

      {/* Dropdown Menu with Smooth Transition */}
      {isOpen && (
        <div className="border-muted bg-card animate-in fade-in slide-in-from-top-2 absolute end-0 z-50 mt-2 w-48 origin-top-right rounded-xl border p-1.5 shadow-lg ring-1 ring-black/5 duration-150">
          {/* PDF Option */}
          <button
            onClick={() => handleExport('pdf')}
            className="text-foreground hover:bg-muted/60 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm font-medium transition-colors"
          >
            <FileText className="h-4 w-4 text-red-500" />
            <span>{t('dashboard.export_pdf')}</span>
          </button>

          {/* DOCX Option */}
          <button
            onClick={() => handleExport('docx')}
            className="text-foreground hover:bg-muted/60 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm font-medium transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-blue-500" />
            <span>{t('dashboard.export_docx')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
