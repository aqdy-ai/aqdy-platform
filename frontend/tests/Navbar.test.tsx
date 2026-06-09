// tests/Navbar.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Navbar from '@/components/layout/Navbar'

// ─── Shared mock state (mutated per test) ───────────────────────────────────
const mockLogout = vi.fn()
let mockIsAuthenticated = false
let mockUser: { name: string; email: string } | null = null

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    isInitialLoading: false,
    user: mockUser,
    logout: mockLogout,
  }),
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

// Stub SubscriptionBadge to keep tests focused
vi.mock('@/components/SubscriptionBadge', () => ({
  default: () => null,
}))

// Stub LanguageSwitcher similarly
vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => null,
}))

// ─── Helper: renders Navbar inside a MemoryRouter ────────────────────────────
const renderNavbar = (initialPath = '/') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Navbar />
    </MemoryRouter>
  )

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Navbar — Authentication States', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthenticated = false
    mockUser = null
  })

  // ── Guest (unauthenticated) ──────────────────────────────────────────────
  describe('Guest (not authenticated)', () => {
    it('should render the Login link pointing to /login', () => {
      renderNavbar()

      const loginLink = screen.getByRole('link', { name: /nav\.login/i })
      expect(loginLink).toBeDefined()
      expect(loginLink.getAttribute('href')).toBe('/login')
    })

    it('should NOT show the user icon (profile dropdown button)', () => {
      renderNavbar()

      // The user menu button has aria-label nav.settings when authenticated
      const userButton = screen.queryByRole('button', {
        name: /nav\.settings/i,
      })
      expect(userButton).toBeNull()
    })

    it('should NOT render any dropdown menu when unauthenticated', () => {
      renderNavbar()

      const menu = screen.queryByRole('menu')
      expect(menu).toBeNull()
    })

    it('should render nav links for Home and Pricing', () => {
      renderNavbar()

      expect(
        screen.getAllByRole('link', { name: /nav\.home/i }).length
      ).toBeGreaterThan(0)
      expect(screen.getByRole('link', { name: /nav\.pricing/i })).toBeDefined()
    })
  })

  // ── Authenticated ────────────────────────────────────────────────────────
  describe('Authenticated user', () => {
    beforeEach(() => {
      mockIsAuthenticated = true
      mockUser = { name: 'Ahmed Ali', email: 'ahmed@test.com' }
    })

    it('should NOT show the Login link', () => {
      renderNavbar()

      const loginLink = screen.queryByRole('link', { name: /nav\.login/i })
      expect(loginLink).toBeNull()
    })

    it('should render the user icon button', () => {
      renderNavbar()

      const userButton = screen.getByRole('button', { name: /nav\.settings/i })
      expect(userButton).toBeDefined()
    })

    it('dropdown should be hidden initially (collapsed)', () => {
      renderNavbar()

      // menu role appears only after dropdown opens
      const menu = screen.queryByRole('menu')
      expect(menu).toBeNull()
    })

    it('should open dropdown when the user icon is clicked', async () => {
      renderNavbar()

      const userButton = screen.getByRole('button', { name: /nav\.settings/i })
      fireEvent.click(userButton)

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeDefined()
      })
    })

    it('should display Account Settings and Logout in the dropdown', async () => {
      renderNavbar()

      fireEvent.click(screen.getByRole('button', { name: /nav\.settings/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('menuitem', { name: /nav\.settings/i })
        ).toBeDefined()
        expect(
          screen.getByRole('menuitem', { name: /nav\.logout/i })
        ).toBeDefined()
      })
    })

    it('should show the Account Settings link pointing to /account-settings', async () => {
      renderNavbar()

      fireEvent.click(screen.getByRole('button', { name: /nav\.settings/i }))

      await waitFor(() => {
        const settingsLink = screen.getByRole('menuitem', {
          name: /nav\.settings/i,
        })
        expect(settingsLink.getAttribute('href')).toBe('/account-settings')
      })
    })

    it('should call logout() when the Logout button is clicked', async () => {
      renderNavbar()

      fireEvent.click(screen.getByRole('button', { name: /nav\.settings/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('menuitem', { name: /nav\.logout/i })
        ).toBeDefined()
      })

      fireEvent.click(screen.getByRole('menuitem', { name: /nav\.logout/i }))

      expect(mockLogout).toHaveBeenCalledTimes(1)
    })

    it('should close dropdown after clicking Logout', async () => {
      renderNavbar()

      fireEvent.click(screen.getByRole('button', { name: /nav\.settings/i }))

      await waitFor(() => screen.getByRole('menu'))

      fireEvent.click(screen.getByRole('menuitem', { name: /nav\.logout/i }))

      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBeNull()
      })
    })

    it('should close dropdown after clicking Account Settings', async () => {
      renderNavbar()

      fireEvent.click(screen.getByRole('button', { name: /nav\.settings/i }))

      await waitFor(() => screen.getByRole('menu'))

      fireEvent.click(screen.getByRole('menuitem', { name: /nav\.settings/i }))

      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBeNull()
      })
    })

    it('should display the user name inside the dropdown', async () => {
      renderNavbar()

      fireEvent.click(screen.getByRole('button', { name: /nav\.settings/i }))

      await waitFor(() => {
        expect(screen.getByText('Ahmed Ali')).toBeDefined()
      })
    })

    it('should toggle dropdown closed when icon is clicked again', async () => {
      renderNavbar()

      const userButton = screen.getByRole('button', { name: /nav\.settings/i })

      // open
      fireEvent.click(userButton)
      await waitFor(() => screen.getByRole('menu'))

      // close
      fireEvent.click(userButton)
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBeNull()
      })
    })
  })
})
