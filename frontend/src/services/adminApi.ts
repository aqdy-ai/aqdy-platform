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
  date: string
  avgFaithfulness: number
  avgRelevancy: number
  avgPrecision: number
  avgRecall: number
  count: number
}
export interface PaymentUser {
  _id: string
  name: string
  email: string
  planSlug: string
  status: string
}

export interface Evaluation {
  _id: string
  analysisId: string
  faithfulness: number
  relevancy: number
  precision: number
  recall: number
  reasoning: {
    faithfulness?: string
    relevancy?: string
    precision?: string
    recall?: string
    overall?: string
  }
  createdAt: string
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

export interface AdminPlan {
  _id: string
  name: string
  slug: string
  price: number | null
  billingCycle: 'monthly' | 'annual'
  features: string[]
  analysisLimit: number
  storageLimit: number
  creditAllowance: number
  stripePriceId?: string
  stripeAnnualPriceId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePlanInput {
  name: string
  slug: string
  price?: number | null
  billingCycle: 'monthly' | 'annual'
  features: string[]
  analysisLimit: number
  storageLimit: number
  creditAllowance?: number
  stripePriceId?: string
  stripeAnnualPriceId?: string
  isActive?: boolean
}

export interface PlansResponse {
  success: boolean
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  data: AdminPlan[]
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
    adminClient.get<{ success: boolean; data: DailyStat[] }>(
      '/evaluations/stats',
      { params }
    ),
  getLowScores: (params?: { startDate?: string; endDate?: string }) =>
    adminClient.get<{ success: boolean; data: Evaluation[] }>(
      '/evaluations/low-scores',
      { params }
    ),
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

  // ── Role Management (Super Admin only) ──────────────
  getRoleUsers: () => adminClient.get('/roles'),
  assignRole: (userId: string, role: string) =>
    adminClient.post('/roles/assign', { userId, role }),
  revokeRole: (userId: string) => adminClient.post('/roles/revoke', { userId }),
  getRoleAuditLog: (params?: {
    page?: number
    pageSize?: number
    action?: string
  }) => adminClient.get('/roles/audit-log', { params }),

  // ── Support Admin ───────────────────────────────────
  searchUsers: (q: string, page?: number) =>
    adminClient.get('/support/users/search', { params: { q, page } }),
  getSupportUser: (id: string) => adminClient.get(`/support/users/${id}`),
  verifyUserEmail: (id: string) =>
    adminClient.post(`/support/users/${id}/verify-email`),
  triggerPasswordReset: (id: string) =>
    adminClient.post(`/support/users/${id}/reset-password`),
  supportCreditAdjustment: (id: string, amount: number, reason: string) =>
    adminClient.post(`/support/users/${id}/credit-adjustment`, {
      amount,
      reason,
    }),

  // ── Financial Admin ─────────────────────────────────
  getFinancialOverview: () => adminClient.get('/financial/overview'),
  getSubscriptions: (params?: {
    page?: number
    planSlug?: string
    search?: string
  }) => adminClient.get('/financial/subscriptions', { params }),
  changeSubscription: (id: string, action: string, planSlug?: string) =>
    adminClient.post(`/financial/subscriptions/${id}/change`, {
      action,
      planSlug,
    }),
  issueRefund: (userId: string, amount: number, reason: string) =>
    adminClient.post('/financial/refunds', { userId, amount, reason }),
  financialCreditAdjustment: (userId: string, amount: number, reason: string) =>
    adminClient.post('/financial/credits', { userId, amount, reason }),
  getStripeWebhooks: (params?: {
    page?: number
    eventType?: string
    status?: string
  }) => adminClient.get('/financial/stripe-webhooks', { params }),
  getFinancialExport: (dateFrom?: string, dateTo?: string) =>
    adminClient.get('/financial/export', { params: { dateFrom, dateTo } }),

  // ── Content Admin ───────────────────────────────────
  getKnowledgeBase: (params?: {
    search?: string
    contractType?: string
    category?: string
    jurisdiction?: string
    riskLevel?: string
    page?: number
    pageSize?: number
  }) => adminClient.get('/content/knowledge-base', { params }),
  getLangfuseMetrics: (params?: { startDate?: string; endDate?: string }) =>
    adminClient.get('/content/langfuse-metrics', { params }),
  createKBEntry: (data: Record<string, string>) =>
    adminClient.post('/content/knowledge-base', data),
  updateKBEntry: (id: string, data: Record<string, string>) =>
    adminClient.put(`/content/knowledge-base/${id}`, data),
  deleteKBEntry: (id: string) =>
    adminClient.delete(`/content/knowledge-base/${id}`),
  getPrompts: () => adminClient.get('/content/prompts'),
  updatePrompt: (agentName: string, prompt: string) =>
    adminClient.put(`/content/prompts/${agentName}`, { prompt }),
  // ── Operations Admin ────────────────────────────────
  getSystemHealth: () => adminClient.get('/operations/system-health'),
  getPipelineMetrics: () => adminClient.get('/operations/pipeline-metrics'),
  getInfrastructure: () => adminClient.get('/operations/infrastructure'),
  getLangfuseTraces: (params?: {
    status?: string
    agent?: string
    page?: number
  }) => adminClient.get('/operations/langfuse-traces', { params }),
  getAlerts: () => adminClient.get('/operations/alerts'),

  // ── Plan Management ────────────────────────────────
  getPlans: (params?: {
    page?: number
    pageSize?: number
    isActive?: string
    billingCycle?: string
    search?: string
  }) => adminClient.get<PlansResponse>('/plans', { params }),
  getPlan: (id: string) =>
    adminClient.get<{ success: boolean; data: AdminPlan }>(`/plans/${id}`),
  createPlan: (data: CreatePlanInput) =>
    adminClient.post<{ success: boolean; data: AdminPlan }>('/plans', data),
  updatePlan: (id: string, data: Partial<CreatePlanInput>) =>
    adminClient.put<{ success: boolean; data: AdminPlan }>(
      `/plans/${id}`,
      data
    ),
  deletePlan: (id: string) =>
    adminClient.delete<{ success: boolean; message: string }>(`/plans/${id}`),

  // ── Audit Logs ──────────────────────────────────────
  getAuditLogs: (params?: {
    page?: number
    pageSize?: number
    action?: string
    outcome?: string
    email?: string
    userId?: string
    dateFrom?: string
    dateTo?: string
  }) => adminClient.get('/audit-logs', { params }),
}
