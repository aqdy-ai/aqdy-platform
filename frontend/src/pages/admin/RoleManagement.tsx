import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  UserPlus,
  UserMinus,
  AlertTriangle,
  History,
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { ROLE_LABELS } from '../../hooks/usePermissions'
import { ADMIN_ROLES } from '../../types/auth'
import { toast } from 'sonner'

interface AdminUser {
  _id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
}
interface AuditEntry {
  _id: string
  action: string
  outcome: string
  timestamp: string
  userEmail?: string
  metadata?: { targetEmail?: string; newRole?: string; previousRole?: string }
}

export default function RoleManagement() {
  const { t } = useTranslation()
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [superAdminCount, setSuperAdminCount] = useState(0)
  const [maxSuperAdmins, setMaxSuperAdmins] = useState(2)
  const [loading, setLoading] = useState(true)
  const [assignEmail, setAssignEmail] = useState('')
  const [assignRole, setAssignRoleVal] = useState<string>('support_admin')
  const [tab, setTab] = useState<'users' | 'audit'>('users')

  const fetchData = useCallback(async () => {
    try {
      const [rolesRes, auditRes] = await Promise.all([
        adminApi.getRoleUsers(),
        adminApi.getRoleAuditLog({ pageSize: 50 }),
      ])
      const rd = rolesRes.data as {
        data: {
          adminUsers: AdminUser[]
          superAdminCount: number
          maxSuperAdmins: number
        }
      }
      setAdminUsers(rd.data.adminUsers)
      setSuperAdminCount(rd.data.superAdminCount)
      setMaxSuperAdmins(rd.data.maxSuperAdmins)
      const ad = auditRes.data as { data: AuditEntry[] }
      setAuditLog(ad.data)
    } catch {
      toast.error(t('common.error'))
    }
  }, [t])

  useEffect(() => {
    const load = async () => {
      await fetchData()
      setLoading(false)
    }
    load()
  }, [fetchData])

  const handleAssign = async () => {
    if (!assignEmail.trim()) return toast.error(t('admin.user_email'))
    setLoading(true)
    try {
      // Search for user by email first
      const searchRes = await adminApi.searchUsers(assignEmail.trim())
      const sd = searchRes.data as { data: { _id: string; email: string }[] }
      const user = sd.data?.[0]
      if (!user) {
        toast.error(t('common.error'))
        setLoading(false)
        return
      }
      await adminApi.assignRole(user._id, assignRole)
      const roleLabel = t(`admin.role_${assignRole}`, { defaultValue: ROLE_LABELS[assignRole] || assignRole })
      toast.success(`${roleLabel} assigned to ${user.email}`)
      setAssignEmail('')
      await fetchData()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || t('common.error')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (userId: string, email: string) => {
    if (!confirm(`Revoke admin role from ${email}?`)) return
    setLoading(true)
    try {
      await adminApi.revokeRole(userId)
      toast.success(`Admin role revoked from ${email}`)
      await fetchData()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || t('common.error')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="text-primary" size={28} />
        <h1 className="text-2xl font-bold">{t('admin.role_management')}</h1>
      </div>

      {superAdminCount >= maxSuperAdmins && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-300">
          <AlertTriangle size={18} />
          <span className="text-sm font-semibold">
            {t('admin.max_super_admin_warning', { count: superAdminCount, max: maxSuperAdmins })}
          </span>
        </div>
      )}

      {/* Assign Role */}
      <div className="border-border/40 rounded-2xl border p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <UserPlus size={20} /> {t('admin.assign_role')}
        </h2>
        <div className="flex flex-wrap gap-3">
          <input
            value={assignEmail}
            onChange={(e) => setAssignEmail(e.target.value)}
            placeholder={t('admin.user_email')}
            className="bg-background border-border flex-1 rounded-xl border px-4 py-2.5 text-sm"
          />
          <select
            value={assignRole}
            onChange={(e) => setAssignRoleVal(e.target.value)}
            className="bg-background border-border rounded-xl border px-4 py-2.5 text-sm"
          >
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`admin.role_${r}`, { defaultValue: ROLE_LABELS[r] || r })}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            className="bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-bold transition-colors hover:opacity-90"
          >
            {t('admin.assign')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('users')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${tab === 'users' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          {t('admin.admin_users_count', { count: adminUsers.length })}
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${tab === 'audit' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          <History size={14} /> {t('admin.audit_log')}
        </button>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">
          {t('common.loading')}
        </div>
      ) : tab === 'users' ? (
        <div className="border-border/40 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                <th className="px-4 py-3 text-start">{t('admin.user')}</th>
                <th className="px-4 py-3 text-start">{t('admin.role')}</th>
                <th className="px-4 py-3 text-start">{t('admin.status')}</th>
                <th className="px-4 py-3 text-end">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((u) => (
                <tr
                  key={u._id}
                  className="border-border/30 hover:bg-muted/30 border-b transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {u.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-primary/15 text-primary rounded-lg px-2 py-1 text-xs font-bold">
                      {t(`admin.role_${u.role}`, { defaultValue: ROLE_LABELS[u.role] || u.role })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-bold ${u.status === 'active' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-500'}`}
                    >
                      {t(`admin.status_${u.status}`, { defaultValue: u.status })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button
                      onClick={() => handleRevoke(u._id, u.email)}
                      className="text-destructive hover:bg-destructive/10 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                    >
                      <UserMinus size={14} className="mr-1 inline" /> {t('admin.revoke')}
                    </button>
                  </td>
                </tr>
              ))}
              {adminUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-muted-foreground px-4 py-8 text-center"
                  >
                    {t('admin.no_admin_users')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border-border/40 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                <th className="px-4 py-3 text-start">{t('admin.action')}</th>
                <th className="px-4 py-3 text-start">{t('admin.by')}</th>
                <th className="px-4 py-3 text-start">{t('admin.target')}</th>
                <th className="px-4 py-3 text-start">{t('admin.details')}</th>
                <th className="px-4 py-3 text-end">{t('admin.time')}</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((e) => (
                <tr
                  key={e._id}
                  className="border-border/30 hover:bg-muted/30 border-b transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="bg-muted rounded-lg px-2 py-1 font-mono text-xs">
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{e.userEmail || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {e.metadata?.targetEmail || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {e.metadata?.newRole
                      ? `${t(`admin.role_${e.metadata.previousRole}`, { defaultValue: e.metadata.previousRole })} → ${t(`admin.role_${e.metadata.newRole}`, { defaultValue: e.metadata.newRole })}`
                      : '—'}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-end text-xs">
                    {new Date(e.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
              {auditLog.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-muted-foreground px-4 py-8 text-center"
                  >
                    {t('admin.no_audit_entries')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
