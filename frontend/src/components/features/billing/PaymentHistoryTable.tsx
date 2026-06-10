// frontend/src/components/features/billing/PaymentHistoryTable.tsx
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { PaymentHistoryTableProps } from '@/types/payment'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import { cn } from '@/lib/utils' // Assuming this utility exists for conditional classNames

export const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({
  payments,
  onDownloadInvoice,
}) => {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table dir={i18n.dir()}>
        <TableHeader>
          <TableRow>
            <TableHead className={cn({ 'text-right': isRtl })}>
              {t('billing.date')}
            </TableHead>
            <TableHead className={cn({ 'text-right': isRtl })}>
              {t('billing.description')}
            </TableHead>
            <TableHead className={cn({ 'text-right': isRtl })}>
              {t('billing.amount')}
            </TableHead>
            <TableHead className={cn({ 'text-right': isRtl })}>
              {t('billing.status')}
            </TableHead>
            <TableHead className={cn({ 'text-right': isRtl })}>
              {t('billing.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment._id}>
              <TableCell className={cn({ 'text-right': isRtl })}>
                {new Date(payment.createdAt).toLocaleDateString(i18n.language)}
              </TableCell>
              <TableCell className={cn({ 'text-right': isRtl })}>
                {payment.subscriptionId?.planId?.name
                  ? t('billing.plan_payment_description', {
                      planName: t(
                        `billing.plans.${payment.subscriptionId.planId.name}`
                      ),
                    })
                  : payment.description ||
                    t('billing.generic_payment_description')}
              </TableCell>
              <TableCell className={cn({ 'text-right': isRtl })}>
                {formatCurrency(payment.amount, payment.currency)}
              </TableCell>
              <TableCell className={cn({ 'text-right': isRtl })}>
                <PaymentStatusBadge status={payment.status} />
              </TableCell>
              <TableCell className={cn({ 'text-right': isRtl })}>
                {payment.status === 'succeeded' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownloadInvoice(payment._id)}
                    className={cn({ 'ms-auto': isRtl }, 'cursor-pointer')}
                  >
                    {t('billing.download_invoice')}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
