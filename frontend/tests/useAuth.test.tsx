import React, { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthContext } from '../src/hooks/context/AuthContext'
import { useAuth } from '../src/hooks/useAuth'
import { authApi } from '../src/services/authApi'
import { toast } from 'sonner'
import { AxiosError } from 'axios'

const mockNavigate = vi.fn()
const mockSetUser = vi.fn()

vi.mock('../src/services/authApi', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
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

  it('should show forgot password toast', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    act(() => {
      result.current.forgotPassword()
    })

    expect(toast.success).toHaveBeenCalledWith('auth.forgotPasswordSuccess')
  })

  it('should reject invalid registration data', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.register({
        name: 'ab',
        email: 'bad-email',
        password: '123',
        confirmPassword: '123',
      } as any)
    })

    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('should reject invalid login data', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper,
    })

    await act(async () => {
      await result.current.login({
        email: 'bad-email',
        password: '123',
      })
    })

    expect(authApi.login).not.toHaveBeenCalled()
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
})

