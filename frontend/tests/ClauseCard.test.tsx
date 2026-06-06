/* tests/ClauseCard.test.tsx */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ClauseCard from '../src/components/features/ClauseCard'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

describe('ClauseCard Component', () => {
  const mockClause = {
    id: 'clause_001',
    severity: 'high' as const,
    title: 'The Service Provider shall be liable for all damages.',
    clause:
      'The Service Provider shall be liable for all damages, losses, and injuries of any kind.',
    explanation: 'Unlimited liability is high risk and requires a cap.',
    redlineSuggestion: 'Liability shall be capped at contract value.',
    confidence: 0.95,
    sourceFromKB: 'kb_liability_limit',
  }

  it('renders detailed content properly', () => {
    render(<ClauseCard item={mockClause} />)

    // displays original clause text
    expect(
      screen.getByText(/The Service Provider shall be liable for all damages, losses/i)
    ).toBeInTheDocument()

    // displays AI explanation
    expect(
      screen.getByText(/Unlimited liability is high risk and requires a cap/i)
    ).toBeInTheDocument()

    // displays suggested redline
    expect(
      screen.getByText(/Liability shall be capped at contract value\./)
    ).toBeInTheDocument()

    // displays KB source citation reference
    expect(screen.getByText('kb_liability_limit')).toBeInTheDocument()

    // displays confidence score
    expect(screen.getByText('95%')).toBeInTheDocument()
  })
})
