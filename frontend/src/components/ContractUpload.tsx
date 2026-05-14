import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ContractUpload = () => {
  const { t, i18n } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const isRtl = i18n.language === 'ar'

  const handleFileSelection = (selectedFile: File | undefined) => {
    setError(null)

    if (!selectedFile) return

    // Type validation
    if (selectedFile.type !== 'application/pdf') {
      setError(
        t('upload.error_invalid_type', {
          defaultValue: isRtl
            ? 'يرجى اختيار ملف PDF فقط'
            : 'Please select a PDF file only',
        })
      )
      return
    }

    // Size validation
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(
        t('upload.error_too_large', {
          defaultValue: isRtl
            ? 'حجم الملف يتجاوز 10 ميجابايت'
            : 'File size exceeds 10MB',
        })
      )
      return
    }

    setFile(selectedFile)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    handleFileSelection(selectedFile)
    // Reset input value so the same file can be selected again if removed
    e.target.value = ''
  }

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    handleFileSelection(droppedFile)
  }, [])

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFile(null)
    setError(null)
  }

  const handleStartAnalysis = () => {
    if (!file) return
    console.log('Starting analysis for:', file.name)
    // Future: integration with Firebase/AI service
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <input
        type="file"
        id="contract-upload-input"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="application/pdf"
        className="sr-only"
        aria-hidden="true"
      />

      <motion.div
        layout
        onClick={() => fileInputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            fileInputRef.current?.click()
          }
        }}
        aria-label={t('upload.dropzone_label', {
          defaultValue: 'Upload contract',
        })}
        className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border-2 border-dashed p-10 transition-all duration-500 ${
          isDragging
            ? 'border-primary bg-primary/10 shadow-primary/20 scale-[1.02] shadow-2xl'
            : 'border-border/60 bg-card/50 hover:border-primary/40 hover:bg-card/80 backdrop-blur-md'
        } ${file ? 'border-primary/40 bg-primary/5 border-solid' : ''}`}
      >
        {/* Background glow effect */}
        <div className="from-primary/5 to-secondary/5 pointer-events-none absolute inset-0 bg-gradient-to-tr via-transparent" />

        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div className="bg-primary/10 mb-6 rounded-3xl p-5 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                <Upload className="text-primary" size={40} strokeWidth={1.5} />
              </div>
              <h3 className="mb-3 text-2xl font-black tracking-tight">
                {t('upload.title', {
                  defaultValue: isRtl
                    ? 'ارفع عقدك هنا'
                    : 'Upload your contract',
                })}
              </h3>
              <p className="text-muted-foreground mb-4 max-w-[300px] text-base leading-relaxed">
                {t('upload.subtitle', {
                  defaultValue: isRtl
                    ? 'اسحب وأفلت ملف PDF أو اضغط للتصفح'
                    : 'Drag and drop your PDF file or click to browse',
                })}
              </p>
              <div className="bg-muted/50 text-muted-foreground/80 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium">
                <FileText size={14} />
                <span>
                  {t('upload.hint', { defaultValue: 'PDF only • Max 10MB' })}
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border-primary/20 bg-background/80 relative z-10 flex w-full items-center justify-between rounded-3xl border p-5 shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 rounded-2xl p-3">
                  <FileText className="text-primary" size={30} />
                </div>
                <div className="flex flex-col">
                  <span className="max-w-[180px] truncate text-base font-bold sm:max-w-[300px]">
                    {file.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <span className="bg-muted-foreground/30 h-1 w-1 rounded-full" />
                    <span className="flex items-center gap-1 text-xs font-bold text-green-500">
                      <CheckCircle2 size={12} />
                      {isRtl ? 'جاهز للتحليل' : 'Ready'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="group/btn bg-muted hover:bg-destructive/10 hover:text-destructive rounded-2xl p-3 transition-all duration-300 active:scale-90"
                aria-label={t('common.remove', { defaultValue: 'Remove' })}
              >
                <X size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-destructive/20 bg-destructive/5 text-destructive mt-4 flex items-center gap-3 rounded-2xl border p-4"
          >
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-semibold">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {file && !error && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={handleStartAnalysis}
            className="group bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/40 relative mt-8 w-full overflow-hidden rounded-[1.5rem] px-8 py-5 text-lg font-black shadow-2xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {t('upload.analyze_button', {
                defaultValue: isRtl ? 'بدء التحليل الذكي' : 'Start AI Analysis',
              })}
              <motion.span
                animate={{ x: isRtl ? [-4, 0, -4] : [4, 0, 4] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                {isRtl ? '←' : '→'}
              </motion.span>
            </span>
            <div className="absolute inset-0 -translate-x-full transform bg-gradient-to-r from-white/0 via-white/10 to-white/0 transition-transform duration-1000 group-hover:translate-x-full" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ContractUpload
