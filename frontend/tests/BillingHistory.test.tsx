// @vitest-environment jsdom
// frontend/tests/pages/BillingHistory.test.tsx
import React from 'react'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import BillingHistoryPage from '@/pages/BillingHistory'
import { paymentService } from '@/services/payment.service'
import { toast } from 'sonner'
import { PaymentsResponse } from '@/types/payment'
import { useAuth } from '@/hooks/useAuth'

// Mock react-i18next
vi.mock('react-i18next', async () => {
  return {
    useTranslation: vi.fn(() => ({
      t: (key: string) => key,
      i18n: { language: 'en', dir: () => 'ltr' },
    })),
  }
})

// Mock paymentService
vi.mock('@/services/payment.service', () => ({
  paymentService: {
    getUserPayments: vi.fn(),
    downloadInvoice: vi.fn(),
  },
}))

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(), // Mock the hook itself
}))

// Mock toast
// The previous mock for sonner.toast was correct, ensuring it's still mocked.
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock Shadcn Card components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <h2 className={className}>{children}</h2>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}))

// Mock Shadcn Button component (used in PaymentHistoryTable and PaymentPagination)
vi.mock('@/components/ui/button', () => ({
  Button: ({
    onClick,
    children,
    disabled,
    variant,
    size,
  }: {
    onClick?: () => void
    children: React.ReactNode
    disabled?: boolean
    variant?: string
    size?: string
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}))

// Mock Shadcn Badge component (used in PaymentStatusBadge)
vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    variant,
    children,
  }: {
    variant: string
    children: React.ReactNode
  }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}))

