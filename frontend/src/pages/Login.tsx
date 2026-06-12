import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { loginSchema } from '../hooks/useAuth'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'

export default function Login() {
  const { t } = useTranslation()
  const { login, forgotPassword, isLoading } = useAuth()
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

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>{t('auth.loginTitle')} | Aqdy</title>
      </Helmet>

      <div className="bg-card border-border/50 w-full max-w-md space-y-8 rounded-3xl border p-8 shadow-2xl">
        <div className="text-center">
          <h2 className="text-foreground text-3xl font-extrabold tracking-tight">
            {t('auth.welcomeBack')}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('auth.loginSubtitle')}
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
            <div>
              <label className="text-foreground mb-1 block text-start text-sm font-medium">
                {t('auth.passwordLabel')}
              </label>
              <input
                type="password"
                required
                className="border-input bg-background text-foreground focus:border-primary focus:ring-primary relative block w-full rounded-xl border px-4 py-3 transition-all outline-none focus:ring-1 sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={forgotPassword}
              className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
            >
              {t('auth.forgotPassword')}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/50 relative flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold shadow-lg transition-all hover:cursor-pointer focus:ring-2 focus:outline-none disabled:opacity-50"
          >
            {isLoading ? t('common.loading') : t('auth.loginAction')}
          </button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          {t('auth.noAccount')}{' '}
          <Link
            to="/register"
            className="text-primary font-bold hover:underline"
          >
            {t('auth.registerNow')}
          </Link>
        </p>
      </div>
    </div>
  )
}
