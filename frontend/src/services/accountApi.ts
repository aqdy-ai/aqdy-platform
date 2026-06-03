import axios from 'axios'
import type {
  AccountProfile,
  SubscriptionInfo,
  UpdateProfilePayload,
} from '../types/account'
import type { ApiResponse } from '../types'

const accountClient = axios.create({
  baseURL: '/api/account',
  withCredentials: true,
})

export const accountApi = {
  getProfile: () => accountClient.get<ApiResponse<AccountProfile>>('/profile'),
  updateProfile: (data: UpdateProfilePayload) =>
    accountClient.patch<ApiResponse<AccountProfile>>('/profile', data),
  getSubscription: () =>
    accountClient.get<ApiResponse<SubscriptionInfo>>('/subscription'),
}
