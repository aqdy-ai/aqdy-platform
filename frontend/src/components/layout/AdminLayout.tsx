import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shield, Users, FileText, CreditCard } from 'lucide-react'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  void i18n // avoids eslint warnings if i18n is unused but kept for parity/rtl helpers

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

  return (
    <div
      className="flex min-h-[calc(100vh-10rem)] flex-col gap-6 py-6 md:flex-row"
      data-testid="admin-layout"
    >
      {/* Sidebar Navigation */}
      <aside className="w-full shrink-0 md:w-64">
        <div className="bg-card/40 border-border/40 sticky top-24 rounded-3xl border p-4 shadow-sm backdrop-blur-md">
          <div className="border-border/30 mb-4 border-b px-4 py-3">
            <h2 className="text-foreground text-sm font-black tracking-wide uppercase">
              {t('admin.dashboard_title')}
            </h2>
          </div>
          <nav
            className="flex flex-col gap-1.5"
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
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1">
        <div className="bg-card/30 border-border/40 min-h-[60vh] rounded-3xl border p-6 shadow-sm backdrop-blur-md">
          {children}
        </div>
      </main>
    </div>
  )
}
