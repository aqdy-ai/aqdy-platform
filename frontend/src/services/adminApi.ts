import axios from 'axios'

const adminClient = axios.create({
  baseURL: '/api/admin',
  withCredentials: true,
})

export interface AuditLogError {
  _id: string
  userId?: string
  userEmail?: string
  errorMessage?: string
  action: string
  category: string
  outcome: string
  details?: string
  timestamp: string
}

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
    totalAnalyses: number
    recentErrors: AuditLogError[]
  }
}

export interface DailyStat {
  date: string;
  avgFaithfulness: number;
  avgRelevancy: number;
  avgPrecision: number;
  avgRecall: number;
  count: number;
}
export interface PaymentUser {
  _id: string;
  name: string;
  email: string;
  planSlug: string;
  status: string;
}

export interface Evaluation {
  _id: string;
  analysisId: string;
  faithfulness: number;
  relevancy: number;
  precision: number;
  recall: number;
  reasoning: {
    faithfulness?: string;
    relevancy?: string;
    precision?: string;
    recall?: string;
    overall?: string;
  };
  createdAt: string;
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
  isEmailVerified?: boolean
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

export interface DashboardData {
  totalAccounts: number
  accountsThisWeek: number
  activeSubscriptions: number
  mrrCurrent: number
  mrrChange: number
  mrrByCurrency: Record<string, number>
  analysesThisMonth: number
  analysesChange: number
  totalAnalyses: number
  avgCreditsPerAnalysis: number

  creditsIssuedAllTime: number
  creditsConsumedThisMonth: number
  creditsConsumedLastMonth: number
  creditsRemaining: number
  avgInputTokens: number

  mrrTrend: { month: string; usd: number }[]
  weeklySignups: { week: string; count: number }[]

  analysesPerDay: { date: string; count: number }[]
  creditsPerDay: { date: string; credits: number }[]

  riskDistribution: { risk: string; count: number }[]
  agentLatency: { extractor: number; classifier: number; redline: number }
  topContractTypes: { type: string; count: number }[]

  topCreditConsumers: {
    _id: string
    name: string
    email: string
    planSlug: string
    credits: number
  }[]
  planBreakdown: { plan: string; count: number }[]
  languageSplit: { language: string; count: number }[]

  recentAnalyses: {
    _id: string
    contractId: string | null
    filename: string
    language: string
    overallRisk: string
    userId: string
    createdAt: string
  }[]
  recentPayments: {
    _id: string
    user: { name: string; email: string; planSlug?: string }
    amount: number
    currency: string
    status: string
    createdAt: string
  }[]
  pipelineErrors: {
    _id: string
    action: string
    errorMessage?: string
    timestamp: string
  }[]
}

export const adminApi = {
  getDashboard: () =>
    adminClient.get<{ success: boolean; data: DashboardData }>('/dashboard'),
  getStats: () => adminClient.get<AdminStats>('/stats'),
  // Evaluation endpoints
  getEvaluationStats: (params?: { startDate?: string; endDate?: string }) =>
    adminClient.get<{ success: boolean; data: DailyStat[] }>('/evaluations/stats', { params }),
  getLowScores: (params?: { startDate?: string; endDate?: string }) =>
    adminClient.get<{ success: boolean; data: Evaluation[] }>('/evaluations/low-scores', { params }),
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
  updateAccount: (
    id: string,
    data: { planSlug?: string; status?: string; isEmailVerified?: boolean }
  ) =>
    adminClient.patch<{ success: boolean; data: UserAccount }>(
      `/accounts/${id}`,
      data
    ),
}
