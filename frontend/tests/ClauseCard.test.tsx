/* tests/ClauseCard.test.tsx */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ClauseCard from '../src/components/features/ClauseCard'

// عمل Mock للترجمة - ClauseCard uses i18n.language directly, not t()
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

// The real ClauseCard renders item.recommendation inline, no redline toggle
// ClauseCard interface: { id, severity, title, clause, recommendation }
describe('ClauseCard Component', () => {
  const mockClause = {
    id: 'clause_001',
    severity: 'high' as const,
    title: 'The Service Provider shall be liable for all damages.',
    clause:
      'The Service Provider shall be liable for all damages, losses, and injuries of any kind.',
    recommendation:
      'Liability shall be capped at contract value.',
  }

  it('renders static content properly', () => {
    render(<ClauseCard item={mockClause} />)

    // title is rendered inside h4
    expect(
      screen.getByText(/The Service Provider shall be liable for all damages\./)
    ).toBeInTheDocument()

    // recommendation is rendered inside the green box
    expect(
      screen.getByText(/Liability shall be capped at contract value\./)
    ).toBeInTheDocument()

    // The copy button is rendered (not expanded text toggle)
    expect(
      screen.getByTitle(/Copy Recommendation/i)
    ).toBeInTheDocument()
  })

  it('toggles the clause text expansion when clicking the clause area', () => {
    render(<ClauseCard item={mockClause} />)

    // Initially shows "Read full clause" toggle hint
    expect(screen.getByText(/Read full clause/i)).toBeInTheDocument()

    // Click the clause area to expand
    const clauseArea = screen.getByText(/The Service Provider shall be liable for all damages, losses/i).closest('div')!
    fireEvent.click(clauseArea)

    // After expanding, shows "Show less"
    expect(screen.getByText(/Show less/i)).toBeInTheDocument()
  })
})
