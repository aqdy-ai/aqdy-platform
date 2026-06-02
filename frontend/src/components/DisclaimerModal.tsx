import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const DisclaimerModal = () => {
  const { t, i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)

  // Ensure component only renders on client side after mount
  useEffect(() => {
    const frameId = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frameId)
  }, [])

  // قراءة الحالة مباشرة من الـ localStorage
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const hasAccepted = localStorage.getItem('aqdy_disclaimer_accepted')
      return !hasAccepted
    }
    return false
  })

  const isRtl = i18n.language === 'ar'

  const handleAccept = () => {
    localStorage.setItem('aqdy_disclaimer_accepted', 'true')
    setIsOpen(false)
  }

  // Don't render until mounted to prevent hydration issues
  if (!mounted || !isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* الـ Overlay مع Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()} // منع الإغلاق عند الضغط بالخطأ بالخارج لضمان الموافقة
            className="bg-background/60 absolute inset-0 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-card border-border/50 relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border-2 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)]"
          >
            {/* Top gradient bar - ميزة جمالية من Antigravity */}
            <div className="from-primary via-secondary to-primary h-2 w-full bg-gradient-to-r" />

            <div className="p-8 sm:p-10">
              <div className="mb-8 flex items-center gap-4">
                <div className="bg-primary/10 rounded-2xl p-3 shadow-inner">
                  <ShieldCheck className="text-primary" size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">
                    {isRtl ? 'إخلاء مسؤولية قانوني' : 'Legal Disclaimer'}
                  </h2>
                  <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    {isRtl ? 'اتفاقية الاستخدام' : 'Terms of Use'}
                  </p>
                </div>
              </div>

              <div className="text-muted-foreground space-y-6 text-base leading-relaxed">
                <p className="font-medium">
                  {t('disclaimer.description', {
                    defaultValue: isRtl
                      ? 'منصة عقدي هي مساعد قانوني ذكي يهدف لتسهيل مراجعة العقود، ولا تعتبر استشارة قانونية رسمية.'
                      : 'Aqdy is an AI legal assistant designed to facilitate contract review and is not a formal legal advice.',
                  })}
                </p>

                <div className="flex gap-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
                  <div className="h-fit shrink-0 rounded-xl bg-amber-500/10 p-2">
                    <AlertTriangle className="text-amber-500" size={20} />
                  </div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {t('disclaimer.warning', {
                      defaultValue: isRtl
                        ? 'يرجى مراجعة محامي مختص قبل اتخاذ أي قرارات قانونية نهائية.'
                        : 'Please consult a specialized lawyer before making any final legal decisions.',
                    })}
                  </p>
                </div>
              </div>

              <button
                onClick={handleAccept}
                className="group bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 relative mt-10 w-full overflow-hidden rounded-2xl py-4 font-bold shadow-xl transition-all active:scale-[0.98]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {t('disclaimer.accept_button', {
                    defaultValue: isRtl
                      ? 'أوافق وأفهم ذلك'
                      : 'I Understand & Accept',
                  })}
                  <ChevronRight
                    size={18}
                    className={`transition-transform duration-300 group-hover:translate-x-1 ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : ''}`}
                  />
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>

              <p className="text-muted-foreground/60 mt-6 text-center text-[10px]">
                {isRtl
                  ? 'بالضغط على "أوافق"، فإنك تقر بأنك قرأت وفهمت إخلاء المسؤولية أعلاه.'
                  : 'By clicking "I Understand", you acknowledge that you have read and understood the disclaimer above.'}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default DisclaimerModal
