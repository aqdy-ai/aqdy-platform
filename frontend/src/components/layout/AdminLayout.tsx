import { ReactNode, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  Users,
  FileText,
  CreditCard,
  LogOut,
  User,
  Sun,
  Moon,
  Languages,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { toast } from 'sonner'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isRtl = i18n.language === 'ar'

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language, isRtl])

  const menuItems = [
    {
      path: '/admin',
      label: t('admin.dashboard_title'),
      icon: Shield,
    },
    {
      path: '/admin/accounts',
      label: t('admin.accounts_title'),
      icon: Users,
    },
    {
      path: '/admin/contracts',
      label: t('history.title'),
      icon: FileText,
    },
    {
      path: '/admin/payments',
      label: t('billing.payment_history'),
      icon: CreditCard,
    },
  ]

  const handleLogout = () => {
    logout()
    toast.success(t('nav.logout'))
    navigate('/login', { replace: true })
  }

  return (
    <div
      className={`bg-background text-foreground selection:bg-primary selection:text-primary-foreground min-h-screen transition-colors duration-500 ${
        isRtl ? 'font-arabic' : 'font-sans'
      }`}
      data-testid="admin-layout"
    >
      <div className="relative flex min-h-screen flex-col md:flex-row">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 -z-10 h-full w-full overflow-hidden">
          <div className="bg-primary/5 absolute start-[-5rem] top-40 h-96 w-96 rounded-full blur-[100px]" />
          <div className="bg-secondary/5 absolute end-[-5rem] top-80 h-[500px] w-[500px] rounded-full blur-[120px]" />
        </div>

        {/* Sidebar Navigation */}
        <aside className="border-border/40 bg-background/70 w-full shrink-0 border-b backdrop-blur-xl md:sticky md:top-0 md:h-screen md:w-64 md:border-e md:border-b-0">
          <div className="flex h-full flex-col">
            {/* User Info Section */}
            <div className="border-border/30 flex items-center gap-3 border-b px-6 py-5">
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                <User size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-bold">
                  {user?.name || ''}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {user?.email || ''}
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav
              className="flex flex-col gap-1.5 px-4 py-6"
              data-testid="admin-sidebar-nav"
            >
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`admin-nav-link-${item.path.replace(/\//g, '-')}`}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'hover:bg-primary/10 text-muted-foreground hover:text-primary'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Spacer to push controls to bottom */}
            <div className="flex-1" />

            {/* Theme & Language Controls */}
            <div className="border-border/30 flex items-center gap-2 border-t px-4 py-3">
              <button
                onClick={toggleTheme}
                aria-label={t('common.toggle_theme')}
                className="bg-card/30 border-border/50 hover:bg-muted text-foreground/80 hover:text-primary focus-visible:ring-primary rounded-xl border p-2.5 transition-all focus-visible:ring-2 active:scale-90"
              >
                {theme === 'light' ? (
                  <Moon size={16} strokeWidth={2.5} aria-hidden="true" />
                ) : (
                  <Sun size={16} strokeWidth={2.5} aria-hidden="true" />
                )}
              </button>

              <button
                onClick={() => i18n.changeLanguage(isRtl ? 'en' : 'ar')}
                className="bg-card/30 border-border/50 hover:bg-muted text-foreground/80 hover:text-primary focus-visible:ring-primary flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all focus-visible:ring-2 active:scale-90"
                aria-label="Switch Language"
              >
                <Languages size={14} className="text-primary" />
                <span>{isRtl ? 'English' : 'العربية'}</span>
              </button>
            </div>

            {/* Sign Out Button */}
            <div className="border-border/30 border-t px-4 py-4">
              <button
                onClick={handleLogout}
                className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300"
              >
                <LogOut size={18} />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="bg-card/30 border-border/40 min-h-[60vh] rounded-3xl border p-6 shadow-sm backdrop-blur-md">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
