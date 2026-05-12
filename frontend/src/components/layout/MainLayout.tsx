import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import LanguageSwitcher from '../LanguageSwitcher.tsx'

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
      className={`bg-background text-foreground min-h-screen transition-colors duration-300 ${isRtl ? 'font-arabic' : 'font-sans'}`}
    >
      <Toaster
        dir={isRtl ? 'rtl' : 'ltr'}
        position={isRtl ? 'bottom-left' : 'bottom-right'}
        richColors
      />

      <nav className="border-border bg-card/50 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo Section */}
          <div className="group flex cursor-pointer items-center gap-2.5">
            <div className="flex items-center">
              <img
                src="/AqdyLogo.png"
                alt="Aqdy Logo"
                className={`h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105 ${isRtl ? 'ml-[-10px]' : 'mr-[-10px]'}`}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-primary text-2xl leading-tight font-extrabold tracking-tighter">
                {t('common.brand_name')}
              </span>
              <div className="bg-primary h-[2px] w-0 transition-all duration-300 group-hover:w-full" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="hover:bg-muted text-foreground/80 hover:text-primary rounded-xl p-2.5 transition-all active:scale-90"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* تم استخدام الـ Component هنا */}
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-12">{children}</main>
    </div>
  )
}

export default MainLayout
