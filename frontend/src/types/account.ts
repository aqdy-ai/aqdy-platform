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
}

export interface UpdateProfilePayload {
  name: string
  email: string
  currentPassword?: string
  newPassword?: string
}
