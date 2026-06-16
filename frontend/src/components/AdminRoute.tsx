import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface AdminRouteProps {
  children: ReactNode
}

const AdminRoute = ({ children }: AdminRouteProps) => {
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

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default AdminRoute
