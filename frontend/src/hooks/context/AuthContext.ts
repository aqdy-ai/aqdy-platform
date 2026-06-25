import { createContext } from 'react'
import type { UserRole } from '../../types/auth'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  isEmailVerified?: boolean
}

export interface AuthContextType {
  user: User | null
  setUser: (user: User | null) => void
  isAuthenticated: boolean
  isInitialLoading: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
