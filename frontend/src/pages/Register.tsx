import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { registerSchema } from '../hooks/useAuth'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { PasswordStrengthIndicator } from '../components/features/PasswordStrengthIndicator'
import { cn } from '../lib/utils'
import type { CredentialResponse } from '@react-oauth/google'
export default function Register() {
  const { t } = useTranslation()
  const { register, loginWithGoogle, isLoading, getPasswordStrength } =
    useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const passwordStrength = getPasswordStrength(formData.password)

  const validate = () => {
    const result = registerSchema.safeParse(formData)
    if (!result.success) {
      result.error.issues.forEach((issue) => toast.error(t(issue.message)))
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await register(formData)
  }

  useEffect(() => {
    const handleCredentialResponse = async (response: CredentialResponse) => {
      if (response.credential) {
        await loginWithGoogle(response.credential)
      }
    }

    const initializeGoogleSignIn = () => {
      if (window.google) {
        const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID
        window.google.accounts.id.initialize({
          client_id,
          callback: handleCredentialResponse,
        })
        const container = document.getElementById('google-signin-btn')
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: container.offsetWidth || 384,
            logo_alignment: 'left',
          })
        }
      }
    }

    let script = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    ) as HTMLScriptElement
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initializeGoogleSignIn
      document.body.appendChild(script)
    } else {
      initializeGoogleSignIn()
    }

    const handleResize = () => {
      initializeGoogleSignIn()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [loginWithGoogle])

  const inputClass =
    'relative block w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-primary focus:ring-1 sm:text-sm outline-none transition-all'
  const labelClass = 'block text-sm font-medium text-foreground mb-1 text-start'

  return (
    <div
      className={cn(
        'flex',
        'min-h-[80vh]',
        'flex-col',
        'items-center',
        'justify-center',
        'px-4',
        'py-12',
        'sm:px-6',
        'lg:px-8'
      )}
    >
      <Helmet>
        <title>{t('auth.registerTitle')} | Aqdy</title>
      </Helmet>

      <div
        className={cn(
          'bg-card',
          'border-border/50',
          'w-full',
          'max-w-md',
          'space-y-8',
          'rounded-3xl',
          'border',
          'p-8',
          'shadow-2xl'
        )}
      >
        <div className="text-center">
          <h2
            className={cn(
              'text-foreground',
              'text-3xl',
              'font-extrabold',
              'tracking-tight'
            )}
          >
            {t('auth.createAccount')}
          </h2>
          <p className={cn('text-muted-foreground', 'mt-2', 'text-sm')}>
            {t('auth.registerSubtitle')}
          </p>
        </div>

        <form className={cn('mt-8', 'space-y-5')} onSubmit={handleSubmit}>
          <div>
            <label className={labelClass}>{t('auth.nameLabel')}</label>
            <input
              type="text"
              name="name"
              required
              className={inputClass}
              placeholder={t('auth.namePlaceholder')}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass}>{t('auth.emailLabel')}</label>
            <input
              type="email"
              name="email"
              required
              className={inputClass}
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass}>{t('auth.passwordLabel')}</label>
            <input
              type="password"
              name="password"
              required
              className={inputClass}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
            <PasswordStrengthIndicator
              result={passwordStrength}
              password={formData.password}
            />
          </div>
          <div>
            <label className={labelClass}>
              {t('auth.confirmPasswordLabel')}
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              className={inputClass}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            data-testid="register-submit"
            disabled={isLoading || !passwordStrength.allValid}
            className={cn(
              'bg-primary',
              'text-primary-foreground',
              'hover:bg-primary/90',
              'mt-8',
              'flex',
              'w-full',
              'justify-center',
              'rounded-xl',
              'px-4',
              'py-3',
              'text-sm',
              'font-bold',
              'shadow-lg',
              'transition-all',
              'hover:cursor-pointer',
              'disabled:cursor-not-allowed',
              'disabled:opacity-50'
            )}
          >
            {isLoading ? t('common.loading') : t('auth.registerAction')}
          </button>
        </form>

        <div className={cn('relative', 'my-6')}>
          <div className={cn('absolute', 'inset-0', 'flex', 'items-center')}>
            <div className={cn('w-full', 'border-t', 'border-border/50')}></div>
          </div>
          <div
            className={cn(
              'relative',
              'flex',
              'justify-center',
              'text-xs',
              'uppercase'
            )}
          >
            <span className={cn('bg-card', 'px-2', 'text-muted-foreground')}>
              {t('auth.orContinueWith')}
            </span>
          </div>
        </div>

        <div
          id="google-signin-btn"
          className={cn('flex', 'justify-center', 'w-full', 'min-h-[44px]')}
        ></div>

        <p
          className={cn(
            'text-muted-foreground',
            'mt-6',
            'text-center',
            'text-sm'
          )}
        >
          {t('auth.haveAccount')}{' '}
          <Link
            to="/login"
            className={cn('text-primary', 'font-bold', 'hover:underline')}
            id="auth.loginNow"
          >
            {t('auth.loginNow')}
          </Link>
        </p>

        <p
          className={cn(
            'text-muted-foreground',
            'mt-4',
            'text-center',
            'text-xs',
            'leading-relaxed'
          )}
        >
          {t('auth.agreeToTerms')}{' '}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            id="register-terms-link"
            className={cn('text-primary', 'font-semibold', 'hover:underline')}
          >
            {t('auth.termsLink')}
          </a>{' '}
          {t('auth.and')}{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            id="register-privacy-link"
            className={cn('text-primary', 'font-semibold', 'hover:underline')}
          >
            {t('auth.privacyLink')}
          </a>
        </p>
      </div>
    </div>
  )
}