// Mock Shadcn Pagination components (used in PaymentPagination)
vi.mock('@/components/ui/pagination', () => ({
  Pagination: ({ children }: { children: React.ReactNode }) => (
    <nav aria-label="Pagination">{children}</nav>
  ),
  PaginationContent: ({ children }: { children: React.ReactNode }) => (
    <ul>{children}</ul>
  ),
  PaginationItem: ({ children }: { children: React.ReactNode }) => (
    <li>{children}</li>
  ),
  PaginationPrevious: ({
    onClick,
    disabled,
  }: {
    onClick: () => void
    disabled: boolean
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label="Previous page">
      Previous
    </button>
  ),
  PaginationLink: ({
    onClick,
    isActive,
    children,
  }: {
    onClick: () => void
    isActive: boolean
    children: React.ReactNode
  }) => (
    <button onClick={onClick} aria-current={isActive ? 'page' : undefined}>
      {children}
    </button>
  ),
  PaginationNext: ({
    onClick,
    disabled,
  }: {
    onClick: () => void
    disabled: boolean
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label="Next page">
      Next
    </button>
  ),
}))

// Mock Blob and URL for file download
const mockBlob = new Blob(['mock pdf content'], { type: 'application/pdf' })
const mockUrl = 'blob:http://localhost/mock-pdf-url'

// Store original methods to restore them
const originalCreateObjectURL = window.URL.createObjectURL
const originalRevokeObjectURL = window.URL.revokeObjectURL
const originalAppendChild = document.body.appendChild

beforeEach(() => {
  window.URL.createObjectURL = vi.fn(() => mockUrl)
  window.URL.revokeObjectURL = vi.fn()
  vi.spyOn(document.body, 'appendChild')

  // Spy on createElement but only override behavior for 'a' tags to avoid breaking React's rendering
  const originalCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
    const el = originalCreateElement(tagName)
    if (tagName === 'a') {
      el.click = vi.fn()
      el.remove = vi.fn()
    }
    return el
  })
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for tests
    },
  },
})

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('BillingHistoryPage', () => {
  const mockPaymentsData: PaymentsResponse = {
    payments: [
      {
        _id: 'pay1',
        amount: 100.0,
        currency: 'USD',
        status: 'succeeded',
        createdAt: '2023-01-15T10:00:00Z',
        description: 'Monthly subscription',
        subscriptionId: {
          planId: {
            name: 'Pro',
            slug: 'pro',
          },
        },
      },
    ],
    pagination: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  }

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    window.URL.createObjectURL = originalCreateObjectURL
    window.URL.revokeObjectURL = originalRevokeObjectURL
  })

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear() // Clear query cache before each test

    // Default mock for useTranslation
    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string, options?: { planName?: string }) => {
        if (key === 'billing.plan_payment_description') {
          // Simulate how the component builds the string with translated plan names
          const planName = options?.planName || ''
          return `Payment for ${planName} plan`
        }
        return key
      },
      i18n: { language: 'en', dir: () => 'ltr' },
    } as any) // Cast to any to satisfy type checking for partial mock

    // Default mock for useAuth
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user123', // Component uses user.id
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      },
      isAuthenticated: true,
      isInitialLoading: false,
    } as any) // Cast to any for partial mock
    ;(paymentService.getUserPayments as vi.Mock).mockResolvedValue(
      mockPaymentsData
    )
    ;(paymentService.downloadInvoice as vi.Mock).mockResolvedValue(mockBlob)
  })

  it('renders loading state initially', () => {
    ;(paymentService.getUserPayments as vi.Mock).mockReturnValueOnce(
      new Promise(() => {})
    ) // Pending promise
    renderWithClient(<BillingHistoryPage />)
    expect(screen.getByText('common.loading')).toBeInTheDocument()
  })

  it('renders payment history table with data', async () => {
    renderWithClient(<BillingHistoryPage />)
    await waitFor(() =>
      expect(screen.getByText('billing.payment_history')).toBeInTheDocument()
    )
    expect(screen.getByText('1/15/2023')).toBeInTheDocument()
    expect(screen.getByText(/Payment for.*Pro.*plan/i)).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
  })

  it('handles pagination correctly', async () => {
    const paginatedDataPage1: PaymentsResponse = {
      payments: [
        {
          _id: 'pay1',
          amount: 100,
          currency: 'USD',
          status: 'succeeded',
          createdAt: '2023-01-15T10:00:00Z',
          description: 'Monthly subscription',
        },
      ],
      pagination: {
        total: 20,
        page: 1,
        limit: 10,
        totalPages: 2,
      },
    }
    const paginatedDataPage2: PaymentsResponse = {
      payments: [
        {
          _id: 'pay2',
          amount: 110,
          currency: 'USD',
          status: 'succeeded',
          createdAt: '2023-02-01T10:00:00Z',
          description: 'Another subscription',
        },
      ],
      pagination: {
        total: 20,
        page: 2,
        limit: 10,
        totalPages: 2,
      },
    }

    ;(paymentService.getUserPayments as vi.Mock)
      .mockResolvedValueOnce(paginatedDataPage1)
      .mockResolvedValueOnce(paginatedDataPage2)

    renderWithClient(<BillingHistoryPage />)

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '1', current: 'page' })
      ).toBeInTheDocument()
    )
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '2' }))

    await waitFor(() => {
      expect(paymentService.getUserPayments).toHaveBeenCalledWith(2, 10)
      expect(screen.getByText('2/1/2023')).toBeInTheDocument() // Data from second page
      expect(screen.getByText('$110.00')).toBeInTheDocument()
    })
  })

  it('triggers invoice download and shows success toast', async () => {
    renderWithClient(<BillingHistoryPage />)
    await waitFor(() =>
      expect(screen.getByText('billing.download_invoice')).toBeInTheDocument()
    )

    const downloadButton = screen.getByRole('button', {
      name: 'billing.download_invoice',
    })
    fireEvent.click(downloadButton)

    await waitFor(() =>
      expect(paymentService.downloadInvoice).toHaveBeenCalled()
    )

    expect(window.URL.createObjectURL).toHaveBeenCalled()
    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(document.body.appendChild).toHaveBeenCalled()

    expect(toast.success).toHaveBeenCalledWith(
      'billing.invoice_download_success',
      expect.anything()
    )
  })

  it('shows error toast if invoice download fails', async () => {
    ;(paymentService.downloadInvoice as vi.Mock).mockRejectedValueOnce(
      new Error('Network error')
    )
    renderWithClient(<BillingHistoryPage />)
    await waitFor(() =>
      expect(screen.getByText('billing.download_invoice')).toBeInTheDocument()
    )

    const downloadButton = screen.getByRole('button', {
      name: 'billing.download_invoice',
    })
    fireEvent.click(downloadButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'common.error',
        expect.objectContaining({
          description: 'billing.invoice_download_failed',
        })
      )
    })
  })

  it('shows empty state when no payments are returned', async () => {
    ;(paymentService.getUserPayments as vi.Mock).mockResolvedValueOnce({
      payments: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    })
    renderWithClient(<BillingHistoryPage />)
    await waitFor(() =>
      expect(screen.getByText('billing.no_payments_found')).toBeInTheDocument()
    )
    expect(screen.getByText('billing.start_using_platform')).toBeInTheDocument()
  })

  it('shows error toast if fetching payments fails', async () => {
    ;(paymentService.getUserPayments as vi.Mock).mockRejectedValueOnce(
      new Error('API error')
    )
    renderWithClient(<BillingHistoryPage />)
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'common.error',
        expect.objectContaining({
          description: 'billing.error_fetching_payments',
        })
      )
    )
    // Component returns EmptyPaymentState on error, so we check for that
    expect(screen.getByText('billing.no_payments_found')).toBeInTheDocument()
  })

  it('applies RTL layout when language direction is rtl', async () => {
    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string) => key,
      i18n: {
        language: 'ar',
        dir: () => 'rtl',
      },
    } as any)
    renderWithClient(<BillingHistoryPage />)
    await waitFor(() => expect(screen.getByTestId('card')).toBeInTheDocument()) // Wait for content to render

    const container = screen.getByTestId('card').parentElement
    expect(container).toHaveAttribute('dir', 'rtl')

    expect(
      screen.getByRole('heading', { name: 'billing.payment_history' })
    ).toHaveClass('text-right')
  })

  it('shows error toast when attempting to download while not authenticated', async () => {
    // Re-mock useAuth for this specific test case
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      isInitialLoading: false, // Ensure this is also mocked
    } as any)

    renderWithClient(<BillingHistoryPage />)
    await waitFor(() =>
      // If !isAuthenticated, query is disabled -> paymentData is undefined -> returns EmptyPaymentState
      expect(screen.getByText('billing.no_payments_found')).toBeInTheDocument()
    )
  })

  it('revokes the object URL after download', async () => {
    renderWithClient(<BillingHistoryPage />)
    await waitFor(() =>
      expect(screen.getByText('billing.download_invoice')).toBeInTheDocument()
    )

    const downloadButton = screen.getByRole('button', {
      name: 'billing.download_invoice',
    })
    fireEvent.click(downloadButton)

    await waitFor(() => expect(window.URL.revokeObjectURL).toHaveBeenCalled())
  })
})
