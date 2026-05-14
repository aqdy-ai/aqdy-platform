import { Sun, Moon, ExternalLink } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import LanguageSwitcher from '../LanguageSwitcher.tsx'
import { motion } from 'framer-motion'

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme()
  const { i18n, t } = useTranslation()
  const isRtl = i18n.language === 'ar'

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language, isRtl])

  return (
    <div
      className={`bg-background text-foreground selection:bg-primary selection:text-primary-foreground min-h-screen transition-colors duration-500 ${isRtl ? 'font-arabic' : 'font-sans'}`}
    >
      <Toaster
        dir={isRtl ? 'rtl' : 'ltr'}
        position={isRtl ? 'bottom-left' : 'bottom-right'}
        richColors
        closeButton
      />

      <nav className="border-border/40 bg-background/70 sticky top-0 z-[60] border-b backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          {/* Logo Section */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="group flex cursor-pointer items-center gap-3"
          >
            <div className="relative flex items-center">
              <div className="bg-primary/20 absolute -inset-1 rounded-full opacity-0 blur transition-opacity group-hover:opacity-100" />
              <img
                src="/AqdyLogo.png"
                alt="Aqdy Logo"
                className="relative ms-[-12px] h-14 w-auto object-contain transition-transform duration-500 group-hover:rotate-3"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-primary text-3xl leading-tight font-black tracking-tighter">
                {t('common.brand_name')}
              </span>
              <span className="text-muted-foreground/60 group-hover:text-primary -mt-1 text-[10px] font-bold tracking-widest uppercase transition-colors">
                {t('common.tagline')}
              </span>
            </div>
          </motion.div>

          <div className="flex items-center gap-6">
            {/* Nav Links - Desktop only */}
            <div className="text-muted-foreground hidden items-center gap-8 text-sm font-bold md:flex">
              <a href="/" className="hover:text-primary transition-colors">
                {t('nav.home')}
              </a>
              <a
                href="#"
                className="hover:text-primary flex items-center gap-1 transition-colors"
              >
                {t('nav.how_it_works')}
                <ExternalLink size={12} className="opacity-50" />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                {t('nav.pricing')}
              </a>
            </div>

            <div className="bg-border/60 mx-2 hidden h-6 w-[1px] md:block" />

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="bg-card/30 border-border/50 hover:bg-muted text-foreground/80 hover:text-primary rounded-xl border p-3 transition-all active:scale-90"
                aria-label="Toggle Theme"
              >
                {theme === 'light' ? (
                  <Moon size={18} strokeWidth={2.5} />
                ) : (
                  <Sun size={18} strokeWidth={2.5} />
                )}
              </button>

              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </nav>

      <main className="relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="pointer-events-none absolute inset-0 -z-10 h-full w-full">
          <div className="bg-primary/5 absolute start-[-5rem] top-40 h-96 w-96 rounded-full blur-[100px]" />
          <div className="bg-secondary/5 absolute end-[-5rem] top-80 h-[500px] w-[500px] rounded-full blur-[120px]" />
        </div>

        <div className="mx-auto max-w-7xl px-6">{children}</div>
      </main>

      <footer className="border-border/40 bg-card/20 mt-20 border-t py-12 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <span className="text-primary text-xl font-black">
              {t('common.brand_name')}
            </span>
            <p className="text-muted-foreground text-sm">
              © 2026 {t('common.brand_name')}.{' '}
              {isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </p>
          </div>

          <div className="text-muted-foreground flex gap-6 text-sm font-medium">
            <a href="#" className="hover:text-primary transition-colors">
              {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              {isRtl ? 'شروط الخدمة' : 'Terms of Service'}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout
