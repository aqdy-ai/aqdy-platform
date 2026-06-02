import { useState, useEffect, ReactNode } from 'react'
import { authApi } from '../services/authApi'
import { AuthContext, User } from './context/AuthContext'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      if (!localStorage.getItem('isLoggedIn')) {
        setIsInitialLoading(false)
        return
      }

      try {
        const response = await authApi.getMe()

        if (response.data.success) {
          setUser(response.data.data.user)
        }
      } catch {
        setUser(null)
        localStorage.removeItem('isLoggedIn')
      } finally {
        setIsInitialLoading(false)
      }
    }

    checkAuth()
  }, [])

  const value = {
    user,
    setUser,
    isAuthenticated: !!user,
    isInitialLoading,
  }

  return (
    <AuthContext.Provider value={value}>
      {!isInitialLoading ? (
        children
      ) : (
        <div className="bg-background flex h-screen items-center justify-center">
          <div className="text-primary animate-pulse text-xl font-bold">
            Aqdy...
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}
