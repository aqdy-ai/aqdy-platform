import React, { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthContext } from '../src/hooks/context/AuthContext'
import { useAuth } from '../src/hooks/useAuth'
import { authApi } from '../src/services/authApi'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { registerSchema, loginSchema } from '../src/hooks/useAuth'

const mockNavigate = vi.fn()
const mockSetUser = vi.fn()

vi.mock('../src/services/authApi', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    logout: vi.fn(),
  },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

const wrapper = ({ children }: { children: ReactNode }) => {
  return (
    <AuthContext.Provider
      value={{
        user: null,
        setUser: mockSetUser,
        isAuthenticated: false,
        isInitialLoading: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(authApi.forgotPassword).mockResolvedValue({} as any)
    vi.mocked(authApi.logout).mockResolvedValue({} as any)
    vi.mocked(authApi.resetPassword).mockResolvedValue({} as any)
    vi.mocked(authApi.loginWithGoogle).mockResolvedValue({} as any)
  })

  it('should login successfully', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: {
            id: '1',
            name: 'John',
            email: 'john@test.com',
            role: 'user',
          },
        },
      },
    } as any)

    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.login({
        email: 'john@test.com',
        password: 'Password123!',
      })
    })

    expect(authApi.login).toHaveBeenCalled()
    expect(mockSetUser).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    expect(toast.success).toHaveBeenCalledWith('auth.loginSuccess')
  })

  it('should show invalid credentials error', async () => {
    const error = new AxiosError('Unauthorized', '401', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as any,
      data: {},
    })

    vi.mocked(authApi.login).mockRejectedValueOnce(error)

    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.login({
        email: 'wrong@test.com',
        password: 'Password123!',
      })
    })

    expect(toast.error).toHaveBeenCalled()
  })

  it('should register successfully', async () => {
    vi.mocked(authApi.register).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: {
            id: '1',
            name: 'John',
            email: 'john@test.com',
            role: 'user',
          },
        },
      },
    } as any)

    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.register({
        name: 'John Doe',
        email: 'john@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      })
    })

    expect(authApi.register).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@test.com',
      password: 'Password123!',
    })

    expect(toast.success).toHaveBeenCalledWith('auth.registerSuccess')
  })

  it('should show email already exists error', async () => {
    const error = new AxiosError('Conflict', '409', undefined, undefined, {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: {} as any,
      data: {},
    })

    vi.mocked(authApi.register).mockRejectedValueOnce(error)

    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.register({
        name: 'John',
        email: 'existing@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      })
    })

    expect(toast.error).toHaveBeenCalled()
  })

  it('should show forgot password toast', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.forgotPassword('john@test.com')
    })

    expect(toast.success).toHaveBeenCalledWith('auth.forgotPasswordSuccess')
  })


  it('should reject invalid registration data', () => {
    const result = registerSchema.safeParse({
      name: 'ab',
      email: 'bad-email',
      password: '123',
      confirmPassword: '123',
    })

    expect(result.success).toBe(false)
  })

  it('should reject invalid login data', () => {
    const result = loginSchema.safeParse({
      email: 'bad-email',
      password: '123',
    })

    expect(result.success).toBe(false)
  })

  it('should redirect admin to /admin on login', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: {
            id: '1',
            name: 'Admin User',
            email: 'admin@test.com',
            role: 'admin',
          },
        },
      },
    } as any)

    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.login({
        email: 'admin@test.com',
        password: 'Password123!',
      })
    })

    expect(authApi.login).toHaveBeenCalled()
    expect(mockSetUser).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true })
  })

  it('should redirect admin to /admin on register', async () => {
    vi.mocked(authApi.register).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: {
            id: '1',
            name: 'Admin User',
            email: 'admin@test.com',
            role: 'admin',
          },
        },
      },
    } as any)

    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.register({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      })
    })

    expect(authApi.register).toHaveBeenCalled()
    expect(mockSetUser).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true })
  })

  it('should login with Google successfully', async () => {
    vi.mocked(authApi.loginWithGoogle).mockResolvedValueOnce({
      data: {
        data: {
          user: {
            id: '1',
            name: 'Google User',
            email: 'google@test.com',
            role: 'user',
          },
        },
      },
    } as any)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.loginWithGoogle('google-token')
    })

    expect(authApi.loginWithGoogle).toHaveBeenCalledWith(
      'google-token'
    )

    expect(mockSetUser).toHaveBeenCalled()

    expect(mockNavigate).toHaveBeenCalledWith('/', {
      replace: true,
    })

    expect(toast.success).toHaveBeenCalledWith(
      'auth.loginSuccess'
    )
  })

  it('should redirect admin after Google login', async () => {
    vi.mocked(authApi.loginWithGoogle).mockResolvedValueOnce({
      data: {
        data: {
          user: {
            role: 'admin',
          },
        },
      },
    } as any)

    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.loginWithGoogle('token')
    })

    expect(mockNavigate).toHaveBeenCalledWith(
      '/admin',
      { replace: true }
    )
  })

  it('should send forgot password email', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValueOnce({} as any)

    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.forgotPassword(
        'john@test.com'
      )
    })

    expect(authApi.forgotPassword).toHaveBeenCalledWith(
      'john@test.com'
    )

    expect(toast.success).toHaveBeenCalledWith(
      'auth.forgotPasswordSuccess'
    )
  })

  it('should show oauthOnly error', async () => {
    const error = new AxiosError(
      '',
      '',
      undefined,
      undefined,
      {
        status: 400,
        statusText: '',
        headers: {},
        config: {} as any,
        data: {
          error: 'OAuth account detected',
        },
      }
    )

    vi.mocked(authApi.forgotPassword)
      .mockRejectedValueOnce(error)

    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.forgotPassword(
        'google@test.com'
      )
    })

    expect(toast.error).toHaveBeenCalledWith(
      'auth.errors.oauthOnly'
    )

    expect(mockNavigate).toHaveBeenCalledWith(
      '/login'
    )
  })

  it('should reset password successfully', async () => {
    vi.mocked(authApi.resetPassword)
      .mockResolvedValueOnce({} as any)

    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.resetPassword(
        'token',
        'Password123!'
      )
    })

    expect(authApi.resetPassword).toHaveBeenCalledWith(
      'token',
      'Password123!'
    )

    expect(toast.success).toHaveBeenCalledWith(
      'auth.passwordResetSuccess'
    )

    expect(mockNavigate).toHaveBeenCalledWith(
      '/login'
    )
  })

  it('should logout successfully', async () => {
    vi.mocked(authApi.logout)
      .mockResolvedValueOnce({} as any)

    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(authApi.logout).toHaveBeenCalled()

    expect(mockSetUser).toHaveBeenCalledWith(null)

    expect(mockNavigate).toHaveBeenCalledWith(
      '/login'
    )
  })
})

