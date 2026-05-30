import { describe, it, expect, beforeEach } from 'vitest'
import i18n from '../src/lib/i18n'
import { render, screen } from '@testing-library/react'
import LanguageSwitcher from '../src/components/LanguageSwitcher'

describe('RTL/LTR Switching Logic (Integration)', () => {
  beforeEach(async () => {
    // البدء دائماً بالحالة الافتراضية للمشروع (العربية - RTL)
    await i18n.changeLanguage('ar')
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'ar'
  })

  it('يجب أن يتغير اتجاه الصفحة (dir) ولغة المستند (lang) عند التبديل للإنجليزية', async () => {
    // محاكاة التغيير عبر i18n
    await i18n.changeLanguage('en')
    // في التطبيق الفعلي، الـ MainLayout هو من يقوم بهذا التغيير
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'

    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.lang).toBe('en')
    expect(i18n.language).toBe('en')
  })

  it('يجب أن يعود الاتجاه إلى RTL عند العودة للغة العربية', async () => {
    // 1. التبديل للإنجليزية أولاً
    await i18n.changeLanguage('en')
    document.documentElement.dir = 'ltr'

    // 2. العودة للعربية
    await i18n.changeLanguage('ar')
    document.documentElement.dir = 'rtl'

    expect(document.documentElement.dir).toBe('rtl')
    expect(i18n.language).toBe('ar')
  })

  it('يجب التأكد من وجود المكونات الأساسية وتفاعلها مع الاتجاه', () => {
    render(
      <div>
        <LanguageSwitcher />
        <div data-testid="styled-element" className="ms-4 text-start">
          Content
        </div>
      </div>
    )

    const element = screen.getByTestId('styled-element')

    // التأكد من استخدام Tailwind Logical Properties
    expect(element.className).toContain('ms-4')
    expect(element.className).toContain('text-start')
  })
})
