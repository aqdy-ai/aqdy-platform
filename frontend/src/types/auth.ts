import { z } from 'zod'
import { loginSchema, registerSchema } from '../hooks/useAuth'

/** Input types derived from Zod schemas */
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

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
  role: string
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
