// src/pages/__tests__/Pricing.test.jsx
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
// import userEvent from '@testing-library/user-event'
import Pricing from '../src/pages/Pricing'
import { I18nextProvider } from 'react-i18next'
import i18n from '../src/lib/i18n'

// Mock fetch globally for this test file
beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          plans: [
            {
              id: 'free',
              name: 'Free',
              price: '$0',
              features: ['Feature A', 'Feature B'],
              limits: { analysis: '10k', storage: '1GB' },
            },
            {
              id: 'pro',
              name: 'Pro',
              price: '$49',
              features: ['Feature A', 'Feature B', 'Feature C'],
              limits: { analysis: '100k', storage: '10GB' },
            },
            {
              id: 'enterprise',
              name: 'Enterprise',
              price: 'Contact us',
              features: ['All features'],
              limits: { analysis: 'Unlimited', storage: 'Unlimited' },
            },
          ],
        }),
    })
  ) as unknown as jest.Mock
})

afterEach(() => {
  jest.restoreAllMocks()
})

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

describe('Pricing Page', () => {
  test('shows loading state initially', async () => {
    renderWithI18n(<Pricing />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  test('renders plan cards after fetching', async () => {
    renderWithI18n(<Pricing />)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    // Wait for cards to appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /free/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /pro/i })).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: /enterprise/i })
      ).toBeInTheDocument()
    })
  })

  test('CTA button behavior', async () => {
    renderWithI18n(<Pricing />)
    await waitFor(() =>
      screen.getByRole('button', { name: /get started free/i })
    )
    const freeBtn = screen.getByRole('button', { name: /get started free/i })
    expect(freeBtn).toBeInTheDocument()
    // The Pro button is disabled placeholder
    const proBtn = screen.getByRole('button', { name: /upgrade to pro/i })
    expect(proBtn).toBeDisabled()
    // Enterprise CTA is a link
    const enterpriseLink = screen.getByRole('link', { name: /contact us/i })
    expect(enterpriseLink).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:')
    )
  })
})
