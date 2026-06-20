import { ReactNode, useEffect, useState, useRef } from 'react'
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
  ChevronDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        <aside className="border-border/40 bg-background/70 w-full shrink-0 overflow-x-clip border-b backdrop-blur-xl md:sticky md:top-0 md:h-screen md:w-64 md:border-e md:border-b-0">
          <div className="flex h-full flex-col">
            {/* Profile Dropdown Trigger */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setMenuOpen(!menuOpen)
                  }
                }}
                aria-expanded={menuOpen}
                aria-haspopup="true"
                className="border-border/30 hover:bg-muted/50 flex w-full items-center gap-3 border-b px-5 py-4 text-start transition-colors"
              >
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
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
                <ChevronDown
                  size={14}
                  className={`text-muted-foreground shrink-0 transition-transform duration-200 ${
                    menuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="bg-card border-border/50 absolute z-50 mt-1 w-full rounded-2xl border shadow-xl backdrop-blur-xl"
                    role="menu"
                  >
                    <div className="space-y-0.5 p-2">
                      <button
                        onClick={() => {
                          toggleTheme()
                          setMenuOpen(false)
                        }}
                        className="hover:bg-muted text-foreground flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
                        role="menuitem"
                      >
                        {theme === 'light' ? (
                          <Moon size={15} strokeWidth={2} />
                        ) : (
                          <Sun size={15} strokeWidth={2} />
                        )}
                        <span>{t('common.toggle_theme')}</span>
                      </button>

                      <button
                        onClick={() => {
                          i18n.changeLanguage(isRtl ? 'en' : 'ar')
                          setMenuOpen(false)
                        }}
                        className="hover:bg-muted text-foreground flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
                        role="menuitem"
                      >
                        <span className="flex h-[15px] w-[15px] items-center justify-center text-xs font-black">
                          {isRtl ? 'EN' : 'ع'}
                        </span>
                        <span>{isRtl ? 'Switch Language' : 'تغيير اللغة'}</span>
                      </button>

                      <hr className="border-border/30 my-1" />

                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          handleLogout()
                        }}
                        className="hover:bg-destructive/10 hover:text-destructive text-foreground flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
                        role="menuitem"
                      >
                        <LogOut size={15} strokeWidth={2} />
                        <span>{t('nav.logout')}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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

            {/* Spacer */}
            <div className="flex-1" />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-5 py-5">
            <div className="bg-card/30 border-border/40 min-h-[60vh] rounded-3xl border p-6 shadow-sm backdrop-blur-md">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
