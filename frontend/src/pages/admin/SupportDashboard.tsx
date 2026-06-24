import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  HeadphonesIcon,
  Search,
  Mail,
  KeyRound,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { adminApi, type PaymentRecord } from '../../services/adminApi'
import { toast } from 'sonner'

interface UserResult {
  _id: string
  name: string
  email: string
  planSlug: string
  creditBalance: number
  status: string
  isEmailVerified: boolean
  createdAt: string
}
interface Contract {
  _id: string
  filename: string
  uploadedAt: string
  language: string
  status: string
}

export default function SupportDashboard() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState<Contract[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [creditAmount, setCreditAmount] = useState(0)
  const [creditReason, setCreditReason] = useState('')
  const [loading, setLoading] = useState(false)

  const search = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await adminApi.searchUsers(query.trim())
      setUsers((res.data as { data: UserResult[] }).data)
      setSelectedUser(null)
    } catch {
      toast.error(t('common.error'))
    }
    setLoading(false)
  }, [query, t])

  const selectUser = async (u: UserResult) => {
    setSelectedUser(u)
    try {
      const res = await adminApi.getSupportUser(u._id)
      const d = res.data as {
        data: {
          analysisHistory: Contract[]
          payments: PaymentRecord[]
        }
      }
      setAnalysisHistory(d.data.analysisHistory)
      setPayments(d.data.payments ?? [])
    } catch {
      setAnalysisHistory([])
      setPayments([])
    }
  }

  const verifyEmail = async () => {
    if (!selectedUser) return
    try {
      await adminApi.verifyUserEmail(selectedUser._id)
      toast.success(t('common.success'))
      setSelectedUser({ ...selectedUser, isEmailVerified: true })
    } catch {
      toast.error(t('common.error'))
    }
  }

  const resetPassword = async () => {
    if (!selectedUser) return
    try {
      await adminApi.triggerPasswordReset(selectedUser._id)
      toast.success(t('common.success'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const adjustCredits = async () => {
    if (!selectedUser || creditAmount === 0 || creditReason.trim().length < 3) {
      return toast.error(t('admin.reason'))
    }
    try {
      const res = await adminApi.supportCreditAdjustment(
        selectedUser._id,
        creditAmount,
        creditReason.trim()
      )
      const newBal = (res.data as { data: { newBalance: number } }).data
        .newBalance
      toast.success(t('common.success'))
      setSelectedUser({ ...selectedUser, creditBalance: newBal })
      setCreditAmount(0)
      setCreditReason('')
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HeadphonesIcon className="text-primary" size={28} />
        <h1 className="text-2xl font-bold">{t('admin.support_dashboard')}</h1>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder={t('admin.search_users')}
            className="bg-background border-border w-full rounded-xl border py-2.5 ps-10 pe-4 text-sm"
          />
        </div>
        <button
          onClick={search}
          className="bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-bold hover:opacity-90"
        >
          {loading ? '...' : t('admin.search')}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User List */}
        <div className="border-border/40 rounded-2xl border lg:col-span-1">
          <div className="border-border/30 border-b px-4 py-3">
            <h2 className="text-muted-foreground text-sm font-bold uppercase">
              {t('admin.results_count', { count: users.length })}
            </h2>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {users.map((u) => (
              <button
                key={u._id}
                onClick={() => selectUser(u)}
                className={`border-border/20 hover:bg-muted/50 w-full border-b px-4 py-3 text-start transition-colors ${selectedUser?._id === u._id ? 'bg-primary/10' : ''}`}
              >
                <div className="text-sm font-semibold">{u.name}</div>
                <div className="text-muted-foreground text-xs">{u.email}</div>
                <div className="mt-1 flex gap-2">
                  <span className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
                    {t(`admin.plan_${u.planSlug.toLowerCase()}`, {
                      defaultValue: u.planSlug,
                    })}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${u.isEmailVerified ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}
                  >
                    {u.isEmailVerified
                      ? t('admin.verified')
                      : t('admin.unverified')}
                  </span>
                </div>
              </button>
            ))}
            {users.length === 0 && (
              <div className="text-muted-foreground px-4 py-8 text-center text-sm">
                {t('admin.no_data')}
              </div>
            )}
          </div>
        </div>

        {/* User Detail */}
        <div className="space-y-4 lg:col-span-2">
          {selectedUser ? (
            <>
              <div className="border-border/40 rounded-2xl border p-5">
                <h2 className="text-lg font-bold">{selectedUser.name}</h2>
                <p className="text-muted-foreground text-sm">
                  {selectedUser.email}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="bg-muted/50 rounded-xl px-3 py-2">
                    <div className="text-muted-foreground text-[10px] font-bold uppercase">
                      {t('admin.plan')}
                    </div>
                    <div className="font-bold">
                      {t(`admin.plan_${selectedUser.planSlug.toLowerCase()}`, {
                        defaultValue: selectedUser.planSlug,
                      })}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-xl px-3 py-2">
                    <div className="text-muted-foreground text-[10px] font-bold uppercase">
                      {t('admin.credits')}
                    </div>
                    <div className="font-mono font-bold">
                      {selectedUser.creditBalance}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-xl px-3 py-2">
                    <div className="text-muted-foreground text-[10px] font-bold uppercase">
                      {t('admin.status')}
                    </div>
                    <div className="font-bold">
                      {t(`admin.status_${selectedUser.status.toLowerCase()}`, {
                        defaultValue: selectedUser.status,
                      })}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-xl px-3 py-2">
                    <div className="text-muted-foreground text-[10px] font-bold uppercase">
                      {t('admin.email')}
                    </div>
                    <div className="font-bold">
                      {selectedUser.isEmailVerified
                        ? `✅ ${t('admin.verified')}`
                        : `❌ ${t('admin.unverified')}`}
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {!selectedUser.isEmailVerified && (
                    <button
                      onClick={verifyEmail}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                    >
                      <Mail size={14} />
                      {t('admin.verify_email')}
                    </button>
                  )}
                  <button
                    onClick={resetPassword}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                  >
                    <KeyRound size={14} />
                    {t('admin.reset_password')}
                  </button>
                </div>
              </div>

              {/* Credit Adjustment */}
              <div className="border-border/40 rounded-2xl border p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <CreditCard size={16} />
                  {t('admin.credit_adjustment')}
                </h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                    placeholder={t('admin.amount')}
                    className="bg-background border-border w-28 rounded-xl border px-3 py-2 text-sm"
                  />
                  <input
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder={t('admin.reason')}
                    className="bg-background border-border flex-1 rounded-xl border px-3 py-2 text-sm"
                  />
                  <button
                    onClick={adjustCredits}
                    className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-bold hover:opacity-90"
                  >
                    {t('admin.apply')}
                  </button>
                </div>
              </div>

              {/* Payment History */}
              <div className="border-border/40 overflow-hidden rounded-2xl border">
                <div className="border-border/30 border-b px-4 py-3">
                  <h3 className="text-sm font-bold">
                    {t('billing.payment_history', {
                      defaultValue: 'Payment History',
                    })}
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                      <th className="px-4 py-2 text-start">
                        {t('admin.date')}
                      </th>
                      <th className="px-4 py-2 text-end">
                        {t('admin.amount')}
                      </th>
                      <th className="px-4 py-2 text-center">
                        {t('admin.currency')}
                      </th>
                      <th className="px-4 py-2 text-end">
                        {t('admin.status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id} className="border-border/20 border-b">
                        <td className="text-muted-foreground px-4 py-2 text-xs">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 text-end font-mono font-bold">
                          {p.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center text-xs font-semibold">
                          {p.currency}
                        </td>
                        <td className="px-4 py-2 text-end">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold">
                            {p.status === 'succeeded' ? (
                              <>
                                <CheckCircle2
                                  size={12}
                                  className="text-emerald-500"
                                />{' '}
                                Paid
                              </>
                            ) : p.status === 'failed' ? (
                              <>
                                <XCircle size={12} className="text-rose-500" />{' '}
                                Failed
                              </>
                            ) : (
                              <>
                                <Clock size={12} className="text-amber-500" />{' '}
                                Pending
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-muted-foreground px-4 py-6 text-center"
                        >
                          {t('admin.no_data')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Analysis History (Read-Only) */}
              <div className="border-border/40 overflow-hidden rounded-2xl border">
                <div className="border-border/30 border-b px-4 py-3">
                  <h3 className="text-sm font-bold">
                    {t('admin.analysis_history_readonly')}
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                      <th className="px-4 py-2 text-start">
                        {t('admin.file')}
                      </th>
                      <th className="px-4 py-2 text-start">
                        {t('admin.lang')}
                      </th>
                      <th className="px-4 py-2 text-start">
                        {t('admin.status')}
                      </th>
                      <th className="px-4 py-2 text-end">{t('admin.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisHistory.map((c) => (
                      <tr key={c._id} className="border-border/20 border-b">
                        <td className="px-4 py-2 font-medium">{c.filename}</td>
                        <td className="px-4 py-2">{c.language}</td>
                        <td className="px-4 py-2">{c.status}</td>
                        <td className="text-muted-foreground px-4 py-2 text-end text-xs">
                          {new Date(c.uploadedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {analysisHistory.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-muted-foreground px-4 py-6 text-center"
                        >
                          {t('admin.no_data')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground border-border/40 flex items-center justify-center rounded-2xl border border-dashed py-20 text-sm">
              {t('admin.select_user_to_view')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
