import { useTranslation } from 'react-i18next'

const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  return (
    <button
      onClick={() => i18n.changeLanguage(isRtl ? 'en' : 'ar')}
      className="hover:bg-primary/10 border-border hover:border-primary/30 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
    >
      {isRtl ? 'English' : 'العربية'}
    </button>
  )
}

export default LanguageSwitcher
