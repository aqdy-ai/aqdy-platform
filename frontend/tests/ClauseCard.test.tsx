/* tests/ClauseCard.test.tsx */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ClauseCard from '../src/components/dashboard/ClauseCard'

// عمل Mock للترجمة
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

// عمل Mock مبسط لمكون المقارنة
vi.mock('../src/components/dashboard/RedlineComparison', () => ({
  default: ({
    originalText,
    suggestedText,
  }: {
    originalText: string
    suggestedText: string
  }) => (
    <div data-testid="redline-comparison">
      <span>{originalText}</span>
      <span>{suggestedText}</span>
    </div>
  ),
}))

describe('ClauseCard Component', () => {
  const mockClause = {
    clauseText: 'The Service Provider shall be liable for all damages.',
    clauseType: 'Liability',
    riskLevel: 'critical' as const,
    confidence: 0.95,
    explanation: { ar: 'شرح عربي', en: 'English Explanation' },
    redlineSuggestion: 'Liability shall be capped at contract value.',
    sourceFromKB: 'clause_001',
  }

  it('renders static content properly and hides redline by default', () => {
    render(<ClauseCard clause={mockClause} />)

    expect(
      screen.getByText(
        /"The Service Provider shall be liable for all damages."/
      )
    ).toBeInTheDocument()
    expect(screen.getByText('English Explanation')).toBeInTheDocument()
    expect(screen.getByText('#001')).toBeInTheDocument()

    // المقترح البديل والـ Container لازم يكونوا مخفيين في الأول
    const container = document.getElementById(
      `redline-container-${mockClause.sourceFromKB}`
    )
    expect(container).not.toBeInTheDocument()
  })

  it('toggles the redline comparison view smoothly when the button is clicked', () => {
    render(<ClauseCard clause={mockClause} />)

    const toggleButton = screen.getByRole('button', {
      name: /dashboard.show_redline/i,
    })
    expect(toggleButton).toBeInTheDocument()

    // 1. كليك أولى: إظهار المقترح البديل وفحص الـ Container بالـ ID الجديد للـ Accessibility
    fireEvent.click(toggleButton)
    const container = document.getElementById(
      `redline-container-${mockClause.sourceFromKB}`
    )
    expect(container).toBeInTheDocument()
    expect(container).toHaveTextContent(
      'Liability shall be capped at contract value.'
    )

    // 2. كليك ثانية: إخفاء المقترح البديل
    const hideButton = screen.getByRole('button', {
      name: /dashboard.hide_redline/i,
    })
    fireEvent.click(hideButton)

    const containerAfterHide = document.getElementById(
      `redline-container-${mockClause.sourceFromKB}`
    )
    expect(containerAfterHide).not.toBeInTheDocument()
  })
})
