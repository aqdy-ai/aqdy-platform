import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import axios from 'axios'
import { authApi } from '../services/authApi'
import type { LoginInput, RegisterInput } from '../types/auth'
import { AuthContext } from './context/AuthContext'

/**
 * Shared Password Regex: Requires 1 uppercase, 1 lowercase, 1 number, and 1 special character.
 */
const PASSWORD_REGEX =
  /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/

/**
 * Validation Schemas - Aligned with backend requirements
 */
export const loginSchema = z.object({
  email: z.string().email('auth.errors.invalidEmail'),
  password: z.string().min(8, 'auth.errors.passwordRequired'),
})

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(3, 'auth.errors.nameTooShort')
      .max(100, 'auth.errors.nameTooLong')
      .refine((val) => /\p{L}/u.test(val), {
        message: 'auth.errors.nameInvalid',
      }),
    email: z.string().email('auth.errors.invalidEmail'),
    password: z
      .string()
      .min(8, 'auth.errors.passwordTooShort')
      .regex(PASSWORD_REGEX, 'auth.errors.passwordWeak'),
    confirmPassword: z.string().min(1, 'auth.errors.confirmPasswordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.errors.passwordsMismatch',
    path: ['confirmPassword'],
  })

/**
 * Custom hook for authentication logic.
 * Encapsulates API calls, loading states, and toast notifications.
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  const { setUser, isAuthenticated, user, isInitialLoading } = context
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const login = async (credentials: LoginInput) => {
    setIsLoading(true)
    try {
      // Validate input before request
      loginSchema.parse(credentials)

      const response = await authApi.login(credentials)
      setUser(response.data.data.user)

      localStorage.setItem('isLoggedIn', 'true')
      toast.success(t('auth.loginSuccess'))
      navigate('/', { replace: true })
    } catch (error: unknown) {
      let errorMessage = t('auth.errors.generic')

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          errorMessage = t('auth.errors.invalidCredentials')
        } else {
          errorMessage = error.response?.data?.message || errorMessage
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: RegisterInput) => {
    setIsLoading(true)
    try {
      // Validate input before request
      registerSchema.parse(userData)

      // Strip confirmPassword before sending to API
      const { confirmPassword: _confirmPassword, ...apiData } = userData
      void _confirmPassword

      const response = await authApi.register(apiData)
      setUser(response.data.data.user)

      toast.success(t('auth.registerSuccess'))
      navigate('/', { replace: true })
    } catch (error: unknown) {
      let errorMessage = t('auth.errors.generic')

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          errorMessage = t('auth.errors.emailInUse')
        } else {
          errorMessage = error.response?.data?.message || errorMessage
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const forgotPassword = () => {
    // Sprint 3 Placeholder
    toast.info(t('auth.forgotPasswordComingSoon'))
  }

  const logout = () => {
    // Add logic to call logout API and clear context
    setUser(null)
    localStorage.removeItem('isLoggedIn')
    navigate('/login')
  }

  return {
    login,
    register,
    forgotPassword,
    logout,
    isLoading,
    isAuthenticated,
    user,
    isInitialLoading,
  }
}
