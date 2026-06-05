/* src/components/layout/Footer.tsx */

import { useTranslation } from 'react-i18next'

const Footer = () => {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  return (
    <footer className="border-border/40 bg-card/20 mt-20 border-t py-12 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <span className="text-primary text-xl font-black">
            {t('common.brand_name')}
          </span>

          <p className="text-muted-foreground text-sm">
            © 2026 {t('common.brand_name')}.{' '}
            {isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </p>
        </div>

        <div className="text-muted-foreground flex gap-6 text-sm font-medium">
          <a href="/privacy" className="hover:text-primary transition-colors">
            {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </a>

          <a href="/terms" className="hover:text-primary transition-colors">
            {isRtl ? 'شروط الخدمة' : 'Terms of Service'}
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
