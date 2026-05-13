import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme()
  const { i18n } = useTranslation()

  const isRtl = i18n.language === 'ar'

  return (
    <div className="bg-background text-foreground min-h-screen font-sans transition-colors duration-300">
      <Toaster dir={isRtl ? 'rtl' : 'ltr'} position="bottom-right" richColors />

      <nav className="border-border bg-card/50 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="group flex cursor-pointer items-center gap-2.5">
            <div className="flex items-center">
              <img
                src="/AqdyLogo.png"
                alt="Aqdy Logo"
                className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            {/* Text Brand */}
            <div className="flex flex-col">
              <span className="text-primary text-2xl leading-tight font-extrabold tracking-tighter">
                Aqdy
              </span>
              <div className="bg-primary h-[2px] w-0 transition-all duration-300 group-hover:w-full" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="hover:bg-muted text-foreground/80 hover:text-primary rounded-xl p-2.5 transition-all active:scale-90"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => i18n.changeLanguage(isRtl ? 'en' : 'ar')}
              className="hover:bg-primary/10 border-border hover:border-primary/30 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all"
            >
              {isRtl ? 'English' : 'العربية'}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-12">{children}</main>
    </div>
  )
}

export default MainLayout
