import axios from 'axios'
import type { LoginInput, RegisterApiData } from '../types/auth'

const authClient = axios.create({
  baseURL: '/api/auth',
  withCredentials: true,
})

const authApi = {
  forgotPassword: (email: string) =>
    authClient.post('/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    authClient.post('/reset-password', { token, newPassword }),
  login: (credentials: LoginInput) => authClient.post('/login', credentials),
  loginWithGoogle: (idToken: string) => authClient.post('/google', { idToken }),
  register: (userData: RegisterApiData) =>
    authClient.post('/register', userData),
  getMe: () => authClient.get('/me'),
  logout: () => authClient.post('/logout'),
  refresh: () => authClient.post('/refresh'),
  verifyEmail: (token: string) => authClient.post('/verify-email', { token }),
  resendVerification: () => authClient.post('/resend-verification'),
}

export { authApi }
