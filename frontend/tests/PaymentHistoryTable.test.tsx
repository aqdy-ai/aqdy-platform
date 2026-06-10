import '@testing-library/jest-dom/vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentHistoryTable } from '@/components/features/billing/PaymentHistoryTable'
import { useTranslation } from 'react-i18next'
import { Payment } from '@/types/payment'

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string, options?: { planName?: string }): string => {
      if (key === 'billing.plan_payment_description' && options?.planName) {
        return `Payment for ${options.planName} plan`
      }
      return key
    },
    i18n: {
      language: 'en',
      dir: () => 'ltr',
    },
  })),
}))

// Mock Shadcn components
vi.mock('@/components/ui/table', () => ({
  Table: ({ children, dir }: { children: React.ReactNode; dir?: string }) => (
    <table dir={dir}>{children}</table>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableRow: ({ children }: { children: React.ReactNode }) => (
    <tr>{children}</tr>
  ),
  TableHead: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <th className={className}>{children}</th>,
  TableCell: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <td className={className}>{children}</td>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    onClick,
    children,
    variant,
    size,
  }: {
    onClick?: () => void
    children: React.ReactNode
    variant?: string
    size?: string
  }) => (
    <button onClick={onClick} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/features/billing/PaymentStatusBadge', () => ({
  PaymentStatusBadge: ({ status }: { status: Payment['status'] }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) =>
    args
      .flat()
      .filter(Boolean)
      .map((arg) => {
        if (typeof arg === 'string') return arg
        return Object.entries(arg)
          .filter(([_, value]) => Boolean(value))
          .map(([key]) => key)
          .join(' ')
      })
      .join(' ')
      .trim(),
}))

const mockPayments: Payment[] = [
  {
    _id: 'payment1',
    amount: 50.0,
    currency: 'USD',
    status: 'succeeded',
    createdAt: '2023-10-26T10:00:00Z',
    description: 'Monthly subscription fee',
    subscriptionId: {
      planId: {
        name: 'Pro Plan',
        slug: 'pro-plan',
      },
    },
  },
  {
    _id: 'payment2',
    amount: 10.5,
    currency: 'EGP',
    status: 'pending',
    createdAt: '2023-10-25T11:00:00Z',
    description: 'Credit top-up',
  },
  {
    _id: 'payment3',
    amount: 25.0,
    currency: 'USD',
    status: 'failed',
    createdAt: '2023-10-24T12:00:00Z',
    description: 'Failed payment attempt',
  },
]

describe('PaymentHistoryTable', () => {
  const onDownloadInvoice = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders table headers correctly', () => {
    render(
      <PaymentHistoryTable
        payments={[]}
        onDownloadInvoice={onDownloadInvoice}
      />
    )
    expect(screen.getByText('billing.date')).toBeInTheDocument()
    expect(screen.getByText('billing.description')).toBeInTheDocument()
    expect(screen.getByText('billing.amount')).toBeInTheDocument()
    expect(screen.getByText('billing.status')).toBeInTheDocument()
    expect(screen.getByText('billing.actions')).toBeInTheDocument()
  })

  it('renders payment rows with correct data', () => {
    render(
      <PaymentHistoryTable
        payments={mockPayments}
        onDownloadInvoice={onDownloadInvoice}
      />
    )

    // Payment 1
    expect(screen.getByText('10/26/2023')).toBeInTheDocument()
    expect(screen.getByText(/Payment for.*Pro.*plan/i)).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
    expect(screen.getAllByTestId('status-badge')[0]).toHaveTextContent(
      'succeeded'
    )
    expect(
      screen.getByRole('button', { name: 'billing.download_invoice' })
    ).toBeInTheDocument()

    // Payment 2
    expect(screen.getByText('10/25/2023')).toBeInTheDocument()
    expect(screen.getByText('Credit top-up')).toBeInTheDocument()
    expect(screen.getByText('EGP 10.50')).toBeInTheDocument()
    expect(screen.getAllByTestId('status-badge')[1]).toHaveTextContent(
      'pending'
    )
  })

  it('calls onDownloadInvoice when download button is clicked for a succeeded payment', () => {
    render(
      <PaymentHistoryTable
        payments={mockPayments}
        onDownloadInvoice={onDownloadInvoice}
      />
    )
    const downloadButton = screen.getByRole('button', {
      name: 'billing.download_invoice',
    })
    fireEvent.click(downloadButton)
    expect(onDownloadInvoice).toHaveBeenCalledWith('payment1')
  })

  it('applies RTL styling when i18n direction is rtl', () => {
    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string, options?: { planName?: string }) => {
        if (key === 'billing.plan_payment_description' && options?.planName) {
          return `Payment for ${options.planName} plan`
        }
        return key
      },
      i18n: {
        language: 'ar',
        dir: () => 'rtl',
      },
    })

    render(
      <PaymentHistoryTable
        payments={mockPayments}
        onDownloadInvoice={onDownloadInvoice}
      />
    )
    const table = screen.getByRole('table')
    expect(table).toHaveAttribute('dir', 'rtl')

    const tableHeads = screen.getAllByRole('columnheader')
    tableHeads.forEach((head) => {
      expect(head).toHaveClass('text-right')
    })
  })

  it('renders fallback descriptions correctly', () => {
    render(
      <PaymentHistoryTable
        payments={mockPayments}
        onDownloadInvoice={onDownloadInvoice}
      />
    )

    // Payment 2 (Fallback description check)
    expect(screen.getByText('Credit top-up')).toBeInTheDocument()

    // Case where description is missing entirely
    const noDescPayment: Payment[] = [
      {
        _id: 'payment_none',
        amount: 0,
        currency: 'USD',
        status: 'failed' as const,
        createdAt: '2023-10-26T10:00:00Z',
      },
    ]
    render(
      <PaymentHistoryTable
        payments={noDescPayment}
        onDownloadInvoice={onDownloadInvoice}
      />
    )
    expect(
      screen.getByText('billing.generic_payment_description')
    ).toBeInTheDocument()
  })
})
