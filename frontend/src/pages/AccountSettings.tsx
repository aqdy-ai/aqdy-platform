import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { accountApi } from '../services/accountApi'
import type { UpdateProfilePayload } from '../types/account'
import CreditsBadge from '../components/CreditsBadge'

export interface AccountSettingsForm {
  name: string
  email: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface AccountValidationResult {
  valid: boolean
  errors: Partial<Record<keyof AccountSettingsForm, string>>
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// eslint-disable-next-line react-refresh/only-export-components
export function validateAccountSettingsForm(
  formData: AccountSettingsForm
): AccountValidationResult {
  const errors: Partial<Record<keyof AccountSettingsForm, string>> = {}

  if (!formData.name.trim()) {
    errors.name = 'auth.errors.nameTooShort'
  }

  if (!emailPattern.test(formData.email.trim())) {
    errors.email = 'auth.errors.invalidEmail'
  }

  const passwordTouched =
    formData.currentPassword.trim() ||
    formData.newPassword.trim() ||
    formData.confirmPassword.trim()

  if (passwordTouched) {
    if (!formData.currentPassword.trim()) {
      errors.currentPassword = 'account.errors.currentPasswordRequired'
    }

    if (formData.newPassword.length > 0 && formData.newPassword.length < 8) {
      errors.newPassword = 'account.errors.passwordTooShort'
    }

    if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'auth.errors.passwordsMismatch'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

const badgeClassMap: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-rose-100 text-rose-700',
  pending: 'bg-amber-100 text-amber-700',
}

const getStatusBadgeClass = (status: string) =>
  badgeClassMap[status.toLowerCase()] || 'bg-slate-100 text-slate-700'

const formatDate = (value: string, locale: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function AccountSettings() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  const [formData, setFormData] = useState<AccountSettingsForm>({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const profileQuery = useQuery({
    queryKey: ['account-profile'],
    queryFn: async () => {
      const response = await accountApi.getProfile()
      return response.data.data
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  useEffect(() => {
    if (profileQuery.data) {
      Promise.resolve().then(() => {
        setFormData((prev) => ({
          ...prev,
          name: profileQuery.data.name ?? prev.name,
          email: profileQuery.data.email ?? prev.email,
        }))
      })
    }
  }, [profileQuery.data])

  const subscriptionQuery = useQuery({
    queryKey: ['account-subscription'],
    queryFn: async () => await accountApi.getSubscription(),
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const response = await accountApi.updateProfile(payload)
      return response.data.data
    },
    onSuccess: () => {
      toast.success(t('account.profileUpdatedSuccess'))
      profileQuery.refetch()
    },
    onError: () => {
      toast.error(t('account.updateFailed'))
    },
  })

  const isLoading = profileQuery.isLoading || subscriptionQuery.isLoading
  const hasError = profileQuery.isError || subscriptionQuery.isError

  const planDetails = subscriptionQuery.data

  const statusLabel = useMemo(() => {
    if (!profileQuery.data) return ''

    const statusKey = `account.status_${profileQuery.data.status}`
    const translatedStatus = t(statusKey)

    return translatedStatus === statusKey
      ? profileQuery.data.status
      : translatedStatus
  }, [profileQuery.data, t])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validateAccountSettingsForm(formData)

    if (!validation.valid) {
      Object.values(validation.errors).forEach((errorKey) => {
        if (errorKey) toast.error(t(errorKey))
      })
      return
    }

    const payload: UpdateProfilePayload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
    }

    if (formData.newPassword) {
      payload.currentPassword = formData.currentPassword
      payload.newPassword = formData.newPassword
    }

    mutation.mutate(payload)
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-[calc(100vh-80px)] py-10">
      <Helmet>
        <title>{t('account.settingsTitle')} | Aqdy</title>
      </Helmet>

      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-3">
          <p className="text-primary/80 text-sm font-semibold tracking-[0.25em] uppercase">
            {t('account.settingsTitle')}
          </p>
          <h1 className="text-foreground text-3xl font-extrabold tracking-tight">
            {t('account.settingsTitle')}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {t('account.settingsDescription')}
          </p>
        </div>

        {isLoading ? (
          <div className="border-border/70 bg-card text-muted-foreground rounded-3xl border p-10 text-center text-base font-semibold shadow-lg">
            {t('common.loading')}
          </div>
        ) : hasError ? (
          <div className="rounded-3xl border border-rose-300/80 bg-rose-50 p-10 text-center text-base font-semibold text-rose-700 shadow-lg">
            {profileQuery.isError
              ? t('account.errorLoadingProfile')
              : t('account.errorLoadingSubscription')}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <section className="border-border/70 bg-card rounded-3xl border p-6 shadow-xl">
              <div className="mb-6 flex flex-col gap-2">
                <h2 className="text-foreground text-xl font-bold">
                  {t('account.profileSectionTitle')}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {t('account.profileSectionDescription')}
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="account-name"
                      className="text-foreground mb-1 block text-start text-sm font-medium"
                    >
                      {t('auth.nameLabel')}
                    </label>
                    <input
                      id="account-name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="border-input bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-2xl border px-4 py-3 transition outline-none focus:ring-1"
                      placeholder={t('auth.namePlaceholder')}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="account-email"
                      className="text-foreground mb-1 block text-start text-sm font-medium"
                    >
                      {t('auth.emailLabel')}
                    </label>
                    <input
                      id="account-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="border-input bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-2xl border px-4 py-3 transition outline-none focus:ring-1"
                      placeholder={t('auth.emailPlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="account-current-password"
                      className="text-foreground mb-1 block text-start text-sm font-medium"
                    >
                      {t('account.currentPasswordLabel')}
                    </label>
                    <input
                      id="account-current-password"
                      name="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentPassword: e.target.value,
                        })
                      }
                      className="border-input bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-2xl border px-4 py-3 transition outline-none focus:ring-1"
                      placeholder={t('auth.passwordPlaceholder')}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="account-new-password"
                      className="text-foreground mb-1 block text-start text-sm font-medium"
                    >
                      {t('account.newPasswordLabel')}
                    </label>
                    <input
                      id="account-new-password"
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          newPassword: e.target.value,
                        })
                      }
                      className="border-input bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-2xl border px-4 py-3 transition outline-none focus:ring-1"
                      placeholder={t('auth.passwordPlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="account-confirm-password"
                    className="text-foreground mb-1 block text-start text-sm font-medium"
                  >
                    {t('auth.confirmPasswordLabel')}
                  </label>
                  <input
                    id="account-confirm-password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="border-input bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-2xl border px-4 py-3 transition outline-none focus:ring-1"
                    placeholder={t('auth.passwordPlaceholder')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={mutation.status === 'pending'}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full justify-center rounded-2xl px-4 py-3 text-sm font-bold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {mutation.status === 'pending'
                    ? t('common.loading')
                    : t('account.saveChangesButton')}
                </button>
              </form>
            </section>

            <aside className="space-y-6">
              <div className="border-border/70 bg-card rounded-3xl border p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm font-semibold tracking-[0.25em] uppercase">
                      {t('account.planSectionTitle')}
                    </p>
                    <h2 className="text-foreground text-2xl font-bold">
                      {planDetails?.planName ?? t('common.loading')}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      planDetails?.planName?.toLowerCase().includes('free')
                        ? 'bg-slate-100 text-slate-900'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {planDetails?.planName ?? '—'}
                  </span>
                </div>

                <div className="text-foreground/80 space-y-3 text-sm">
                  <div className="bg-background flex items-center justify-between rounded-2xl p-4">
                    <span>{t('account.analysesUsageLabel')}</span>
                    <span>
                      {planDetails?.analysesUsed ?? 0}/
                      {planDetails?.analysesAllowed ?? 0}
                    </span>
                  </div>
                  <div className="bg-background flex items-center justify-between rounded-2xl p-4">
                    <span>{t('account.analysesAllowedLabel')}</span>
                    <span>{planDetails?.analysesAllowed ?? 0}</span>
                  </div>
                  <div className="bg-background flex items-center justify-between rounded-2xl p-4">
                    <span>{t('account.renewalDateLabel')}</span>
                    <span>
                      {planDetails
                        ? formatDate(planDetails.renewalDate, i18n.language)
                        : '—'}
                    </span>
                  </div>
                </div>

                {planDetails?.planName?.toLowerCase().includes('free') && (
                  <button
                    type="button"
                    onClick={() => toast.info(t('account.upgradeNotAvailable'))}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition"
                  >
                    {t('account.upgradeAction')}
                  </button>
                )}
              </div>

              {/* Credits Balance Widget */}
              <CreditsBadge variant="expanded" />

              <div className="border-border/70 bg-card rounded-3xl border p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm font-semibold tracking-[0.25em] uppercase">
                      {t('account.metadataTitle')}
                    </p>
                    <h2 className="text-foreground text-xl font-bold">
                      {t('account.statusLabel')}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(
                      profileQuery.data?.status ?? ''
                    )}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="text-foreground/80 space-y-3 text-sm">
                  <div className="bg-background rounded-2xl p-4">
                    <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
                      {t('account.memberSinceLabel')}
                    </p>
                    <p className="text-foreground mt-2 font-semibold">
                      {profileQuery.data
                        ? formatDate(
                            profileQuery.data.memberSince,
                            i18n.language
                          )
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
