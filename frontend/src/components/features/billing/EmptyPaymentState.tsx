// frontend/src/components/features/billing/EmptyPaymentState.tsx
import React from 'react'
import { useTranslation } from 'react-i18next'

export const EmptyPaymentState: React.FC = () => {
  const { t } = useTranslation()
  return (
    <div className="py-12 text-center">
      <h3 className="text-lg font-semibold">
        {t('billing.no_payments_found')}
      </h3>
      <p className="text-muted-foreground mt-2">
        {t('billing.start_using_platform')}
      </p>
    </div>
  )
}
