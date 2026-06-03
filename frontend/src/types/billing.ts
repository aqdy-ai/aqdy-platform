/**
 * Billing and Subscription Related Types
 * Handles pricing plans, subscriptions, and payment information
 */

export type BillingCycle = 'monthly' | 'annual'

export type PlanName = 'free' | 'pro' | 'enterprise'

export interface Plan {
  id: string
  name: PlanName
  price: string | number
  currency?: string
  cycle?: BillingCycle
  features?: string[]
  limits?: {
    analysis?: number | string
    storage?: number | string
  }
  ctaKey?: string
  description?: string
}

export interface Invoice {
  id: string
  amount: number
  currency: string
  date: string
  status: 'paid' | 'pending' | 'failed'
  planName: PlanName
  invoiceUrl?: string
}

export interface PaymentMethod {
  id: string
  type: 'credit_card' | 'bank_account'
  lastFour: string
  expiryDate?: string
  isDefault: boolean
}

export interface BillingInfo {
  currentPlan: PlanName
  cycle: BillingCycle
  nextBillingDate: string
  invoices: Invoice[]
  paymentMethod?: PaymentMethod
}
