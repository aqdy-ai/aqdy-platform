import { z } from 'zod'
import { loginSchema, registerSchema } from '../hooks/useAuth'

/** Input types derived from Zod schemas */
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

/** All admin roles available in the platform */
export const ADMIN_ROLES = [
  'super_admin',
  'financial_admin',
  'support_admin',
  'content_admin',
  'operations_admin',
  'analytics_admin',
] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]
export type UserRole =
  | 'user'
  | AdminRole
  // Legacy compat
  | 'admin'

/**
 * Data structure sent to the backend registration API.
 * Excludes confirmPassword which is only for frontend validation.
 */
export interface RegisterApiData {
  name: string
  email: string
  password: string
}

/** Shared User interface for the platform */
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  isEmailVerified?: boolean
}

/** Detailed password validation breakdown for real-time UI feedback */
export interface PasswordValidationResult {
  hasMinLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecial: boolean
  allValid: boolean
}
