import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { HelmetProvider } from 'react-helmet-async'

vi.mock('../src/hooks/useAuth', async () => {
  const actual = await vi.importActual('../src/hooks/useAuth')
  return { ...actual, useAuth: vi.fn() }
})

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

const { default: Login } = await import('../src/pages/Login')
const { useAuth } = await import('../src/hooks/useAuth')

describe('Login Page', () => {
  const mockLogin = vi.fn()
  const mockForgotPassword = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      forgotPassword: mockForgotPassword,
      isLoading: false,
      register: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
      user: null,
      isInitialLoading: false,
    })
    // default to successful validation unless overridden in a test
    // Remove the artificial safeParse default
    // vi.mocked(loginSchema.safeParse).mockReturnValue({
    //   success: true,
    //   data: {},
    // } as any)
  })

  const renderComponent = () =>
    render(
      <HelmetProvider>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </HelmetProvider>
    )

  it('should render login form correctly', () => {
    renderComponent()
    expect(screen.getByText(/auth.emailLabel/i)).toBeInTheDocument()
    expect(screen.getByText(/auth.passwordLabel/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /auth.loginAction/i })
    ).toBeInTheDocument()
  })

  it('should show validation errors when schema validation fails', async () => {
    const { container } = renderComponent()
    const form = container.querySelector('form') as HTMLFormElement
    if (form) form.noValidate = true

    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'bad-email' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Password123!' },
    })

    const submitButton = screen.getByRole('button', {
      name: /auth.loginAction/i,
    })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('auth.errors.invalidEmail')
    })
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('should call login function when validation passes', async () => {
    renderComponent()
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Password123!' },
    })

    const submitButton = screen.getByRole('button', {
      name: /auth.loginAction/i,
    })
    fireEvent.click(submitButton)

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    })
  })

  it('should call forgotPassword when the link is clicked', () => {
    renderComponent()
    const forgotBtn = screen.getByRole('link', {
      name: /auth.forgotPassword/i,
    })
    fireEvent.click(forgotBtn)
    expect(mockForgotPassword).toHaveBeenCalled()
  })
})
