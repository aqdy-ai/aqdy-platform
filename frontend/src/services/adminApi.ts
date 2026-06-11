import axios from 'axios'

const adminClient = axios.create({
  baseURL: '/api/admin',
  withCredentials: true,
})

export interface AdminStats {
  success: boolean
  period: {
    month: string
    from: string
    to: string
  }
  data: {
    totalAccounts: number
    activeSubscriptions: number
    revenueThisMonth: Record<string, number>
    analysesThisMonth: number
    creditsConsumedThisMonth: number
  }
}

export interface PaymentUser {
  _id: string
  name: string
  email: string
  planSlug: string
  status: string
}

export interface PaymentRecord {
  _id: string
  userId: PaymentUser | null | string
  amount: number
  currency: string
  status: string
  planSlug?: string
  createdAt: string
}

export interface PaymentsResponse {
  success: boolean
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  data: PaymentRecord[]
}

export interface UserAccount {
  _id: string
  name: string
  email: string
  planSlug: string
  plan: string
  creditBalance: number
  status: string
  role: string
  createdAt: string
  updatedAt: string
  lastLogin?: string
}

export interface AccountsResponse {
  success: boolean
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  data: UserAccount[]
}

export interface ContractOwner {
  _id: string
  name: string
  email: string
}

export interface AdminContract {
  _id: string
  filename: string
  uploadedAt: string
  language: string
  fileSize: number
  owner: ContractOwner | null
  status: 'analyzed' | 'pending' | 'failed'
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | null
}

export interface ContractsResponse {
  success: boolean
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  data: AdminContract[]
}

export const adminApi = {
  getStats: () => adminClient.get<AdminStats>('/stats'),
  getPayments: (params?: {
    page?: number
    pageSize?: number
    status?: string
    dateFrom?: string
    dateTo?: string
    userId?: string
    search?: string
  }) => adminClient.get<PaymentsResponse>('/payments', { params }),
  getContracts: (params?: {
    page?: number
    pageSize?: number
    status?: string
    riskLevel?: string
    dateFrom?: string
    dateTo?: string
    search?: string
  }) => adminClient.get<ContractsResponse>('/contracts', { params }),
  getAccounts: (params?: {
    page?: number
    pageSize?: number
    planSlug?: string
    status?: string
    search?: string
  }) => adminClient.get<AccountsResponse>('/accounts', { params }),
  updateAccount: (id: string, data: { planSlug?: string; status?: string }) =>
    adminClient.patch<{ success: boolean; data: UserAccount }>(
      `/accounts/${id}`,
      data
    ),
}
