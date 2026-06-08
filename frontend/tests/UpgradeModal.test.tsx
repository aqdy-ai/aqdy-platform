import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import { UpgradeModal } from '@/components/UpgradeModal'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'

// 1. تعريف الـ Mocks للـ Navigation والـ Location
const mockNavigate = vi.fn()
let mockSearch = ''

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      search: mockSearch,
      pathname: '/',
      hash: '',
      state: null,
      key: 'default',
    }),
  }
})

describe('UpgradeModal', () => {
  const onOpenChange = vi.fn()
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    mockSearch = ''

    // إعداد الـ window.location بشكل آمن ونظيف
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        href: '',
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  test('renders plan comparison table with correct credits', () => {
    render(
      <MemoryRouter>
        <UpgradeModal open={true} onOpenChange={onOpenChange} />
      </MemoryRouter>
    )

    // Using getByText with a custom function since the text is split across elements
    expect(
      screen.getByText((_content, element) => {
        return (
          element?.textContent === '500 credits / month' ||
          element?.textContent === '500 رصيد / شهرياً'
        )
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText((_content, element) => {
        return (
          element?.textContent === '5,000 credits / month' ||
          element?.textContent === '5,000 رصيد / شهرياً'
        )
      })
    ).toBeInTheDocument()
    // For unlimited, the text is a single string
    expect(
      screen.getByText(/Unlimited credits|رصيد غير محدود/i)
    ).toBeInTheDocument()
  })

  test('clicking Upgrade to Pro triggers checkout redirect', async () => {
    const fakeUrl = 'https://checkout.stripe.com/pay/abc123'

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ url: fakeUrl }),
    } as Response)

    render(
      <MemoryRouter>
        <UpgradeModal open={true} onOpenChange={onOpenChange} />
      </MemoryRouter>
    )

    // Now it's a heading instead of a column header
    const proHeading = screen.getByRole('heading', {
      name: /Pro Developer|المحترفة/i,
    })
    expect(proHeading).toBeInTheDocument()

    // Find the upgrade button
    const upgradeButton = screen.getByRole('button', {
      name: /Upgrade to Pro|الترقية للمحترفين/i,
    })
    fireEvent.click(upgradeButton)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled()
    })
  })

  test('handles checkout cancel query param', () => {
    mockSearch = '?checkout_cancel=true'

    render(
      <MemoryRouter>
        <UpgradeModal open={true} onOpenChange={onOpenChange} />
      </MemoryRouter>
    )

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })
})
