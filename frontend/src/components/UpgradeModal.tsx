import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Info, Check, Zap, Shield, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export const UpgradeModal: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
}> = ({ open, onOpenChange }) => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('checkout_success') === 'true') {
      toast.success(
        t('billing.upgradeSuccess', {
          defaultValue: 'Upgrade initiated! Check your email.',
        })
      )
      navigate('/', { replace: true })
    } else if (params.get('checkout_cancel') === 'true') {
      toast.info(t('upgrade.cancel', { defaultValue: 'Upgrade cancelled.' }))
      navigate('/', { replace: true })
    }
  }, [location.search, navigate, t])

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') {
      toast.info(
        t('plans.contact_us', {
          defaultValue: 'Please contact sales.',
        })
      )
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug: planId }),
      })
      const resData = await res.json()
      if (resData?.data?.url) {
        window.location.assign(resData.data.url)
      } else {
        throw new Error(resData?.message || 'Invalid response from checkout API')
      }
    } catch (err) {
      console.error(err)
      toast.error(
        t('upgrade.error', { defaultValue: 'Unable to start checkout.' })
      )
    } finally {
      setLoading(false)
    }
  }

  const isRtl = i18n.language === 'ar'
  const dirClass = isRtl ? 'rtl' : 'ltr'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <></>
      </DialogTrigger>
      {/* تم تغيير الـ max-w والـ overflow لضمان ثبات الهيكل الإجمالي للمودال */}
      <DialogContent
        className={cn(
          'bg-card border-border/40 max-h-[90vh] w-[95vw] max-w-6xl overflow-y-auto rounded-[2rem] border p-0 shadow-2xl focus:outline-none',
          dirClass
        )}
      >
        <div className="from-primary/10 pointer-events-none absolute top-0 left-0 h-32 w-full bg-gradient-to-b to-transparent" />

        <div className="relative p-6 sm:p-10">
          <DialogHeader className="mb-8 text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
              <Sparkles className="text-primary h-7 w-7" />
            </div>
            <DialogTitle className="text-foreground mb-2 text-2xl font-black tracking-tight sm:text-3xl">
              {t('upgrade.title', {
                defaultValue: 'Upgrade Your Contract Management Today',
              })}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mx-auto max-w-xl text-sm sm:text-base">
              {t('upgrade.subtitle', {
                defaultValue:
                  'Choose the perfect plan for your business and unlock advanced AI analytics.',
              })}
            </DialogDescription>
          </DialogHeader>

          {/* الحل: استخدام CSS Grid لضمان بقائهم بجانب بعض في الشاشات المتوسطة والكبيرة */}
          <div className="relative z-10 mx-auto grid w-full max-w-5xl grid-cols-1 items-stretch gap-4 pt-4 md:grid-cols-3 lg:gap-6">
            {/* Free Plan */}
            <div className="bg-background/40 border-border/60 flex flex-col rounded-3xl border-2 p-6 transition-all duration-300 hover:scale-[1.01]">
              <div className="mb-4">
                <h3 className="text-foreground text-lg font-bold">
                  {t('plans.free.name', { defaultValue: 'Free Plan' })}
                </h3>
                <div className="text-foreground mt-4 flex items-baseline text-3xl font-black">
                  {isRtl ? 'مجاناً' : 'Free'}
                </div>
                <div className="text-muted-foreground/80 group relative mt-2 flex items-center gap-1.5 text-xs font-semibold">
                  <span>
                    500{' '}
                    {t('plans.credits_per_month', {
                      defaultValue: 'credits / month',
                    })}
                  </span>
                  <Info className="h-3.5 w-3.5 cursor-help opacity-70" />
                  <div className="bg-popover text-popover-foreground invisible absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-xl border p-2.5 text-center text-xs opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                    {t('upgrade.tooltip_text', {
                      defaultValue:
                        'Credits are consumed based on document volume.',
                    })}
                  </div>
                </div>
              </div>
              <ul className="mb-8 flex-1 space-y-3.5 pt-2">
                <li className="text-foreground/90 flex items-start gap-3 text-xs font-medium">
                  <div className="bg-primary/10 mt-0.5 shrink-0 rounded-full p-1">
                    <Check className="text-primary h-3 w-3" />
                  </div>
                  <span>
                    {t('plans.free.f1', {
                      defaultValue: 'Basic document analysis',
                    })}
                  </span>
                </li>
                <li className="text-foreground/90 flex items-start gap-3 text-xs font-medium">
                  <div className="bg-primary/10 mt-0.5 shrink-0 rounded-full p-1">
                    <Check className="text-primary h-3 w-3" />
                  </div>
                  <span>
                    {t('plans.free.f2', {
                      defaultValue: 'Single language support',
                    })}
                  </span>
                </li>
              </ul>
              <Button
                variant="outline"
                className="bg-muted/40 h-11 w-full rounded-xl font-bold"
                disabled
              >
                {t('plans.current', { defaultValue: 'Your Current Plan' })}
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="bg-background border-primary shadow-primary/5 relative flex flex-col rounded-3xl border-2 p-6 shadow-2xl transition-all duration-300 hover:scale-[1.01] md:-translate-y-3">
              <div className="bg-primary text-primary-foreground absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-[10px] font-black tracking-wider whitespace-nowrap uppercase">
                {t('plans.popular', { defaultValue: 'Most Popular' })}
              </div>
              <div className="mt-2 mb-4">
                <h3 className="text-foreground flex items-center gap-2 text-lg font-bold">
                  <Zap className="text-primary fill-primary h-4 w-4" />
                  {t('plans.pro.name', { defaultValue: 'Pro Developer' })}
                </h3>
                <div className="text-foreground mt-4 flex items-baseline text-3xl font-black">
                  $9.99
                  <span className="text-muted-foreground/70 ms-1 text-sm font-semibold">
                    /{t('plans.month', { defaultValue: 'mo' })}
                  </span>
                </div>
                <div className="text-muted-foreground/80 group relative mt-2 flex items-center gap-1.5 text-xs font-semibold">
                  <span>
                    5,000{' '}
                    {t('plans.credits_per_month', {
                      defaultValue: 'credits / month',
                    })}
                  </span>
                  <Info className="h-3.5 w-3.5 cursor-help opacity-70" />
                  <div className="bg-popover text-popover-foreground invisible absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-xl border p-2.5 text-center text-xs opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                    {t('upgrade.tooltip_text', {
                      defaultValue:
                        'Credits are consumed based on document volume.',
                    })}
                  </div>
                </div>
              </div>
              <ul className="mb-8 flex-1 space-y-3.5 pt-2">
                <li className="text-foreground flex items-start gap-3 text-xs font-semibold">
                  <div className="bg-primary/10 mt-0.5 shrink-0 rounded-full p-1">
                    <Check className="text-primary h-3 w-3" />
                  </div>
                  <span>
                    {t('plans.pro.f1', {
                      defaultValue: 'Advanced AI analysis',
                    })}
                  </span>
                </li>
                <li className="text-foreground flex items-start gap-3 text-xs font-semibold">
                  <div className="bg-primary/10 mt-0.5 shrink-0 rounded-full p-1">
                    <Check className="text-primary h-3 w-3" />
                  </div>
                  <span>
                    {t('plans.pro.f2', {
                      defaultValue: 'Full multilingual support',
                    })}
                  </span>
                </li>
                <li className="text-foreground flex items-start gap-3 text-xs font-semibold">
                  <div className="bg-primary/10 mt-0.5 shrink-0 rounded-full p-1">
                    <Check className="text-primary h-3 w-3" />
                  </div>
                  <span>
                    {t('plans.pro.f3', {
                      defaultValue: 'Version comparison reports (Diff)',
                    })}
                  </span>
                </li>
              </ul>
              <Button
                className="shadow-primary/10 hover:shadow-primary/20 h-11 w-full rounded-xl text-sm font-bold shadow-lg transition-all active:scale-[0.98]"
                onClick={() => handleUpgrade('pro')}
                disabled={loading}
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  t('plans.upgrade_pro', { defaultValue: 'Upgrade to Pro' })
                )}
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-background/40 border-border/60 flex flex-col rounded-3xl border-2 p-6 transition-all duration-300 hover:scale-[1.01]">
              <div className="mb-4">
                <h3 className="text-foreground flex items-center gap-2 text-lg font-bold">
                  <Shield className="text-muted-foreground h-4 w-4" />
                  {t('plans.enterprise.name', { defaultValue: 'Enterprise' })}
                </h3>
                <div className="text-foreground mt-4 flex items-baseline text-3xl font-black">
                  {t('plans.custom_price', { defaultValue: 'Custom' })}
                </div>
                <div className="text-muted-foreground/80 group relative mt-2 flex items-center gap-1.5 text-xs font-semibold">
                  <span>{isRtl ? 'رصيد غير محدود' : 'Unlimited credits'}</span>
                  <Info className="h-3.5 w-3.5 cursor-help opacity-70" />
                  <div className="bg-popover text-popover-foreground invisible absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-xl border p-2.5 text-center text-xs opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                    {t('upgrade.tooltip_text', {
                      defaultValue:
                        'Credits are consumed based on document volume.',
                    })}
                  </div>
                </div>
              </div>
              <ul className="mb-8 flex-1 space-y-3.5 pt-2">
                <li className="text-foreground/90 flex items-start gap-3 text-xs font-medium">
                  <div className="bg-primary/10 mt-0.5 shrink-0 rounded-full p-1">
                    <Check className="text-primary h-3 w-3" />
                  </div>
                  <span>
                    {t('plans.enterprise.f1', {
                      defaultValue: 'Custom team permissions',
                    })}
                  </span>
                </li>
                <li className="text-foreground/90 flex items-start gap-3 text-xs font-medium">
                  <div className="bg-primary/10 mt-0.5 shrink-0 rounded-full p-1">
                    <Check className="text-primary h-3 w-3" />
                  </div>
                  <span>
                    {t('plans.enterprise.f2', {
                      defaultValue: '24/7 dedicated support',
                    })}
                  </span>
                </li>
              </ul>
              <Button
                variant="outline"
                className="border-border/80 hover:bg-muted h-11 w-full rounded-xl font-bold"
                onClick={() => handleUpgrade('enterprise')}
              >
                {t('plans.contact_us', { defaultValue: 'Contact Us' })}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
