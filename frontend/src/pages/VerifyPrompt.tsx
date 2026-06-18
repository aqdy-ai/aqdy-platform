import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { authApi } from '../services/authApi'
import { toast } from 'sonner'
import { Mail, LogOut, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Helmet } from 'react-helmet-async'

export default function VerifyPrompt() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const isRtl = i18n.language === 'ar'
  const [cooldown, setCooldown] = useState(0)
  const [sending, setSending] = useState(false)

  // Load cooldown from localStorage to persist across page refreshes
  useEffect(() => {
    const savedExpiry = localStorage.getItem('resend_cooldown_expiry')
    if (savedExpiry) {
      const remaining = Math.ceil((parseInt(savedExpiry, 10) - Date.now()) / 1000)
      if (remaining > 0) {
        setCooldown(remaining)
      }
    }
  }, [])

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          localStorage.removeItem('resend_cooldown_expiry')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleResend = async () => {
    if (cooldown > 0 || sending) return
    setSending(true)
    try {
      await authApi.resendVerification()
      toast.success(t('auth.resendSuccess'))
      
      const newCooldown = 60
      setCooldown(newCooldown)
      localStorage.setItem(
        'resend_cooldown_expiry',
        (Date.now() + newCooldown * 1000).toString()
      )
    } catch (error: any) {
      const message = error.response?.data?.message || t('auth.errors.generic')
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>{t('auth.verifyPromptTitle')} | Aqdy</title>
      </Helmet>

      <div className="bg-card/40 border-border/50 w-full max-w-md space-y-8 rounded-3xl border p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center space-y-4">
          <div className="bg-primary/10 text-primary mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
            <Mail className="h-8 w-8 animate-bounce" />
          </div>
          
          <h2 className="text-foreground text-3xl font-black tracking-tight">
            {t('auth.verifyPromptTitle')}
          </h2>
          
          <p className="text-muted-foreground text-sm font-semibold leading-relaxed">
            {t('auth.verifyPromptSubtitle', { email: user?.email || '' })}
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || sending}
            className="group bg-primary text-primary-foreground hover:bg-primary/95 focus:ring-primary/50 relative flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-lg transition-all hover:cursor-pointer focus:ring-2 focus:outline-none disabled:opacity-60"
          >
            {sending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {cooldown > 0
              ? t('auth.resendCooldown', { seconds: cooldown })
              : t('auth.resendBtn')}
          </button>

          <button
            onClick={logout}
            className="group border-border/60 hover:border-rose-500/30 text-foreground hover:text-rose-500 hover:bg-rose-500/10 focus:ring-rose-500/20 relative flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition-all hover:cursor-pointer focus:ring-2 focus:outline-none"
          >
            <LogOut className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    </div>
  )
}
