import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import HttpBackend from "i18next-http-backend"

import type { I18nConfig, SupportedLocale } from "@/types"

export const i18nConfig: I18nConfig = {
  defaultLocale: "en",
  fallbackLocale: "en",
  supportedLocales: ["en", "ar"],
  ns: ["translation"],
  defaultNS: "translation",
}

/** Returns the correct text direction for a given locale */
export function getDirection(locale: SupportedLocale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr"
}

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: i18nConfig.fallbackLocale,
    supportedLngs: i18nConfig.supportedLocales,
    defaultNS: i18nConfig.defaultNS,
    ns: i18nConfig.ns,

    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },
  })

export default i18n
