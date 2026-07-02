# Localization — Arabic & English (AR / EN)

> MSA Arabic support, RTL layout, bilingual contract analysis, and cultural adaptation for the MENA market.

---

## Overview

Aqdy is designed **bilingual-first**, with Arabic (Modern Standard Arabic — MSA) and English as fully supported languages. Arabic is the **default language**. The platform automatically detects the user's browser language on first visit and persists the choice in `localStorage`.

---

## 1. Supported Languages

| Code | Language | Direction | Status |
|:---|:---|:---|:---|
| `ar` | Arabic (MSA) | RTL | ✅ **Default** — fully supported |
| `en` | English | LTR | ✅ Fully supported |

No other languages are currently supported. See [§ 7 — Adding a New Language](#7-adding-a-new-language) for how to extend support.

---

## 2. i18n Stack

| Library | Role |
|:---|:---|
| [`i18next`](https://www.i18next.com/) v26 | Core i18n engine |
| [`react-i18next`](https://react.i18next.com/) v17 | React hooks (`useTranslation`) and components |
| [`i18next-browser-languagedetector`](https://github.com/i18next/i18next-browser-languageDetector) | Detects language from `localStorage` → navigator |
| [`i18next-http-backend`](https://github.com/i18next/i18next-http-backend) | Loads translation JSON files from `/public/locales/` |

### Configuration (`src/lib/i18n.ts`)

```ts
export const i18nConfig = {
  defaultLocale: 'ar',          // Arabic is the default
  fallbackLocale: 'ar',         // Fallback to Arabic if key missing in EN
  supportedLocales: ['en', 'ar'],
  ns: ['translation'],
  defaultNS: 'translation',
}
```

**Detection order**: `localStorage` → browser navigator.  
**Caching**: Language choice is saved to `localStorage` (key: `i18nextLng`).

---

## 3. Translation Files

```
frontend/
└── public/
    └── locales/
        ├── ar/
        │   └── translation.json   (~38 KB — Arabic translations)
        └── en/
            └── translation.json   (~29 KB — English translations)
```

### File Loading

Translation files are fetched lazily via HTTP backend:

```ts
backend: {
  loadPath: '/locales/{{lng}}/{{ns}}.json',
}
```

This means translation files are **not bundled** into the JavaScript bundle — they are loaded on demand, keeping the initial JS payload smaller.

### Key Namespacing

All keys are dot-separated and grouped by feature namespace:

```json
{
  "common": { "brand_name": "عقدي", "tagline": "..." },
  "nav":    { "home": "الرئيسية", "pricing": "الأسعار" },
  "upload": { "title": "ارفع عقدك هنا", "success_title": "..." },
  "dashboard": { "explanation": "التفسير", "kb_source": "..." },
  "chat":   { "read_aloud": "اقرأ بصوت عالٍ", ... },
  "pricing": { ... },
  "auth":   { ... }
}
```

---

## 4. RTL Layout

### Direction Switching

The `<html>` element's `dir` and `lang` attributes are updated reactively every time the user switches languages:

```tsx
// App.tsx — AppContent effect
useEffect(() => {
  document.documentElement.dir =
    getDirection(i18n.language as SupportedLocale) // 'rtl' | 'ltr'
  document.documentElement.lang = i18n.language    // 'ar' | 'en'
}, [i18n.language])
```

### RTL-First CSS with Tailwind Logical Properties

All layout utilities use Tailwind CSS **logical properties** so the layout mirrors automatically:

| Physical (avoided) | Logical (used) | Meaning |
|:---|:---|:---|
| `pl-4` | `ps-4` | Padding inline-start |
| `pr-4` | `pe-4` | Padding inline-end |
| `ml-2` | `ms-2` | Margin inline-start |
| `mr-2` | `me-2` | Margin inline-end |
| `text-left` | `text-start` | Align to reading-start edge |

The root element also uses `text-align: start` to respect direction:

```css
/* index.css */
#root {
  text-align: start;
}
```

### Arabic Typography

When the page direction is RTL, the font stack switches to include **Noto Sans Arabic** for proper Arabic glyph rendering:

```css
:root[dir='rtl'] {
  --font-sans: 'Inter', 'Noto Sans Arabic', sans-serif;
}
```

---

## 5. Language Switcher

The `LanguageSwitcher` component allows users to toggle between AR and EN at any time:

```tsx
// LanguageSwitcher.tsx
<button
  onClick={() => i18n.changeLanguage(isRtl ? 'en' : 'ar')}
  aria-label="Switch Language"
>
  <span>{isRtl ? 'English' : 'العربية'}</span>
</button>
```

The button label always shows the **opposite** language name, serving as a clear call-to-action.

---

## 6. Bilingual Contract Analysis

Aqdy's AI pipeline supports Arabic, English, and **mixed-language** contracts natively.

### Language Detection

The backend AI agents automatically detect the contract's source language (Arabic, English, or mixed) and adjust their output language accordingly. No explicit language selection is required from the user.

### Supported Content

| Feature | Arabic Support | English Support |
|:---|:---|:---|
| Contract text analysis | ✅ MSA + Egyptian colloquial contracts | ✅ |
| Risk clause explanations | ✅ | ✅ |
| Redline suggestions | ✅ | ✅ |
| Clause-level chat (Q&A) | ✅ | ✅ |
| Legal knowledge base (RAG) | ✅ Egyptian Law references | ✅ |
| Text-to-speech (read aloud) | ✅ `ar-EG` voice | ✅ `en-US` voice |

### Egyptian Law References

The RAG knowledge base includes Egyptian legal references embedded with `multilingual-e5-large`:

- **Labour Law No. 12/2003** (قانون العمل)
- **Civil Code No. 131/1948** (القانون المدني)
- General MENA business norms and standard contractual clause library (150+ clauses)

These references are surfaced as `sourceFromKB` metadata on clause cards.

---

## 7. Adding a New Language

To add a new language (e.g., French `fr`):

### Step 1 — Create translation file

```bash
mkdir frontend/public/locales/fr
cp frontend/public/locales/en/translation.json frontend/public/locales/fr/translation.json
# Translate all values in the new file
```

### Step 2 — Register the locale

```ts
// src/lib/i18n.ts
export const i18nConfig = {
  supportedLocales: ['en', 'ar', 'fr'],  // add 'fr'
}
```

### Step 3 — Update direction helper

```ts
// src/lib/i18n.ts
export function getDirection(locale: SupportedLocale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
  // French is LTR — no change needed
}
```

### Step 4 — Update TypeScript type

```ts
// src/types/index.ts
export type SupportedLocale = 'en' | 'ar' | 'fr'
```

### Step 5 — Update LanguageSwitcher UI

Extend the `LanguageSwitcher` component to cycle through or display all supported locales.

### Step 6 — Update HTML lang fallback

No additional CSS changes are needed for LTR languages. For RTL languages (e.g., Hebrew `he`), add a font override to `index.css`.

---

## 8. Locale-aware Features

| Feature | Implementation |
|:---|:---|
| Toast position | `bottom-left` — correct reading-start for RTL |
| Toast direction | `dir="rtl"` on the `<Toaster>` component |
| Arrow animations | Direction reverses based on `isRtl` flag |
| Chevron icons | Rotate 180° in RTL (e.g., `DisclaimerModal`) |
| PDF export | Bilingual; detected language drives output direction |
| SEO meta | `<html lang>` set dynamically; `<meta>` descriptions served in active language |

---

## 9. Testing i18n

```bash
# Vitest in-process tests use inline minimal translations
# (configured via 'resources' in i18nOptions when process.env.VITEST is set)

# E2E tests with Playwright — test both directions
cd frontend && npm run test:e2e
```

Vitest test setup provides stub translations so tests are not blocked by HTTP backend:

```ts
resources:
  typeof process !== 'undefined' && process.env.VITEST
    ? {
        ar: { translation: { common: { brand_name: 'عقدي' } } },
        en: { translation: { common: { brand_name: 'Aqdy'  } } },
      }
    : undefined,
```

---

## References

- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Documentation](https://react.i18next.com/)
- [CLDR Arabic Plural Rules](https://cldr.unicode.org/index/cldr-spec/plural-rules)
- [W3C Internationalization](https://www.w3.org/International/)
- [Tailwind CSS Logical Properties](https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support)
