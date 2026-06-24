/**
 * usePermissions hook — mirrors the backend permission matrix for UI gating.
 * Returns helpers to check if the current user can access specific sections/actions.
 */
import { useMemo } from 'react'
import { useAuth } from './useAuth'
import type { AdminRole } from '../types/auth'
import { ADMIN_ROLES } from '../types/auth'

// ── Sections & Actions ─────────────────────────────
export type Section =
  | 'dashboard'
  | 'accounts'
  | 'billing'
  | 'contracts'
  | 'knowledge_base'
  | 'prompts'
  | 'ai_pipeline'
  | 'system_health'
  | 'evaluations'
  | 'role_management'
  | 'audit_log'
  | 'report_export'

export type Action = 'read' | 'write'

// ── Permission Matrix (mirrors backend/src/config/roles.ts) ─
const PERMISSION_MATRIX: Record<
  AdminRole,
  Partial<Record<Section, Action[]>>
> = {
  super_admin: {
    dashboard: ['read', 'write'],
    accounts: ['read', 'write'],
    billing: ['read', 'write'],
    contracts: ['read', 'write'],
    knowledge_base: ['read', 'write'],
    prompts: ['read', 'write'],
    ai_pipeline: ['read', 'write'],
    system_health: ['read', 'write'],
    evaluations: ['read', 'write'],
    role_management: ['read', 'write'],
    audit_log: ['read', 'write'],
    report_export: ['read', 'write'],
  },
  financial_admin: {
    dashboard: ['read'],
    billing: ['read', 'write'],
  },
  support_admin: {
    accounts: ['read', 'write'],
    contracts: ['read'],
  },
  content_admin: {
    knowledge_base: ['read', 'write'],
    prompts: ['read', 'write'],
    evaluations: ['read'],
  },
  operations_admin: {
    ai_pipeline: ['read', 'write'],
    system_health: ['read', 'write'],
    evaluations: ['read'],
  },
  analytics_admin: {
    dashboard: ['read'],
    accounts: ['read'],
    billing: ['read'],
    contracts: ['read'],
    knowledge_base: ['read'],
    prompts: ['read'],
    ai_pipeline: ['read'],
    system_health: ['read'],
    evaluations: ['read'],
    audit_log: ['read'],
    report_export: ['read', 'write'],
  },
}

export const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  admin: 'Admin',
  super_admin: 'Super Admin',
  financial_admin: 'Financial Admin',
  support_admin: 'Support Admin',
  content_admin: 'Content Admin',
  operations_admin: 'Operations Admin',
  analytics_admin: 'Analytics Admin',
}

function isAdminRole(role: string): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole)
}

export function usePermissions() {
  const { user } = useAuth()
  const role = user?.role ?? 'user'

  const helpers = useMemo(() => {
    const isAdmin = isAdminRole(role) || role === 'admin'

    const hasPermission = (section: Section, action: Action = 'read') => {
      if (!isAdmin) return false
      // Legacy "admin" treated as super_admin
      const effectiveRole = role === 'admin' ? 'super_admin' : role
      if (!isAdminRole(effectiveRole)) return false
      const perms = PERMISSION_MATRIX[effectiveRole]?.[section]
      return perms ? perms.includes(action) : false
    }

    const canWrite = (section: Section) => hasPermission(section, 'write')

    const allowedSections: Section[] = isAdmin
      ? (Object.keys(
          PERMISSION_MATRIX[
            (role === 'admin' ? 'super_admin' : role) as AdminRole
          ] ?? {}
        ) as Section[])
      : []

    return {
      role,
      isAdmin,
      hasPermission,
      canWrite,
      allowedSections,
      roleLabel: ROLE_LABELS[role] ?? role,
    }
  }, [role])

  return helpers
}
