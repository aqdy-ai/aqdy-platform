import i18n, { type InitOptions } from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend, { type HttpBackendOptions } from 'i18next-http-backend'

import type { I18nConfig, SupportedLocale } from '@/types'

export const i18nConfig: I18nConfig = {
  defaultLocale: 'ar',
  fallbackLocale: 'ar',
  supportedLocales: ['en', 'ar'],
  ns: ['translation'],
  defaultNS: 'translation',
}

/** Returns the correct text direction for a given locale */
export function getDirection(locale: SupportedLocale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

// دمج الـ Types الخاصة بـ i18next مع الـ Backend plugin
type i18nOptionsType = InitOptions & {
  backend?: HttpBackendOptions
  initImmediate?: boolean
}

const i18nOptions: i18nOptionsType = {
  lng: i18nConfig.defaultLocale,
  fallbackLng: i18nConfig.fallbackLocale,
  supportedLngs: i18nConfig.supportedLocales,
  defaultNS: i18nConfig.defaultNS,
  ns: i18nConfig.ns,
  initImmediate: false,
  resources:
    typeof process !== 'undefined' && process.env.VITEST
      ? {
          ar: { translation: { common: { brand_name: 'عقدي' } } },
          en: { translation: { common: { brand_name: 'Aqdy' } } },
        }
      : undefined,
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
  },
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
  },
  interpolation: {
    escapeValue: false,
  },
  // Add Arabic plural rules
  pluralSeparator: '_',
  contextSeparator: '_',
  nsSeparator: ':',
  keySeparator: '.',
}

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init(i18nOptions)

export default i18n
