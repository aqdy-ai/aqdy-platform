import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Users,
  CreditCard,
  TrendingUp,
  BarChart2,
  Layers,
  UserPlus,
  DollarSign,
  Loader2,
} from 'lucide-react'
import {
  adminApi,
  AdminStats,
  UserAccount,
  PaymentRecord,
} from '../../services/adminApi'
import { toast } from 'sonner'

const AdminDashboard = () => {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  const [stats, setStats] = useState<AdminStats['data'] | null>(null)
  const [recentUsers, setRecentUsers] = useState<UserAccount[]>([])
  const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [statsRes, usersRes, paymentsRes] = await Promise.all([
          adminApi.getStats(),
          adminApi.getAccounts({ pageSize: 10 }),
          adminApi.getPayments({ pageSize: 10 }),
        ])

        if (statsRes.data.success) {
          setStats(statsRes.data.data)
        }
        if (usersRes.data.success) {
          setRecentUsers(usersRes.data.data)
        }
        if (paymentsRes.data.success) {
          setRecentPayments(paymentsRes.data.data)
        }
      } catch (error) {
        console.error('Failed to fetch admin dashboard data:', error)
        toast.error(t('admin.error_updating'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [t])

  if (loading) {
    return (
      <div className="bg-background flex min-h-[70vh] items-center justify-center">
        <Loader2 className="text-primary h-10 w-10 animate-spin" />
      </div>
    )
  }

  // Format currency map to a nice MRR display
  const renderMRR = () => {
    if (
      !stats ||
      !stats.revenueThisMonth ||
      Object.keys(stats.revenueThisMonth).length === 0
    ) {
      return '$0'
    }
    return Object.entries(stats.revenueThisMonth)
      .map(
        ([curr, amt]) =>
          `${curr === 'USD' ? '$' : curr + ' '}${amt.toLocaleString()}`
      )
      .join(' / ')
  }

  const statCards = [
    {
      title: t('admin.total_users'),
      value: stats?.totalAccounts?.toLocaleString() || '0',
      icon: Users,
      color: 'from-blue-500/20 to-indigo-500/20 text-indigo-500',
    },
    {
      title: t('admin.active_subscriptions'),
      value: stats?.activeSubscriptions?.toLocaleString() || '0',
      icon: Layers,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-500',
    },
    {
      title: t('admin.mrr'),
      value: renderMRR(),
      icon: TrendingUp,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-500',
    },
    {
      title: t('admin.analyses_this_month'),
      value: stats?.analysesThisMonth?.toLocaleString() || '0',
      icon: BarChart2,
      color: 'from-purple-500/20 to-pink-500/20 text-purple-500',
    },
    {
      title: t('admin.credits_consumed_this_month'),
      value: stats?.creditsConsumedThisMonth?.toLocaleString() || '0',
      icon: CreditCard,
      color: 'from-rose-500/20 to-red-500/20 text-rose-500',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-3xl font-black tracking-tight">
            {t('admin.dashboard_title')}
          </h1>
          <p className="text-muted-foreground text-sm font-semibold">
            {t('common.tagline')}
          </p>
        </div>
      </div>

      {/* Grid for stats cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="border-border/40 bg-card/40 hover:border-primary/30 relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                {card.title}
              </span>
              <div
                className={`rounded-xl bg-gradient-to-br p-2.5 ${card.color}`}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-foreground text-2xl font-black tracking-tight">
                {card.value}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lists for Recent Signups and Recent Payments */}
      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Signups */}
        <motion.div
          initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-foreground flex items-center gap-2 text-lg font-black">
              <UserPlus className="text-primary h-5 w-5" />
              {t('admin.recent_signups')}
            </h2>
          </div>

          <div className="divide-border/40 divide-y">
            {recentUsers.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm font-semibold">
                {t('admin.no_data')}
              </p>
            ) : (
              recentUsers.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-bold">
                      {u.name}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {u.email}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-bold capitalize">
                      {t(`admin.plan_${u.planSlug || 'free'}`)}
                    </span>
                    <span className="text-muted-foreground text-[10px] font-semibold">
                      {new Date(u.createdAt).toLocaleDateString(i18n.language, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Payments */}
        <motion.div
          initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="border-border/40 bg-card/30 rounded-3xl border p-6 shadow-sm"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-foreground flex items-center gap-2 text-lg font-black">
              <DollarSign className="text-primary h-5 w-5" />
              {t('admin.recent_payments')}
            </h2>
          </div>

          <div className="divide-border/40 divide-y">
            {recentPayments.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm font-semibold">
                {t('admin.no_data')}
              </p>
            ) : (
              recentPayments.map((p) => {
                const pUser =
                  typeof p.userId === 'object' && p.userId ? p.userId : null
                const statusColor =
                  p.status === 'succeeded'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : p.status === 'failed'
                      ? 'bg-rose-500/10 text-rose-500'
                      : 'bg-amber-500/10 text-amber-500'

                return (
                  <div
                    key={p._id}
                    className="flex items-center justify-between py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-bold">
                        {pUser ? pUser.name : 'Unknown User'}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {pUser ? pUser.email : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-foreground text-sm font-black">
                        {p.amount.toLocaleString()} {p.currency}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusColor}`}
                      >
                        {t(`admin.payment_${p.status}`)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default AdminDashboard
