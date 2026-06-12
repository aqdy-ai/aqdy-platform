// frontend/tests/components/features/billing/EmptyPaymentState.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EmptyPaymentState } from '@/components/features/billing/EmptyPaymentState'
import { useTranslation } from 'react-i18next'

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key, // Mock t function to return the key
    i18n: {
      language: 'en',
      dir: () => 'ltr',
    },
  }),
}))

describe('EmptyPaymentState', () => {
  it('renders the empty state message', () => {
    render(<EmptyPaymentState />)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'billing.no_payments_found'
    )
    expect(screen.getByText('billing.start_using_platform')).toBeInTheDocument()
  })
})
