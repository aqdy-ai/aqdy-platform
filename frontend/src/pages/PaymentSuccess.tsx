import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export const PaymentSuccess: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  )
  const [errorMsg, setErrorMsg] = useState<string>('')

  const isRtl = i18n.language === 'ar'

  useEffect(() => {
    const confirmPayment = async () => {
      if (!sessionId) {
        setStatus('error')
        setErrorMsg(isRtl ? 'معرف الجلسة غير صالح' : 'Session ID is missing.')
        return
      }

      try {
        const response = await fetch(
          `/api/payments/success?session_id=${sessionId}`
        )
        if (!response.ok) {
          throw new Error('Verification failed')
        }

        const data = await response.json()
        if (data?.success && data?.data?.status === 'succeeded') {
          setStatus('success')
          toast.success(
            isRtl
              ? 'تم تفعيل اشتراكك وتحديث رصيدك بنجاح!'
              : 'Subscription activated and credit topped up successfully!'
          )

          // Force profile reload on transition or store local flag
          localStorage.setItem('isLoggedIn', 'true')
        } else {
          throw new Error(data?.message || 'Payment verification pending')
        }
      } catch (err: unknown) {
        console.error(err)
        setStatus('error')
        setErrorMsg(
          err instanceof Error
            ? err.message
            : isRtl
              ? 'حدث خطأ أثناء تأكيد الدفع، يرجى الاتصال بالدعم الفني'
              : 'Error confirming payment, please contact support.'
        )
      }
    }

    confirmPayment()
  }, [sessionId, isRtl])

  return (
    <div
      className="bg-background flex flex-1 items-center justify-center px-4 py-20"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <Card className="border-border/40 w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-black tracking-tight">
            {isRtl ? 'تأكيد عملية الدفع' : 'Payment Confirmation'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-6 text-center">
          {status === 'loading' && (
            <div className="space-y-6">
              <Loader2 className="text-primary mx-auto h-16 w-16 animate-spin opacity-80" />
              <p className="text-muted-foreground text-sm font-medium">
                {isRtl
                  ? 'جاري تأكيد عملية الدفع وتفعيل اشتراكك...'
                  : 'Confirming your payment and activating your subscription...'}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                <CheckCircle2 className="text-primary h-12 w-12" />
              </div>
              <h2 className="text-foreground text-xl font-bold">
                {isRtl ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {isRtl
                  ? 'تهانينا! تم تفعيل اشتراكك الجديد بنجاح وشحن رصيد حسابك بالكامل. يمكنك الآن البدء في استخدام الخدمات.'
                  : 'Congratulations! Your new subscription has been activated, and your account credits have been topped up. You can now use all the services.'}
              </p>
              <Button
                className="w-full rounded-xl font-bold shadow-lg"
                onClick={() => {
                  // Reload window to force auth context to fetch updated user info
                  window.location.assign('/test-dashboard')
                }}
              >
                {isRtl ? 'الذهاب إلى لوحة التحكم' : 'Go to Dashboard'}
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="bg-destructive/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                <XCircle className="text-destructive h-12 w-12" />
              </div>
              <h2 className="text-foreground text-xl font-bold">
                {isRtl ? 'فشلت عملية التأكيد' : 'Confirmation Failed'}
              </h2>
              <p className="text-destructive text-sm font-semibold">
                {errorMsg}
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl font-bold"
                  onClick={() => navigate('/pricing')}
                >
                  {isRtl ? 'العودة للأسعار' : 'Back to Pricing'}
                </Button>
                <Button
                  className="flex-1 rounded-xl font-bold"
                  onClick={() => window.location.reload()}
                >
                  {isRtl ? 'إعادة المحاولة' : 'Try Again'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentSuccess
