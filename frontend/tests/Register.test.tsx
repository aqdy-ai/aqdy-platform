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

const { default: Register } = await import('../src/pages/Register')
const { useAuth } = await import('../src/hooks/useAuth')

describe('Register Page', () => {
  const mockRegister = vi.fn()
  const mockLoginWithGoogle = vi.fn()

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      register: mockRegister,
      loginWithGoogle: mockLoginWithGoogle,
      isLoading: false,
      forgotPassword: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
      user: null,
      isInitialLoading: false,
      getPasswordStrength: vi.fn((password: string) => ({
        hasMinLength: (password || '').length >= 8,
        hasUppercase: true,
        hasLowercase: true,
        hasNumber: true,
        hasSpecial: true,
        allValid: (password || '').length >= 8,
      })),
    })
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      register: mockRegister,
      isLoading: false,
      forgotPassword: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
      user: null,
      isInitialLoading: false,
      getPasswordStrength: vi.fn((password: string) => ({
        hasMinLength: (password || '').length >= 8,
        hasUppercase: true,
        hasLowercase: true,
        hasNumber: true,
        hasSpecial: true,
        allValid: (password || '').length >= 8,
      })),
    })
    // Use real schema behavior by default
  })

  const renderComponent = () =>
    render(
      <HelmetProvider>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </HelmetProvider>
    )

  it('should render registration form correctly', () => {
    renderComponent()
    expect(screen.getByText(/auth.nameLabel/i)).toBeInTheDocument()
    expect(screen.getByText(/auth.emailLabel/i)).toBeInTheDocument()
    expect(screen.getByText(/auth.passwordLabel/i)).toBeInTheDocument()
    expect(screen.getByText(/auth.confirmPasswordLabel/i)).toBeInTheDocument()
  })

  it('should show validation errors from Zod schema', async () => {
    const { container } = renderComponent()
    const form = container.querySelector('form') as HTMLFormElement
    if (form) form.noValidate = true

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getAllByRole('textbox')[1], {
      target: { value: 'bad-email' },
    })
    const passwordInputs = screen.getAllByPlaceholderText('••••••••')
    fireEvent.change(passwordInputs[0], {
      target: { value: 'Password123!' },
    })
    fireEvent.change(passwordInputs[1], {
      target: { value: 'Password123!' },
    })

    const submitButton = screen.getByRole('button', {
      name: /auth.registerAction/i,
    })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('auth.errors.invalidEmail')
    })
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('should call register function when validation passes', async () => {
    renderComponent()

    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }

    const textboxes = screen.getAllByRole('textbox')
    const nameInput = textboxes[0]
    const emailInput = textboxes[1]

    fireEvent.change(nameInput, { target: { value: validData.name } })
    fireEvent.change(emailInput, { target: { value: validData.email } })

    const passwordInputs = screen.getAllByPlaceholderText('••••••••')
    fireEvent.change(passwordInputs[0], {
      target: { value: validData.password },
    })
    fireEvent.change(passwordInputs[1], {
      target: { value: validData.confirmPassword },
    })

    const submitButton = screen.getByRole('button', {
      name: /auth.registerAction/i,
    })
    fireEvent.click(submitButton)

    expect(mockRegister).toHaveBeenCalledWith(validData)
  })

  it('should show loading state on register button', () => {
    vi.mocked(useAuth).mockReturnValue({
      register: vi.fn(),
      isLoading: true,
      forgotPassword: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
      user: null,
      isInitialLoading: false,
      getPasswordStrength: vi.fn((password: string) => ({
        hasMinLength: (password || '').length >= 8,
        hasUppercase: true,
        hasLowercase: true,
        hasNumber: true,
        hasSpecial: true,
        allValid: (password || '').length >= 8,
      })),
    })

    renderComponent()
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent(/common.loading/i)
  })

  it('should display error if passwords do not match', async () => {
    renderComponent()

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getAllByRole('textbox')[1], {
      target: { value: 'john@example.com' },
    })
    const passwordInputs = screen.getAllByPlaceholderText('••••••••')
    const passwordInput = passwordInputs[0]
    const confirmInput = passwordInputs[1]
    const submitButton = screen.getByRole('button', {
      name: /auth.registerAction/i,
    })

    fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
    fireEvent.change(confirmInput, { target: { value: 'Different123!' } })

    fireEvent.click(submitButton)

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('passwordsMismatch')
    )
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('should load Google sign-in script', () => {
    renderComponent()

    const script = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    )

    expect(script).toBeInTheDocument()
  })

  it('should render Google sign in container', () => {
    renderComponent()

    expect(
      document.getElementById('google-signin-btn')
    ).toBeInTheDocument()
  })

  it('should call loginWithGoogle when Google credential is received', async () => {
    const mockLoginWithGoogle = vi.fn()

    vi.mocked(useAuth).mockReturnValue({
      register: mockRegister,
      loginWithGoogle: mockLoginWithGoogle,
      isLoading: false,
      forgotPassword: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
      user: null,
      isInitialLoading: false,
      getPasswordStrength: vi.fn(() => ({
        hasMinLength: true,
        hasUppercase: true,
        hasLowercase: true,
        hasNumber: true,
        hasSpecial: true,
        allValid: true,
      })),
    })

    let callback: any

    ;(window as any).google = {
      accounts: {
        id: {
          initialize: vi.fn((options) => {
            callback = options.callback
          }),
          renderButton: vi.fn(),
        },
      },
    }

    renderComponent()

    await callback({
      credential: 'google-token'
    })

    expect(mockLoginWithGoogle).toHaveBeenCalledWith(
      'google-token'
    )
  })

  it('should initialize Google sign in', () => {
    const initialize = vi.fn()
    const renderButton = vi.fn()

    ;(window as any).google = {
      accounts: {
        id: {
          initialize,
          renderButton,
        },
      },
    }

    renderComponent()

    expect(initialize).toHaveBeenCalled()
    expect(renderButton).toHaveBeenCalled()
  })
})
