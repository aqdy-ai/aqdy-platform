import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ADMIN_ROLES } from '../types/auth'
import type { AdminRole } from '../types/auth'

interface AdminRouteProps {
  children: ReactNode
  /** Optional: restrict to specific admin roles. If omitted, any admin role is allowed. */
  allowedRoles?: AdminRole[]
}

const AdminRoute = ({ children, allowedRoles }: AdminRouteProps) => {
  const { isAuthenticated, user, isInitialLoading } = useAuth()

  if (isInitialLoading) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <div className="text-primary animate-pulse text-xl font-bold">
          جاري التحميل...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const role = user?.role
  // Accept legacy 'admin' or any new admin role
  const isAdmin = role === 'admin' || ADMIN_ROLES.includes(role as AdminRole)

  if (!isAdmin) {
    return <Navigate to="/login" replace />
  }

  // If specific roles are required, check them
  if (allowedRoles && allowedRoles.length > 0) {
    const effectiveRole = role === 'admin' ? 'super_admin' : role
    if (!allowedRoles.includes(effectiveRole as AdminRole)) {
      return <Navigate to="/admin" replace />
    }
  }

  return <>{children}</>
}

export default AdminRoute
