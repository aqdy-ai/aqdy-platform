export interface AccountProfile {
  id: string
  name: string
  email: string
  status: 'active' | 'pending' | 'suspended' | string
  memberSince: string
}

export interface SubscriptionInfo {
  planName: string
  analysesUsed: number
  analysesAllowed: number
  renewalDate: string
  endDate?: string
  paymentStatus?: 'paid' | 'failed' | 'pending'
}

export interface UpdateProfilePayload {
  name: string
  email: string
  currentPassword?: string
  newPassword?: string
}
export interface SubscriptionPlan {
  _id: string
  name: string
  slug: string
  price: number | null
  billingCycle: string
  features: string[]
  analysisLimit: number
  storageLimit: number
  isActive: boolean
}

export interface Subscription {
  _id: string
  userId: string
  planId: SubscriptionPlan
  status: string
  startDate: string
  endDate: string
  renewalDate: string
  createdAt: string
  updatedAt: string
}

export interface Usage {
  analysesUsed: number
  analysesLimit: number
  periodStart: string
  periodEnd: string
  renewalDate: string
}

export interface SubscriptionResponseData {
  subscription: Subscription
  usage: Usage
  latestPayment?: {
    status: 'paid' | 'failed' | 'pending'
  }
}

export type CreditLedgerReason =
  | 'plan_topup'
  | 'analysis_deduction'
  | 'chat_deduction'
  | 'manual_adjustment'
  | 'refund'

export interface CreditLedgerEntry {
  _id: string
  delta: number
  balanceAfter: number
  reason: CreditLedgerReason
  metadata: {
    tokensUsed?: number
    hostingCost?: number
    contractId?: string
  }
  createdAt: string
}

export interface CreditsData {
  balance: number
  planAllowance: number
  ledger: CreditLedgerEntry[]
}
