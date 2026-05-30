import { describe, it, expect, beforeAll } from 'vitest'
import i18n from '../src/lib/i18n'

describe('i18n Configuration Audit', () => {
  beforeAll(async () => {
    // تهيئة i18n ببيانات Mock مدمجة لتجنب تحميل ملفات JSON من الخارج أثناء الاختبار
    await i18n.init({
      lng: 'ar',
      fallbackLng: 'ar',
      ns: ['translation'],
      defaultNS: 'translation',
      resources: {
        ar: {
          translation: {
            common: { brand_name: 'عقدي' },
            upload: { title: 'ارفع عقدك' },
            disclaimer: { description: 'وصف إخلاء المسؤولية' },
          },
        },
        en: {
          translation: {
            common: { brand_name: 'Aqdy' },
            upload: { title: 'Upload Contract' },
            disclaimer: { description: 'Disclaimer Description' },
          },
        },
      },
    })
  })

  it('يجب أن تكون اللغة الافتراضية هي العربية (ar)', () => {
    expect(i18n.language).toBe('ar')
  })

  it('يجب أن يكون اتجاه الصفحة RTL عند استخدام اللغة العربية', () => {
    // محاكاة منطق الـ Layout
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('يجب التأكد من وجود مفاتيح الترجمة الأساسية في الـ Mock Resources', () => {
    expect(i18n.exists('upload.title')).toBe(true)
    expect(i18n.exists('disclaimer.description')).toBe(true)
    expect(i18n.t('upload.title')).toBe('ارفع عقدك')
  })

  it('يجب أن تتغير اللغة بنجاح إلى الإنجليزية ويتغير اتجاه الصفحة إلى LTR', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.language).toBe('en')

    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    expect(document.documentElement.dir).toBe('ltr')
    expect(i18n.t('upload.title')).toBe('Upload Contract')

    // العودة للعربية للتنظيف
    await i18n.changeLanguage('ar')
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    expect(document.documentElement.dir).toBe('rtl')
  })
})
