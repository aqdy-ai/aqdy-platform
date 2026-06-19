import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { authApi } from '../services/authApi'
import { useAuth } from '../hooks/useAuth'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const { isLoading, forgotPassword } = useAuth()
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await forgotPassword(email)
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>{t('auth.forgotPasswordTitle')} | Aqdy</title>
      </Helmet>
      <div className="bg-card border-border/50 bg-opacity-30 w-full max-w-md space-y-8 rounded-3xl border p-8 shadow-2xl backdrop-blur-sm">
        <div className="text-center">
          <h2 className="text-foreground text-3xl font-extrabold tracking-tight">
            {t('auth.forgotPasswordTitle')}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('auth.forgotPasswordSubtitle')}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-foreground mb-1 block text-start text-sm font-medium">
                {t('auth.emailLabel')}
              </label>
              <input
                type="email"
                required
                className="border-input bg-background text-foreground focus:border-primary focus:ring-primary relative block w-full rounded-xl border px-4 py-3 transition-all outline-none focus:ring-1 sm:text-sm"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="group bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/50 relative flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold shadow-lg transition-all hover:cursor-pointer focus:ring-2 focus:outline-none disabled:opacity-50"
          >
            {isLoading ? t('common.loading') : t('auth.sendResetLink')}
          </button>
        </form>
        <p className="text-muted-foreground mt-4 text-center text-xs leading-relaxed">
          {t('auth.remembered')}{' '}
          <a
            href="/login"
            className="text-primary font-semibold hover:underline"
          >
            {t('auth.loginNow')}
          </a>
        </p>
      </div>
    </div>
  )
}
