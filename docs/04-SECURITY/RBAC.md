## 👑 Role-Based Access Control (RBAC) Hierarchy

### Role Definitions

The platform implements a 6-role admin system with granular permission scopes. The `user` role is the default for all registered accounts. Admin roles are assigned exclusively by the **Super Admin**.

| Role | Scope | Max Active Holders |
|:-----|:------|:------------------:|
| **Super Admin** | Unrestricted access to every section and action across the entire admin dashboard. Can assign and revoke all other admin roles. | **2** |
| **Financial Admin** | Billing, subscriptions, refunds, credit adjustments, Stripe webhook logs, and financial report exports. No access to user data, KB, AI pipeline, or infrastructure. | Unlimited |
| **Support Admin** | User account management: search, view profiles, verify emails, trigger password resets, and adjust credits. Read-only access to analysis history. No access to billing, KB, or infrastructure. | Unlimited |
| **Content Admin** | Knowledge base clause management (CRUD), prompt library management, and read-only Langfuse evaluation metrics. No access to user accounts, billing, or infrastructure. | Unlimited |
| **Operations Admin** | System health monitoring, AI pipeline metrics, infrastructure status, Langfuse trace browsing, and alert feed. No access to user accounts, billing, or knowledge base. | Unlimited |
| **Analytics Admin** | Strictly read-only access to all dashboard sections (business, financial, AI, user activity, system status). Can export reports as CSV. Cannot perform any create, update, or delete action. | Unlimited |

### Permission Matrix

| Section | Super Admin | Financial | Support | Content | Operations | Analytics |
|:--------|:-----------:|:---------:|:-------:|:-------:|:----------:|:---------:|
| Dashboard (overview) | RW | R | — | — | — | R |
| User Accounts | RW | — | RW | — | — | R |
| Billing / Payments | RW | RW | — | — | — | R |
| Contracts | RW | — | R | — | — | R |
| Knowledge Base | RW | — | — | RW | — | R |
| Prompts | RW | — | — | RW | — | R |
| AI Pipeline / Monitoring | RW | — | — | — | RW | R |
| System Health | RW | — | — | — | RW | R |
| Evaluations / Langfuse | RW | — | — | R | R | R |
| Role Management | RW | — | — | — | — | — |
| Audit Log | RW | — | — | — | — | R |
| Report Export | RW | RW | — | — | — | RW |

*R = Read, W = Write, RW = Read + Write, — = No Access*

### Permission Enforcement

Permissions are enforced at **three layers**:

1. **Backend Middleware** (`backend/src/middlewares/auth.middleware.ts`):
   - `requireRole(...roles)` — restricts endpoints to specific admin roles
   - `requirePermission(section, action)` — checks the role-section-action matrix defined in `backend/src/config/roles.ts`
   - All admin API routes use one of these middlewares

2. **Frontend Route Guards** (`frontend/src/components/AdminRoute.tsx`):
   - Routes accept an `allowedRoles` prop restricting which admin roles can access the page
   - Unauthorized admin roles are redirected to `/admin`

3. **Frontend UI Gating** (`frontend/src/hooks/usePermissions.ts`):
   - `hasPermission(section, action)` — used by components to conditionally render sections
   - `canWrite(section)` — hides action buttons for read-only roles
   - Admin sidebar filters menu items based on role permissions

### Security Constraints

- **Maximum 2 Super Admin accounts** can be active simultaneously. This limit is enforced at the API level in `POST /api/admin/roles/assign`. If the limit is reached, a warning is surfaced and the assignment is rejected until an existing Super Admin is revoked.
- **Self-revocation prevention**: Super Admins cannot revoke their own role to prevent accidental lockout.
- **Audit logging**: All role assignments, revocations, and sensitive admin actions (email verification, password reset triggers, credit adjustments, refunds, KB changes, prompt updates) are recorded in the audit log with the acting admin's identity, the target user, previous and new values, and timestamp.
- **Direct URL protection**: Analytics Admin users who navigate directly to write-action URLs receive a 403 response from the backend, regardless of frontend UI state.

### Code References

| File | Purpose |
|:-----|:--------|
| `backend/src/config/roles.ts` | Role definitions, permission matrix, helper functions |
| `backend/src/middlewares/auth.middleware.ts` | `requireRole()`, `requirePermission()` middleware |
| `backend/src/routes/admin.roles.route.ts` | Role management API (assign, revoke, audit log) |
| `backend/src/models/auditLog.model.ts` | Audit action types for role changes |
| `backend/src/services/auditLog.service.ts` | `logRole`, `logSupport`, `logContent` audit loggers |
| `frontend/src/hooks/usePermissions.ts` | Frontend permission checking hook |
| `frontend/src/components/AdminRoute.tsx` | Route-level role guard |
| `frontend/src/components/layout/AdminLayout.tsx` | Role-filtered sidebar navigation |
