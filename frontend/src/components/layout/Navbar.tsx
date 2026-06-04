/* src/components/layout/Navbar.tsx */
import { Sun, Moon, ExternalLink } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../LanguageSwitcher'
import { motion } from 'framer-motion'
import SubscriptionBadge from '../SubscriptionBadge'

const Navbar = () => {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <nav className="border-border/40 bg-background/70 sticky top-0 z-[60] border-b backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        {/* قسم اللوجو والهوية البراندية */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="group focus-visible:ring-primary flex cursor-pointer items-center gap-3 focus-visible:ring-2"
          role="link"
          tabIndex={0}
          aria-label={t('nav.home')}
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
            <span className="text-primary text-3xl font-black tracking-tighter">
              {t('common.brand_name')}
            </span>

            <span className="text-muted-foreground/60 group-hover:text-primary -mt-1 text-[10px] font-bold tracking-widest uppercase transition-colors">
              {t('common.tagline')}
            </span>
          </div>
        </motion.div>

        {/* قسم الروابط والأزرار التفاعلية */}
        <div className="flex items-center gap-6">
          {/* روابط التنقل الأساسية */}
          <div className="text-muted-foreground hidden items-center gap-8 text-sm font-bold md:flex">
            <a
              href="/"
              className="hover:text-primary focus-visible:ring-primary transition-colors focus-visible:ring-2"
              aria-label={t('nav.home')}
            >
              {t('nav.home')}
            </a>

            <a
              href="/how-it-works"
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

            <a
              href="/pricing"
              className="hover:text-primary focus-visible:ring-primary transition-colors focus-visible:ring-2"
              aria-label={t('nav.pricing')}
            >
              {t('nav.pricing')}
            </a>
          </div>

          {/* الخط الفاصل الجمالي */}
          <div className="bg-border/60 mx-2 hidden h-6 w-[1px] md:block" />

          <div className="flex items-center gap-3">
            <SubscriptionBadge variant="compact" />

            <button
              onClick={toggleTheme}
              aria-label={t('common.toggle_theme')}
              className="bg-card/30 border-border/50 hover:bg-muted text-foreground/80 hover:text-primary focus-visible:ring-primary rounded-xl border p-3 transition-all focus-visible:ring-2 active:scale-90"
            >
              {theme === 'light' ? (
                <Moon size={18} strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <Sun size={18} strokeWidth={2.5} aria-hidden="true" />
              )}
            </button>

            {/* سويتش اللغات ثنائي اللغة (AR/EN) */}
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
