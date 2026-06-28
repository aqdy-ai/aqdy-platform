import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '../services/authApi'
import { useAuth } from '../hooks/useAuth'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'

export default function VerifyEmail() {
  const { t, i18n } = useTranslation()
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const isRtl = i18n.language === 'ar'

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  )

  useEffect(() => {
    const performVerification = async () => {
      if (!token) {
        setStatus('error')
        return
      }

      try {
        await authApi.verifyEmail(token)
        setStatus('success')

        // Fetch fresh user data so that isEmailVerified becomes true in app state
        try {
          const res = await authApi.getMe()
          if (res.data.success) {
            setUser(res.data.data.user)
            localStorage.setItem('isLoggedIn', 'true')
          }
        } catch (err) {
          console.error(
            'Failed to refresh user profile post-verification:',
            err
          )
        }
      } catch (err) {
        console.error('Email verification error:', err)
        setStatus('error')
      }
    }

    performVerification()
  }, [token, setUser])

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>{t('auth.verifyPromptTitle')} | Aqdy</title>
      </Helmet>

      <div className="bg-card/40 border-border/50 w-full max-w-md space-y-8 rounded-3xl border p-8 shadow-2xl backdrop-blur-md">
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-4 py-6">
            <Loader2 className="text-primary h-12 w-12 animate-spin" />
            <p className="text-muted-foreground text-sm font-semibold">
              {t('common.loading')}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-10 w-10 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-foreground text-2xl font-black">
                {t('auth.verifySuccessTitle')}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed font-semibold">
                {t('auth.verifySuccessSubtitle')}
              </p>
            </div>

            <button
              onClick={() => navigate('/risk-analysis')}
              className="group bg-primary text-primary-foreground hover:bg-primary/95 focus:ring-primary/50 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-lg transition-all hover:cursor-pointer focus:ring-2 focus:outline-none"
            >
              {t('auth.gotoDashboard')}
              {isRtl ? (
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              ) : (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <XCircle className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-foreground text-2xl font-black">
                {t('auth.verifyErrorTitle')}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed font-semibold">
                {t('auth.verifyErrorSubtitle')}
              </p>
            </div>

            <Link
              to="/login"
              className="group border-border/60 hover:border-primary/45 text-foreground hover:text-primary focus:ring-primary/20 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition-all focus:ring-2 focus:outline-none"
            >
              {isRtl ? (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              ) : (
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              )}
              {t('auth.backToLogin')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
