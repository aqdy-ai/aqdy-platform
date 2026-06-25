/* src/components/layout/Navbar.tsx */
import { useState, useRef, useEffect } from 'react'
import {
  Sun,
  Moon,
  ExternalLink,
  User,
  Settings,
  LogOut,
  Shield,
  History,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../LanguageSwitcher'
import { motion, AnimatePresence } from 'framer-motion'
import CreditsBadge from '../CreditsBadge'
import { useAuth } from '../../hooks/useAuth'
import { ADMIN_ROLES, getDefaultAdminRoute } from '../../types/auth'
import { Link } from 'react-router-dom'

const Navbar = () => {
  const { theme, toggleTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const { isAuthenticated, logout, user } = useAuth()
  const isRtl = i18n.language === 'ar'

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="border-border/40 bg-background/70 sticky top-0 z-[60] overflow-x-clip border-b backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:h-20 sm:px-6">
        {/* قسم اللوجو والهوية البراندية */}
        <Link
          to="/"
          className="group focus-visible:ring-primary flex cursor-pointer items-center gap-3 focus-visible:ring-2"
          aria-label={t('nav.home')}
        >
          <div className="relative flex items-center">
            <div className="bg-primary/20 absolute -inset-1 rounded-full opacity-0 blur transition-opacity group-hover:opacity-100" />
            <img
              src="/AqdyLogo.png"
              alt="Aqdy Logo"
              className="relative ms-[-8px] h-9 w-auto object-contain transition-transform duration-500 group-hover:rotate-3 sm:ms-[-12px] sm:h-14"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-primary text-xl font-black tracking-tighter sm:text-3xl">
              {t('common.brand_name')}
            </span>

            <span className="text-muted-foreground/60 group-hover:text-primary -mt-1 hidden text-[10px] font-bold tracking-widest uppercase transition-colors sm:block">
              {t('common.tagline')}
            </span>
          </div>
        </Link>

        {/* قسم الروابط والأزرار التفاعلية */}
        <div className="flex items-center gap-2 sm:gap-6">
          {/* روابط التنقل الأساسية */}
          <div className="text-muted-foreground hidden items-center gap-8 text-sm font-bold md:flex">
            <Link
              to="/"
              className="hover:text-primary focus-visible:ring-primary transition-colors focus-visible:ring-2"
              aria-label={t('nav.home')}
            >
              {t('nav.home')}
            </Link>

            <a
              href="https://github.com/aqdy-ai/aqdy-platform/blob/main/docs/README.md"
              target="_blank"
              rel="noopener noreferrer"
              id="nav-how-it-works-link"
              className="hover:text-primary focus-visible:ring-primary flex items-center gap-1 transition-colors focus-visible:ring-2"
              aria-label={t('nav.how_it_works')}
            >
              {t('nav.how_it_works')}
              <ExternalLink
                size={12}
                className="opacity-50"
                aria-hidden="true"
              />
            </a>

            <Link
              to="/pricing"
              className="hover:text-primary focus-visible:ring-primary transition-colors focus-visible:ring-2"
              aria-label={t('nav.pricing')}
            >
              {t('nav.pricing')}
            </Link>
          </div>

          {/* الخط الفاصل الجمالي */}
          <div className="bg-border/60 mx-1 hidden h-6 w-[1px] md:block" />

          <div className="flex items-center gap-1 sm:gap-3">
            {isAuthenticated && (
              <span className="hidden sm:block">
                <CreditsBadge variant="compact" />
              </span>
            )}

            <button
              onClick={toggleTheme}
              aria-label={t('common.toggle_theme')}
              className="bg-card/30 border-border/50 hover:bg-muted text-foreground/80 hover:text-primary focus-visible:ring-primary rounded-xl border p-2 transition-all focus-visible:ring-2 active:scale-90 sm:p-3"
            >
              {theme === 'light' ? (
                <Moon size={18} strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <Sun size={18} strokeWidth={2.5} aria-hidden="true" />
              )}
            </button>

            {/* سويتش اللغات ثنائي اللغة (AR/EN) */}
            <LanguageSwitcher />

            {/* قسم المصادقة - تسجيل الدخول أو قائمة المستخدم */}
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  aria-label={t('nav.settings') || 'User settings'}
                  className="bg-card/30 border-border/50 hover:bg-muted text-foreground/80 hover:text-primary focus-visible:ring-primary flex items-center justify-center rounded-xl border p-2 transition-all focus-visible:ring-2 active:scale-90 sm:p-3"
                  id="user-menu-button"
                >
                  <User size={18} strokeWidth={2.5} aria-hidden="true" />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={`border-border/50 bg-card/95 absolute z-[70] mt-2 w-48 max-w-[calc(100vw-1.5rem)] rounded-2xl border shadow-xl backdrop-blur-md focus:outline-none ${
                        isRtl ? 'left-0' : 'right-0'
                      }`}
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                    >
                      <div className="space-y-1 p-2">
                        {user?.name && (
                          <div className="border-border/30 text-muted-foreground mb-1 truncate border-b px-4 py-2 text-xs font-bold">
                            {user.name}
                          </div>
                        )}
                        {(user?.role === 'admin' ||
                          ADMIN_ROLES.includes(
                            user?.role as (typeof ADMIN_ROLES)[number]
                          )) && (
                          <Link
                            to={getDefaultAdminRoute(user?.role ?? '')}
                            onClick={() => setDropdownOpen(false)}
                            className="hover:bg-primary/10 hover:text-primary text-foreground flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                            role="menuitem"
                          >
                            <Shield size={16} />
                            {t('admin.dashboard_title')}
                          </Link>
                        )}
                        <Link
                          to="/contract-history"
                          onClick={() => setDropdownOpen(false)}
                          className="hover:bg-primary/10 hover:text-primary text-foreground flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                          role="menuitem"
                        >
                          <History size={16} />
                          {t('nav.contract_history')}
                        </Link>
                        <Link
                          to="/account-settings"
                          onClick={() => setDropdownOpen(false)}
                          className="hover:bg-primary/10 hover:text-primary text-foreground flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                          role="menuitem"
                        >
                          <Settings size={16} />
                          {t('nav.settings')}
                        </Link>
                        <button
                          onClick={() => {
                            setDropdownOpen(false)
                            logout()
                          }}
                          className="hover:bg-destructive/10 hover:text-destructive text-foreground flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-start text-sm font-semibold transition-colors"
                          role="menuitem"
                        >
                          <LogOut size={16} />
                          {t('nav.logout')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary rounded-xl px-5 py-2.5 text-sm font-bold shadow-md transition-all focus-visible:ring-2 active:scale-95"
                aria-label={t('nav.login')}
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
