// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AdminPayments from '@/pages/admin/AdminPayments'
import { adminApi } from '@/services/adminApi'
import { toast } from 'sonner'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => key,
    i18n: { language: 'en', dir: () => 'ltr' },
  })),
}))

// Mock adminApi
vi.mock('@/services/adminApi', () => ({
  adminApi: {
    getPayments: vi.fn(),
  },
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock URL methods for CSV export
const originalCreateObjectURL = window.URL.createObjectURL
const originalRevokeObjectURL = window.URL.revokeObjectURL

const mockPayments = [
  {
    _id: 'p1',
    userId: {
      _id: 'u1',
      name: 'Omar Ahmed',
      email: 'omar@example.com',
      planSlug: 'premium',
      status: 'active',
    },
    amount: 99.99,
    currency: 'USD',
    status: 'succeeded',
    planSlug: 'premium',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    _id: 'p2',
    userId: {
      _id: 'u2',
      name: 'Sara Mohamed',
      email: 'sara@example.com',
      planSlug: 'enterprise',
      status: 'active',
    },
    amount: 199.99,
    currency: 'USD',
    status: 'pending',
    planSlug: 'enterprise',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    _id: 'p3',
    userId: null,
    amount: 49.99,
    currency: 'EGP',
    status: 'failed',
    planSlug: 'free',
    createdAt: '2026-02-01T12:00:00Z',
  },
]

const mockResponse = {
  data: {
    success: true,
    pagination: {
      page: 1,
      pageSize: 15,
      total: 3,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    data: mockPayments,
  },
}

const renderComponent = () => {
  return render(
    <MemoryRouter>
      <AdminPayments />
    </MemoryRouter>
  )
}

describe('AdminPayments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(adminApi.getPayments as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse
    )
    window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock')
    window.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    cleanup()
    window.URL.createObjectURL = originalCreateObjectURL
    window.URL.revokeObjectURL = originalRevokeObjectURL
  })

  // ── Table rendering ─────────────────────────────────────────────────

  it('renders the payments table with correct columns', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('payments-table')).toBeInTheDocument()
    })

    // Check column headers
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('User')).toBeInTheDocument()
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Currency')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('renders all payments with correct data', async () => {
    renderComponent()

    await waitFor(() => {
      const rows = screen.getAllByTestId('payment-row')
      expect(rows).toHaveLength(3)
    })

    // First payment
    expect(screen.getByText('Omar Ahmed')).toBeInTheDocument()
    expect(screen.getByText('omar@example.com')).toBeInTheDocument()

    // Second payment
    expect(screen.getByText('Sara Mohamed')).toBeInTheDocument()
    expect(screen.getByText('sara@example.com')).toBeInTheDocument()

    // Third payment (null user)
    expect(screen.getByText('Unknown User')).toBeInTheDocument()
  })

  it('renders correct status badges', async () => {
    renderComponent()

    await waitFor(() => {
      const badges = screen.getAllByTestId('status-badge')
      expect(badges).toHaveLength(3)
    })

    const badges = screen.getAllByTestId('status-badge')
    expect(badges[0]).toHaveTextContent('Succeeded')
    expect(badges[1]).toHaveTextContent('Pending')
    expect(badges[2]).toHaveTextContent('Failed')
  })

  it('renders user links pointing to admin accounts', async () => {
    renderComponent()

    await waitFor(() => {
      const links = screen.getAllByTestId('user-link')
      expect(links.length).toBeGreaterThan(0)
    })

    const links = screen.getAllByTestId('user-link')
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/admin/accounts')
    })
  })

  it('renders payment amounts correctly', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getAllByTestId('payment-row')).toHaveLength(3)
    })

    expect(screen.getByText('99.99')).toBeInTheDocument()
    expect(screen.getByText('199.99')).toBeInTheDocument()
    expect(screen.getByText('49.99')).toBeInTheDocument()
  })

  it('renders currency labels correctly', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getAllByTestId('payment-row')).toHaveLength(3)
    })

    // USD appears twice, EGP once
    const usdLabels = screen.getAllByText('USD')
    expect(usdLabels.length).toBe(2)
    expect(screen.getByText('EGP')).toBeInTheDocument()
  })

  // ── Empty state ─────────────────────────────────────────────────────

  it('shows empty state when no payments', async () => {
    ;(adminApi.getPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        pagination: { page: 1, pageSize: 15, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        data: [],
      },
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('no-data')).toBeInTheDocument()
    })

    expect(screen.getByText('No payments found')).toBeInTheDocument()
  })

  // ── Filters ─────────────────────────────────────────────────────────

  it('filters by status when status filter is changed', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('payments-table')).toBeInTheDocument()
    })

    const statusSelect = screen.getByTestId('status-filter')
    fireEvent.change(statusSelect, { target: { value: 'succeeded' } })

    await waitFor(() => {
      expect(adminApi.getPayments).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'succeeded' })
      )
    })
  })

  it('filters by search term', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('payments-table')).toBeInTheDocument()
    })

    const searchInput = screen.getByTestId('search-input')
    fireEvent.change(searchInput, { target: { value: 'omar' } })

    await waitFor(() => {
      expect(adminApi.getPayments).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'omar' })
      )
    })
  })

  it('filters by date range', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('payments-table')).toBeInTheDocument()
    })

    const dateFromInput = screen.getByTestId('date-from')
    fireEvent.change(dateFromInput, { target: { value: '2026-01-01' } })

    await waitFor(() => {
      expect(adminApi.getPayments).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: expect.stringContaining('2026'),
        })
      )
    })
  })

  it('resets all filters when reset button is clicked', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('payments-table')).toBeInTheDocument()
    })

    // Set a filter first
    const statusSelect = screen.getByTestId('status-filter')
    fireEvent.change(statusSelect, { target: { value: 'succeeded' } })

    await waitFor(() => {
      expect(screen.getByTestId('reset-filters')).toBeInTheDocument()
    })

    // Reset
    fireEvent.click(screen.getByTestId('reset-filters'))

    await waitFor(() => {
      expect(statusSelect).toHaveValue('')
    })
  })

  // ── CSV Export ──────────────────────────────────────────────────────

  it('exports CSV with correct data on button click', async () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const originalCreateElement = document.createElement.bind(document)
    const mockClick = vi.fn()
    const mockRemove = vi.fn()

    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const el = originalCreateElement(tagName)
      if (tagName === 'a') {
        el.click = mockClick
        el.remove = mockRemove
      }
      return el
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getAllByTestId('payment-row')).toHaveLength(3)
    })

    const exportBtn = screen.getByTestId('export-csv-btn')
    fireEvent.click(exportBtn)

    expect(window.URL.createObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRemove).toHaveBeenCalled()
    expect(window.URL.revokeObjectURL).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Data exported successfully')
  })

  it('disables export button when no payments', async () => {
    ;(adminApi.getPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        pagination: { page: 1, pageSize: 15, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        data: [],
      },
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('no-data')).toBeInTheDocument()
    })

    const exportBtn = screen.getByTestId('export-csv-btn')
    expect(exportBtn).toBeDisabled()
  })

  // ── Error handling ──────────────────────────────────────────────────

  it('shows error toast when API fails', async () => {
    ;(adminApi.getPayments as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    )

    renderComponent()

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load payments')
    })
  })

  // ── Pagination ──────────────────────────────────────────────────────

  it('shows pagination when multiple pages exist', async () => {
    ;(adminApi.getPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        pagination: {
          page: 1,
          pageSize: 15,
          total: 30,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
        data: mockPayments,
      },
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument()
    })

    expect(screen.getByText('Previous')).toBeDisabled()
    expect(screen.getByText('Next')).not.toBeDisabled()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })

  it('navigates to next page on click', async () => {
    ;(adminApi.getPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        pagination: {
          page: 1,
          pageSize: 15,
          total: 30,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
        data: mockPayments,
      },
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Next'))

    await waitFor(() => {
      expect(adminApi.getPayments).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      )
    })
  })
})
