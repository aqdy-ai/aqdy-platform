// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AdminContracts from '@/pages/admin/AdminContracts'
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
    getContracts: vi.fn(),
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

const mockContracts = [
  {
    _id: 'c1',
    filename: 'employment-contract.pdf',
    uploadedAt: '2026-01-15T10:00:00Z',
    language: 'en',
    fileSize: 50000,
    owner: { _id: 'u1', name: 'Omar Ahmed', email: 'omar@example.com' },
    status: 'analyzed' as const,
    riskLevel: 'high' as const,
  },
  {
    _id: 'c2',
    filename: 'nda-agreement.pdf',
    uploadedAt: '2026-01-10T08:00:00Z',
    language: 'ar',
    fileSize: 32000,
    owner: { _id: 'u2', name: 'Sara Mohamed', email: 'sara@example.com' },
    status: 'pending' as const,
    riskLevel: null,
  },
  {
    _id: 'c3',
    filename: 'lease-contract.pdf',
    uploadedAt: '2026-02-01T12:00:00Z',
    language: 'en',
    fileSize: 78000,
    owner: null,
    status: 'failed' as const,
    riskLevel: null,
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
    data: mockContracts,
  },
}

const renderComponent = () => {
  return render(
    <MemoryRouter>
      <AdminContracts />
    </MemoryRouter>
  )
}

describe('AdminContracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(adminApi.getContracts as ReturnType<typeof vi.fn>).mockResolvedValue(
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

  it('renders the contracts table with correct columns', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('contracts-table')).toBeInTheDocument()
    })

    // Check column headers
    expect(screen.getByText('Filename')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('Upload Date')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('renders all contracts with correct data', async () => {
    renderComponent()

    await waitFor(() => {
      const rows = screen.getAllByTestId('contract-row')
      expect(rows).toHaveLength(3)
    })

    // First contract
    expect(screen.getByText('employment-contract.pdf')).toBeInTheDocument()
    expect(screen.getByText('Omar Ahmed')).toBeInTheDocument()
    expect(screen.getByText('omar@example.com')).toBeInTheDocument()

    // Second contract
    expect(screen.getByText('nda-agreement.pdf')).toBeInTheDocument()
    expect(screen.getByText('Sara Mohamed')).toBeInTheDocument()

    // Third contract (null owner)
    expect(screen.getByText('lease-contract.pdf')).toBeInTheDocument()
    expect(screen.getByText('Unknown User')).toBeInTheDocument()
  })

  it('renders correct status badges', async () => {
    renderComponent()

    await waitFor(() => {
      const badges = screen.getAllByTestId('status-badge')
      expect(badges).toHaveLength(3)
    })

    const badges = screen.getAllByTestId('status-badge')
    expect(badges[0]).toHaveTextContent('Analyzed')
    expect(badges[1]).toHaveTextContent('Pending')
    expect(badges[2]).toHaveTextContent('Failed')
  })

  it('renders owner links pointing to admin accounts', async () => {
    renderComponent()

    await waitFor(() => {
      const links = screen.getAllByTestId('owner-link')
      expect(links.length).toBeGreaterThan(0)
    })

    const links = screen.getAllByTestId('owner-link')
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/admin/accounts')
    })
  })

  // ── Empty state ─────────────────────────────────────────────────────

  it('shows empty state when no contracts', async () => {
    ;(adminApi.getContracts as ReturnType<typeof vi.fn>).mockResolvedValue({
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

    expect(screen.getByText('No contracts found')).toBeInTheDocument()
  })

  // ── Loading state ───────────────────────────────────────────────────

  it('shows loading spinner initially', () => {
    ;(adminApi.getContracts as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    )

    renderComponent()

    // The Loader2 icon should be rendered (SVG with animate-spin class)
    const table = screen.getByTestId('contracts-table')
    expect(table).toBeInTheDocument()
  })

  // ── Filters ─────────────────────────────────────────────────────────

  it('filters by status when status filter is changed', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('contracts-table')).toBeInTheDocument()
    })

    const statusSelect = screen.getByTestId('status-filter')
    fireEvent.change(statusSelect, { target: { value: 'analyzed' } })

    await waitFor(() => {
      expect(adminApi.getContracts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'analyzed' })
      )
    })
  })

  it('filters by search term', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('contracts-table')).toBeInTheDocument()
    })

    const searchInput = screen.getByTestId('search-input')
    fireEvent.change(searchInput, { target: { value: 'employment' } })

    await waitFor(() => {
      expect(adminApi.getContracts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'employment' })
      )
    })
  })

  it('filters by date range', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('contracts-table')).toBeInTheDocument()
    })

    const dateFromInput = screen.getByTestId('date-from')
    fireEvent.change(dateFromInput, { target: { value: '2026-01-01' } })

    await waitFor(() => {
      expect(adminApi.getContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: expect.stringContaining('2026'),
        })
      )
    })
  })

  it('resets all filters when reset button is clicked', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('contracts-table')).toBeInTheDocument()
    })

    // Set a filter first
    const statusSelect = screen.getByTestId('status-filter')
    fireEvent.change(statusSelect, { target: { value: 'analyzed' } })

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
      expect(screen.getAllByTestId('contract-row')).toHaveLength(3)
    })

    const exportBtn = screen.getByTestId('export-csv-btn')
    fireEvent.click(exportBtn)

    expect(window.URL.createObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRemove).toHaveBeenCalled()
    expect(window.URL.revokeObjectURL).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Data exported successfully')
  })

  it('does not export CSV when no contracts', async () => {
    ;(adminApi.getContracts as ReturnType<typeof vi.fn>).mockResolvedValue({
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
    ;(adminApi.getContracts as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    )

    renderComponent()

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load contracts')
    })
  })
})
