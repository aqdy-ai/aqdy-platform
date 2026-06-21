import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { loginSchema } from '../hooks/useAuth'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import type { CredentialResponse } from '@react-oauth/google'
export default function Login() {
  const { t } = useTranslation()
  const { login, loginWithGoogle, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        toast.error(t(issue.message))
      })
      return
    }

    await login({ email, password })
  }

  useEffect(() => {
    const handleCredentialResponse = async (response: CredentialResponse) => {
      if (response.credential) {
        await loginWithGoogle(response.credential)
      }
    }

    const initializeGoogleSignIn = () => {
      if (!window.google) return
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      })
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
        }
      )
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initializeGoogleSignIn

    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

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
        <title>{t('auth.loginTitle')} | Aqdy</title>
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
            {t('auth.welcomeBack')}
          </h2>
          <p className={cn('text-muted-foreground', 'mt-2', 'text-sm')}>
            {t('auth.loginSubtitle')}
          </p>
        </div>

        <form className={cn('mt-8', 'space-y-6')} onSubmit={handleSubmit}>
          <div className={cn('space-y-4', 'rounded-md', 'shadow-sm')}>
            <div>
              <label
                className={cn(
                  'text-foreground',
                  'mb-1',
                  'block',
                  'text-start',
                  'text-sm',
                  'font-medium'
                )}
              >
                {t('auth.emailLabel')}
              </label>
              <input
                type="email"
                required
                className={cn(
                  'border-input',
                  'bg-background',
                  'text-foreground',
                  'focus:border-primary',
                  'focus:ring-primary',
                  'relative',
                  'block',
                  'w-full',
                  'rounded-xl',
                  'border',
                  'px-4',
                  'py-3',
                  'transition-all',
                  'outline-none',
                  'focus:ring-1',
                  'sm:text-sm'
                )}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label
                className={cn(
                  'text-foreground',
                  'mb-1',
                  'block',
                  'text-start',
                  'text-sm',
                  'font-medium'
                )}
              >
                {t('auth.passwordLabel')}
              </label>
              <input
                type="password"
                required
                className={cn(
                  'border-input',
                  'bg-background',
                  'text-foreground',
                  'focus:border-primary',
                  'focus:ring-primary',
                  'relative',
                  'block',
                  'w-full',
                  'rounded-xl',
                  'border',
                  'px-4',
                  'py-3',
                  'transition-all',
                  'outline-none',
                  'focus:ring-1',
                  'sm:text-sm'
                )}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className={cn('flex', 'items-center', 'justify-between')}>
            <Link
              to="/forgot-password"
              className={cn(
                'text-primary',
                'hover:text-primary/80',
                'text-sm',
                'font-medium',
                'transition-colors'
              )}
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'group',
              'bg-primary',
              'text-primary-foreground',
              'hover:bg-primary/90',
              'focus:ring-primary/50',
              'relative',
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
              'focus:ring-2',
              'focus:outline-none',
              'disabled:opacity-50'
            )}
          >
            {isLoading ? t('common.loading') : t('auth.loginAction')}
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
          {t('auth.noAccount')}{' '}
          <Link
            to="/register"
            className={cn('text-primary', 'font-bold', 'hover:underline')}
          >
            {t('auth.registerNow')}
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
            id="login-terms-link"
            className={cn('text-primary', 'font-semibold', 'hover:underline')}
          >
            {t('auth.termsLink')}
          </a>{' '}
          {t('auth.and')}{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            id="login-privacy-link"
            className={cn('text-primary', 'font-semibold', 'hover:underline')}
          >
            {t('auth.privacyLink')}
          </a>
        </p>
      </div>
    </div>
  )
}
