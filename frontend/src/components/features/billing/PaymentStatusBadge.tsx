// frontend/src/components/features/billing/PaymentStatusBadge.tsx
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { Payment, PaymentStatusBadgeProps } from '@/types/payment'
import { cn } from '@/lib/utils' // Import cn utility for class merging

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
}) => {
  const { t } = useTranslation()

  // This function returns a valid Shadcn variant to satisfy TypeScript
  // and provide a base style (e.g., padding, border-radius).
  const getBaseVariant = (s: Payment['status']) => {
    switch (s) {
      case 'succeeded':
        return 'default' // Use 'default' as a base variant
      case 'failed':
        return 'destructive'
      case 'pending':
        return 'secondary'
      case 'refunded':
        return 'secondary'
      default:
        return 'default'
    }
  }

  // This function returns custom Tailwind CSS classes for specific colors.
  // These classes will override the color properties from the base variant.
  const getColorClasses = (s: Payment['status']) => {
    switch (s) {
      case 'succeeded':
        return 'bg-green-500 text-green-50' // Green for success
      case 'failed':
        return 'bg-red-500 text-red-50' // Red for failed
      case 'pending':
        return 'bg-yellow-500 text-yellow-900' // Yellow for pending
      case 'refunded':
        return 'bg-blue-500 text-blue-50' // Blue for refunded
      default:
        return 'bg-gray-500 text-gray-50' // Default gray
    }
  }

  return (
    <Badge
      variant={getBaseVariant(status)}
      className={cn(getColorClasses(status))}
    >
      {t(`billing.status_${status}`)}
    </Badge>
  )
}
