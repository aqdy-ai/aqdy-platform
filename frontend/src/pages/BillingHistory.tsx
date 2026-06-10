import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { paymentService } from '@/services/payment.service'
import { PaymentHistoryTable } from '@/components/features/billing/PaymentHistoryTable'
import { PaymentPagination } from '@/components/features/billing/PaymentPagination'
import { EmptyPaymentState } from '@/components/features/billing/EmptyPaymentState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { PaymentsResponse } from '@/types/payment'
import { useAuth } from '@/hooks/useAuth'

const BillingHistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated, isInitialLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 10 // Items per page

  const userId = user?.id // Used for queryKey, not passed to service
  const {
    data: paymentData,
    isLoading,
    isError,
    error,
  } = useQuery<PaymentsResponse, Error>({
    queryKey: ['userPayments', userId, currentPage, limit],
    queryFn: () => paymentService.getUserPayments(currentPage, limit),
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleDownloadInvoice = async (paymentId: string) => {
    try {
      if (!isAuthenticated) {
        toast.error(t('common.error'), {
          // Use toast.error for destructive variant
          description: t('billing.error_user_not_authenticated'),
        })
        return
      }

      const response = await paymentService.downloadInvoice(paymentId)
      const blob = new Blob([response], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${paymentId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(t('billing.invoice_download_success'), {
        description: t('billing.invoice_download_success_desc'),
      })
    } catch (err) {
      console.error('Failed to download invoice:', err)
      toast.error(t('common.error'), {
        description: t('billing.invoice_download_failed'),
      })
    }
  }

  useEffect(() => {
    if (isError) {
      toast.error(t('common.error'), {
        description: t('billing.error_fetching_payments'),
      })
    }
  }, [isError, error, t])
  if (isLoading || isInitialLoading) {
    return <div className="py-8 text-center">{t('common.loading')}</div>
  }

  if (!paymentData || paymentData.payments.length === 0) {
    return <EmptyPaymentState />
  }

  return (
    <div className="container mx-auto py-8" dir={i18n.dir()}>
      <Card>
        <CardHeader>
          <CardTitle
            className={i18n.dir() === 'rtl' ? 'text-right' : 'text-left'}
          >
            {t('billing.payment_history')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentHistoryTable
            payments={paymentData.payments}
            onDownloadInvoice={handleDownloadInvoice}
          />
          {paymentData.pagination.totalPages > 1 && (
            <PaymentPagination
              pagination={paymentData.pagination}
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default BillingHistoryPage
