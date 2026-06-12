import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Mock } from 'vitest'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { accountApi } from '../src/services/accountApi'
import AccountSettings, {
  validateAccountSettingsForm,
  type AccountSettingsForm,
} from '../src/pages/AccountSettings'

const mockedToast = toast as unknown as {
  success: Mock
  error: Mock
  info: Mock
}

const translations: Record<string, Record<string, string>> = {
  en: {
    'common.loading': 'Loading',
    'account.settingsTitle': 'Account Settings',
    'account.settingsDescription': 'Update your profile and subscription details.',
    'auth.nameLabel': 'Name',
    'auth.emailLabel': 'Email',
    'auth.namePlaceholder': 'John Doe',
    'auth.emailPlaceholder': 'name@example.com',
    'account.currentPasswordLabel': 'Current password',
    'account.newPasswordLabel': 'New password',
    'auth.confirmPasswordLabel': 'Confirm password',
    'auth.passwordPlaceholder': '••••••••',
    'account.saveChangesButton': 'Save changes',
    'account.planSectionTitle': 'Subscription Plan',
    'account.upgradeAction': 'Upgrade plan',
    'account.errorLoadingProfile': 'Unable to load your profile',
    'account.errorLoadingSubscription': 'Unable to load subscription details',
    'account.profileUpdatedSuccess': 'Profile updated successfully',
    'account.updateFailed': 'Update failed',
    'account.analysesUsageLabel': 'Analyses used',
    'account.analysesAllowedLabel': 'Analyses allowed',
    'account.renewalDateLabel': 'Renewal date',
    'account.statusLabel': 'Account status',
    'account.metadataTitle': 'Metadata',
    'account.memberSinceLabel': 'Member since',
    'account.upgradeNotAvailable': 'Upgrade not available',
    'credits.sectionTitle': 'Credits Balance',
    'credits.currentBalanceLabel': 'Current balance',
    'credits.planAllowanceLabel': 'Plan allowance',
    'credits.creditsRemaining': '{{count}} credits remaining ({{pct}}%)',
    'credits.stateHealthy': 'Healthy',
    'credits.ariaLabel': 'Credits balance widget',
    'credits.progressAriaLabel': 'Credit usage progress bar',
  },
  ar: {
    'common.loading': 'تحميل',
    'account.settingsTitle': 'إعدادات الحساب',
    'account.settingsDescription': 'قم بتحديث ملفك الشخصي وبيانات الاشتراك.',
    'auth.nameLabel': 'الاسم',
    'auth.emailLabel': 'البريد الإلكتروني',
    'auth.namePlaceholder': 'جون دو',
    'auth.emailPlaceholder': 'name@example.com',
    'account.currentPasswordLabel': 'كلمة المرور الحالية',
    'account.newPasswordLabel': 'كلمة المرور الجديدة',
    'auth.confirmPasswordLabel': 'تأكيد كلمة المرور',
    'auth.passwordPlaceholder': '••••••••',
    'account.saveChangesButton': 'حفظ التغييرات',
    'account.planSectionTitle': 'خطة الاشتراك',
    'account.upgradeAction': 'ترقية الخطة',
    'account.errorLoadingProfile': 'تعذر تحميل ملفك الشخصي',
    'account.errorLoadingSubscription': 'تعذر تحميل تفاصيل الاشتراك',
    'account.profileUpdatedSuccess': 'تم تحديث الملف الشخصي بنجاح',
    'account.updateFailed': 'فشل التحديث',
    'account.analysesUsageLabel': 'التحليلات المستخدمة',
    'account.analysesAllowedLabel': 'التحليلات المسموح بها',
    'account.renewalDateLabel': 'تاريخ التجديد',
    'account.statusLabel': 'حالة الحساب',
    'account.metadataTitle': 'البيانات',
    'account.memberSinceLabel': 'عضو منذ',
    'account.upgradeNotAvailable': 'الترقية غير متاحة',
  },
}

let currentTestLanguage = 'en'

vi.mock('../src/services/accountApi', () => ({
  accountApi: {
    getProfile: vi.fn(),
    getSubscription: vi.fn(),
    getCredits: vi.fn(),
    updateProfile: vi.fn(),
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[currentTestLanguage]?.[key] ?? key,
    i18n: {
      get language() {
        return currentTestLanguage
      },
    },
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  })

const renderWithProviders = (ui: ReactNode) => {
  const queryClient = createQueryClient()
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  )
}

// Helper function to create mock Axios response
const createMockResponse = (data: any) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
})

