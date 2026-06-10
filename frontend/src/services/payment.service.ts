import { PaymentsResponse } from '@/types/payment'
import axios from 'axios'

const paymentClient = axios.create({
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

paymentClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If the error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => paymentClient(originalRequest))
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Trigger the refresh endpoint (which updates the httpOnly cookies)
        await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        processQueue(null)
        return paymentClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export const paymentService = {
  async getUserPayments(page = 1, limit = 10): Promise<PaymentsResponse> {
    const response = await paymentClient.get('/payments', {
      params: { page, limit },
    })
    return response.data.data // Assuming ApiResponse envelope
  },

  async downloadInvoice(paymentId: string): Promise<ArrayBuffer> {
    const response = await paymentClient.get(`/payments/${paymentId}/invoice`, {
      responseType: 'arraybuffer', // Important for PDF download
    })
    return response.data // This will be the ArrayBuffer of the PDF
  },
  // ... other payment related services
}
