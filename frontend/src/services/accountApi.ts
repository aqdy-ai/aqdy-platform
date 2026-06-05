import axios from 'axios'
import type {
  AccountProfile,
  SubscriptionInfo,
  SubscriptionResponseData,
  UpdateProfilePayload,
} from '../types/account'
import type { ApiResponse } from '../types'

const accountClient = axios.create({
  baseURL: '/api/account',
  withCredentials: true,
})

// 🛡️ Types for the token refresh queue
interface PendingRequest {
  resolve: (token: string | null) => void
  reject: (error: unknown) => void
}

// 🛡️ Logic to handle simultaneous 401 errors
let isRefreshing = false
let failedQueue: PendingRequest[] = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom: PendingRequest) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

accountClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If the error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => accountClient(originalRequest))
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Trigger the refresh endpoint (which updates the httpOnly cookies)
        await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        processQueue(null)
        return accountClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // If refresh fails, the session is truly dead.
        // You might want to trigger a logout or window.location.href = '/login' here.
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export const accountApi = {
  getProfile: () => accountClient.get<ApiResponse<AccountProfile>>('/profile'),
  updateProfile: (data: UpdateProfilePayload) =>
    accountClient.patch<ApiResponse<AccountProfile>>('/profile', data),
  async getSubscription(): Promise<SubscriptionInfo> {
    const response =
      await accountClient.get<ApiResponse<SubscriptionResponseData>>(
        '/subscription'
      )

    return {
      planName: response.data.data.subscription.planId.name,
      analysesUsed: response.data.data.usage.analysesUsed,
      analysesAllowed: response.data.data.usage.analysesLimit,
      renewalDate: response.data.data.usage.renewalDate,
    }
  },
}
