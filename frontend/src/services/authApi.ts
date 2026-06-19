import axios from 'axios'
import type { LoginInput, RegisterApiData } from '../types/auth'

const authClient = axios.create({
  baseURL: '/api/auth',
  withCredentials: true,
})

export const authApi = {
  login: (credentials: LoginInput) => authClient.post('/login', credentials),
  register: (userData: RegisterApiData) =>
    authClient.post('/register', userData),
  getMe: () => authClient.get('/me'),
  logout: () => authClient.post('/logout'),
  refresh: () => authClient.post('/refresh'),
  verifyEmail: (token: string) => authClient.post('/verify-email', { token }),
  resendVerification: () => authClient.post('/resend-verification'),
}
