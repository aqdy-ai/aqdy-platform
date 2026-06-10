// frontend/src/types/payment.d.ts

export interface PlanDetails {
  name: string
  slug: string
}

export interface SubscriptionDetails {
  planId: PlanDetails
}

export interface Payment {
  _id: string
  amount: number
  currency: string
  status: 'succeeded' | 'failed' | 'pending' | 'refunded'
  createdAt: string
  description?: string
  providerTxId?: string
  subscriptionId?: SubscriptionDetails
}

export interface PaginationInfo {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaymentsResponse {
  payments: Payment[]
  pagination: PaginationInfo
}
export interface PaymentHistoryTableProps {
  payments: Payment[]
  onDownloadInvoice: (paymentId: string) => void
}
export interface PaymentStatusBadgeProps {
  status: Payment['status']
}
export interface PaymentPaginationProps {
  pagination: PaginationInfo
  onPageChange: (page: number) => void
}