// Mock data with correct AxiosResponse structure
const profileResponse = createMockResponse({
  data: {
    id: 'user-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    status: 'active',
    memberSince: '2024-01-15T00:00:00.000Z',
  },
})

const subscriptionData = {
  planName: 'Free',
  analysesUsed: 3,
  analysesAllowed: 10,
  renewalDate: '2024-12-31T00:00:00.000Z',
}

const creditsData = {
  balance: 7,
  planAllowance: 10,
  ledger: [],
}

describe('AccountSettings page', () => {
  beforeEach(() => {
    currentTestLanguage = 'en'
    mockedToast.success.mockClear()
    mockedToast.error.mockClear()
    mockedToast.info.mockClear()
    vi.clearAllMocks()
    vi.mocked(accountApi.getProfile).mockReset()
    vi.mocked(accountApi.getSubscription).mockReset()
    vi.mocked(accountApi.getCredits).mockReset()
    vi.mocked(accountApi.updateProfile).mockReset()
    vi.mocked(accountApi.getCredits).mockResolvedValue(creditsData)
  })

  it('should validate account settings form fields', () => {
    const emptyForm: AccountSettingsForm = {
      name: '',
      email: 'bad-email',
      currentPassword: '',
      newPassword: 'short',
      confirmPassword: 'mismatch',
    }

    const result = validateAccountSettingsForm(emptyForm)
    expect(result.valid).toBe(false)
    expect(result.errors.email).toBe('auth.errors.invalidEmail')
    expect(result.errors.name).toBe('auth.errors.nameTooShort')
    expect(result.errors.newPassword).toBe('account.errors.passwordTooShort')
    expect(result.errors.confirmPassword).toBe('auth.errors.passwordsMismatch')
  })

  it('should render loading state on initial fetch', async () => {
    vi.mocked(accountApi.getProfile).mockResolvedValue(profileResponse as any)
    vi.mocked(accountApi.getSubscription).mockResolvedValue(subscriptionData as any)

    renderWithProviders(<AccountSettings />)
    expect(screen.getByText('Loading')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Account Settings' })).toBeInTheDocument()
    })
  })

  it('should render bilingual layout for English and Arabic modes', async () => {
    vi.mocked(accountApi.getProfile).mockResolvedValue(profileResponse as any)
    vi.mocked(accountApi.getSubscription).mockResolvedValue(subscriptionData as any)

    currentTestLanguage = 'ar'
    renderWithProviders(<AccountSettings />)

    await screen.findByLabelText('الاسم')
    expect(screen.getByLabelText('الاسم')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'إعدادات الحساب' })).toBeInTheDocument()
    expect(document.querySelector('div[dir="rtl"]')).toBeInTheDocument()

    cleanup()
    currentTestLanguage = 'en'
    renderWithProviders(<AccountSettings />)
    await screen.findByLabelText('Name')
    expect(screen.getByRole('heading', { name: 'Account Settings' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('should display profile and subscription data after successful fetch', async () => {
    vi.mocked(accountApi.getProfile).mockResolvedValue(profileResponse as any)
    vi.mocked(accountApi.getSubscription).mockResolvedValue(subscriptionData as any)

    renderWithProviders(<AccountSettings />)

    await waitFor(() => {
      expect(screen.queryByText('Loading')).not.toBeInTheDocument()
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Upgrade plan' })).toBeInTheDocument()
  })

  it('should handle form submission and show success toast', async () => {
    vi.mocked(accountApi.getProfile).mockResolvedValue(profileResponse as any)
    vi.mocked(accountApi.getSubscription).mockResolvedValue(subscriptionData as any)
    
    vi.mocked(accountApi.updateProfile).mockResolvedValue({
      data: {
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: 'user-1',
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          status: 'active',
          memberSince: '2024-01-15T00:00:00.000Z',
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    } as any)

    renderWithProviders(<AccountSettings />)

    await waitFor(() => {
      expect(screen.queryByText('Loading')).not.toBeInTheDocument()
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    }, { timeout: 3000 })

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane.doe@example.com' } })
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'CurrentPass123' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'NewPassword123' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'NewPassword123' } })


    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(mockedToast.success).toHaveBeenCalledWith(
        translations.en['account.profileUpdatedSuccess']
      )
    }, { timeout: 3000 })
  })

  it('should render an error message when profile fetch fails', async () => {
    vi.mocked(accountApi.getProfile).mockRejectedValue(new Error('Fail'))
    vi.mocked(accountApi.getSubscription).mockResolvedValue(subscriptionData as any)

    renderWithProviders(<AccountSettings />)

    await screen.findByText('Unable to load your profile')
    expect(screen.getByText('Unable to load your profile')).toBeInTheDocument()
  })
})