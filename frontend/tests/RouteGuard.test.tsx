import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AdminRoute from '../src/components/AdminRoute'
import { useAuth } from '../src/hooks/useAuth'

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('AdminRoute (Route Guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow admin user to access children components', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', name: 'Admin User', email: 'admin@test.com', role: 'admin' },
      isInitialLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div data-testid="admin-content">Admin Dashboard Content</div>
              </AdminRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('admin-content')).toBeInTheDocument()
    expect(screen.getByText('Admin Dashboard Content')).toBeInTheDocument()
  })

  it('should redirect non-admin (regular user) to /login or home', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { id: '2', name: 'Regular User', email: 'user@test.com', role: 'user' },
      isInitialLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div data-testid="admin-content">Admin Dashboard Content</div>
              </AdminRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('should redirect unauthenticated user to /login', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      isInitialLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div data-testid="admin-content">Admin Dashboard Content</div>
              </AdminRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('should render loading state when isInitialLoading is true', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      isInitialLoading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div data-testid="admin-content">Admin Dashboard Content</div>
              </AdminRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
    expect(screen.getByText('جاري التحميل...')).toBeInTheDocument()
  })

  it('should allow super_admin to access route restricted to super_admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', name: 'Super Admin', email: 'super@test.com', role: 'super_admin' },
      isInitialLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/admin/roles']}>
        <Routes>
          <Route
            path="/admin/roles"
            element={
              <AdminRoute allowedRoles={['super_admin']}>
                <div data-testid="roles-content">Roles Content</div>
              </AdminRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('roles-content')).toBeInTheDocument()
  })

  it('should redirect support_admin from route restricted to super_admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { id: '2', name: 'Support Admin', email: 'support@test.com', role: 'support_admin' },
      isInitialLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/admin/roles']}>
        <Routes>
          <Route
            path="/admin/roles"
            element={
              <AdminRoute allowedRoles={['super_admin']}>
                <div data-testid="roles-content">Roles Content</div>
              </AdminRoute>
            }
          />
          <Route path="/admin" element={<div data-testid="admin-home">Admin Home</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByTestId('roles-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('admin-home')).toBeInTheDocument()
  })
})

