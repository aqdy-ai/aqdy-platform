import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import axios from 'axios'
import { authApi } from '../services/authApi'
import type {
  LoginInput,
  PasswordValidationResult,
  RegisterInput,
  User,
} from '../types/auth'
import { AuthContext } from './context/AuthContext'

/**
 * Backend-aligned password regex: must include uppercase, lowercase, number, and special char (@$!%*?&#_-)
 * and only allows A-Za-z\d@$!%*?&#_- characters.
 */
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#_-])[A-Za-z\d@$!%*?&#_-]+$/

/**
 * Password validation constants and rules
 */
export const PASSWORD_RULES = {
  minLength: 8,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[@$!%*?&#_-]/,
}

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
      .min(PASSWORD_RULES.minLength, 'auth.errors.passwordTooShort')
      .regex(PASSWORD_RULES.uppercase, 'auth.errors.passwordNoUppercase')
      .regex(PASSWORD_RULES.lowercase, 'auth.errors.passwordNoLowercase')
      .regex(PASSWORD_RULES.number, 'auth.errors.passwordNoNumber')
      .regex(PASSWORD_RULES.special, 'auth.errors.passwordNoSpecial')
      .regex(PASSWORD_REGEX, 'auth.errors.passwordInvalidCharacters'),
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

  const { setUser, isAuthenticated, user, isInitialLoading } = context as {
    setUser: (user: User | null) => void
    isAuthenticated: boolean
    user: User | null // Explicitly type user here
    isInitialLoading: boolean
  }
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const login = async (credentials: LoginInput) => {
    setIsLoading(true)
    try {
      // Validate input before request
      loginSchema.parse(credentials)

      const response = await authApi.login(credentials)
      const loggedInUser = response.data.data.user
      setUser(loggedInUser)

      localStorage.setItem('isLoggedIn', 'true')
      toast.success(t('auth.loginSuccess'))
      if (loggedInUser?.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
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

  const loginWithGoogle = async (idToken: string) => {
    setIsLoading(true)
    try {
      const response = await authApi.loginWithGoogle(idToken)
      const loggedInUser = response.data.data.user
      setUser(loggedInUser)

      localStorage.setItem('isLoggedIn', 'true')
      toast.success(t('auth.loginSuccess'))
      if (loggedInUser?.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (error: unknown) {
      let errorMessage = t('auth.errors.generic')
      if (axios.isAxiosError(error)) {
        errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          errorMessage
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
      const registeredUser = response.data.data.user
      setUser(registeredUser)

      toast.success(t('auth.registerSuccess'))
      if (registeredUser?.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        // Local validation is handled inline by the form/component
        return
      }

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

  const forgotPassword = async (email: string) => {
    setIsLoading(true)
    try {
      await authApi.forgotPassword(email)
      toast.success(t('auth.forgotPasswordSuccess'))
    } catch (error: unknown) {
      console.error('Forgot password error:', error)
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 400 &&
        error.response?.data?.error?.includes('OAuth account detected')
      ) {
        toast.error(t('auth.errors.oauthOnly'))
        navigate('/login')
      } else {
        // Always show generic success message to avoid enumeration
        toast.success(t('auth.forgotPasswordSuccess'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore API errors during logout
    }
    setUser(null)
    localStorage.removeItem('isLoggedIn')
    navigate('/login')
  }

  // Reset password function for handling password reset flow
  const resetPassword = async (token: string, newPassword: string) => {
    setIsLoading(true)
    try {
      await authApi.resetPassword(token, newPassword)
      toast.success(t('auth.passwordResetSuccess'))
      // After successful reset, redirect to login page
      navigate('/login')
    } catch (error: unknown) {
      console.error('Reset password error:', error)
      toast.error(t('auth.passwordResetError'))
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = (password: string): PasswordValidationResult => {
    const hasMinLength = password.length >= PASSWORD_RULES.minLength
    return {
      hasMinLength,
      hasUppercase: PASSWORD_RULES.uppercase.test(password),
      hasLowercase: PASSWORD_RULES.lowercase.test(password),
      hasNumber: PASSWORD_RULES.number.test(password),
      hasSpecial: PASSWORD_RULES.special.test(password),
      allValid: PASSWORD_REGEX.test(password) && hasMinLength,
    }
  }

  return {
    login,
    register,
    loginWithGoogle,
    forgotPassword,
    resetPassword,
    logout,
    isLoading,
    isAuthenticated,
    user,
    isInitialLoading,
    getPasswordStrength,
  }
  // Note: order adjusted to include resetPassword
}
