import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LanguageSwitcher from '../src/components/LanguageSwitcher.tsx';

// محاكاة لمكتبة الترجمة i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { changeLanguage: vi.fn() },
    t: (key: string) => `t_${key}`,
  }),
}));

describe('LanguageSwitcher Component', () => {
  it('يجب أن يظهر زر تبديل اللغة', () => {
    render(<LanguageSwitcher />);
    
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeInTheDocument();
  });
});