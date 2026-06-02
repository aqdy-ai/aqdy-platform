import { createContext } from 'react'

export interface User {
  id: string
  name: string
  email: string
  role: string
}

export interface AuthContextType {
  user: User | null
  setUser: (user: User | null) => void
  isAuthenticated: boolean
  isInitialLoading: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
