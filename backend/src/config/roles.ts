/**
 * Role-Based Access Control (RBAC) Configuration
 *
 * Defines all admin roles, platform sections, action types,
 * and the permission matrix governing who can do what.
 */

// ── Role Definitions ─────────────────────────────────
export const ADMIN_ROLES = [
  "super_admin",
  "financial_admin",
  "support_admin",
  "content_admin",
  "operations_admin",
  "analytics_admin",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ALL_ROLES = ["user", ...ADMIN_ROLES] as const;
export type UserRole = (typeof ALL_ROLES)[number];

/** Maximum number of active Super Admin accounts allowed at any time */
export const MAX_SUPER_ADMINS = 2;

// ── Platform Sections ────────────────────────────────
export const SECTIONS = [
  "dashboard",
  "accounts",
  "billing",
  "contracts",
  "knowledge_base",
  "prompts",
  "ai_pipeline",
  "system_health",
  "evaluations",
  "role_management",
  "audit_log",
  "report_export",
] as const;

export type Section = (typeof SECTIONS)[number];

// ── Action Types ─────────────────────────────────────
export const ACTIONS = ["read", "write"] as const;
export type Action = (typeof ACTIONS)[number];

// ── Permission Matrix ────────────────────────────────
// Maps each admin role to the sections it can access and the allowed actions.
// "user" role has no admin permissions at all.

type PermissionMap = Record<AdminRole, Partial<Record<Section, Action[]>>>;

export const PERMISSION_MATRIX: PermissionMap = {
  super_admin: {
    dashboard: ["read", "write"],
    accounts: ["read", "write"],
    billing: ["read", "write"],
    contracts: ["read", "write"],
    knowledge_base: ["read", "write"],
    prompts: ["read", "write"],
    ai_pipeline: ["read", "write"],
    system_health: ["read", "write"],
    evaluations: ["read", "write"],
    role_management: ["read", "write"],
    audit_log: ["read", "write"],
    report_export: ["read", "write"],
  },

  financial_admin: {
    dashboard: ["read"],
    billing: ["read", "write"],
    report_export: ["read", "write"],
  },

  support_admin: {
    accounts: ["read", "write"],
    contracts: ["read"],
  },

  content_admin: {
    knowledge_base: ["read", "write"],
    prompts: ["read", "write"],
    evaluations: ["read"],
  },

  operations_admin: {
    ai_pipeline: ["read", "write"],
    system_health: ["read", "write"],
    evaluations: ["read"],
  },

  analytics_admin: {
    dashboard: ["read"],
    accounts: ["read"],
    billing: ["read"],
    contracts: ["read"],
    knowledge_base: ["read"],
    prompts: ["read"],
    ai_pipeline: ["read"],
    system_health: ["read"],
    evaluations: ["read"],
    audit_log: ["read"],
    report_export: ["read", "write"],
  },
};

// ── Helper Functions ─────────────────────────────────

/** Check whether a given string is any admin role */
export function isAdminRole(role: string): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}

/** Check whether a role has permission to perform an action on a section */
export function hasPermission(
  role: string,
  section: Section,
  action: Action = "read",
): boolean {
  if (!isAdminRole(role)) return false;
  const sectionPermissions = PERMISSION_MATRIX[role]?.[section];
  if (!sectionPermissions) return false;
  return sectionPermissions.includes(action);
}

/** Return all sections a role is allowed to access (for sidebar filtering) */
export function getAllowedSections(role: string): Section[] {
  if (!isAdminRole(role)) return [];
  const perms = PERMISSION_MATRIX[role as AdminRole];
  return Object.keys(perms) as Section[];
}

/** Return whether a role can perform write operations on a section */
export function canWrite(role: string, section: Section): boolean {
  return hasPermission(role, section, "write");
}

/** Role hierarchy labels for UI display */
export const ROLE_LABELS: Record<UserRole, string> = {
  user: "User",
  super_admin: "Super Admin",
  financial_admin: "Financial Admin",
  support_admin: "Support Admin",
  content_admin: "Content Admin",
  operations_admin: "Operations Admin",
  analytics_admin: "Analytics Admin",
};
