import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'

const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  return (
    <button
      onClick={() => i18n.changeLanguage(isRtl ? 'en' : 'ar')}
      className="group hover:bg-primary/10 border-border/50 hover:border-primary/30 bg-card/30 flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold backdrop-blur-sm transition-all active:scale-95"
      aria-label="Switch Language"
    >
      <Languages
        size={14}
        className="text-primary transition-transform group-hover:rotate-12"
      />
      <span>{isRtl ? 'English' : 'العربية'}</span>
    </button>
  )
}

export default LanguageSwitcher
