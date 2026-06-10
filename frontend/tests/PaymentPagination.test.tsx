// frontend/tests/components/features/billing/PaymentPagination.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentPagination } from '@/components/features/billing/PaymentPagination'

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

// Mock Shadcn Pagination components
vi.mock('@/components/ui/pagination', () => ({
  Pagination: ({ children }: { children: React.ReactNode }) => (
    <nav aria-label="Pagination">{children}</nav>
  ),
  PaginationContent: ({ children }: { children: React.ReactNode }) => (
    <ul>{children}</ul>
  ),
  PaginationItem: ({ children }: { children: React.ReactNode }) => (
    <li>{children}</li>
  ),
  PaginationPrevious: ({ onClick, 'aria-disabled': ariaDisabled }: any) => (
    <button
      onClick={onClick}
      disabled={ariaDisabled}
      aria-label="Previous page"
    >
      Previous
    </button>
  ),
  PaginationLink: ({
    onClick,
    isActive,
    children,
  }: {
    onClick: () => void
    isActive: boolean
    children: React.ReactNode
  }) => (
    <button onClick={onClick} aria-current={isActive ? 'page' : undefined}>
      {children}
    </button>
  ),
  PaginationNext: ({ onClick, 'aria-disabled': ariaDisabled }: any) => (
    <button onClick={onClick} disabled={ariaDisabled} aria-label="Next page">
      Next
    </button>
  ),
}))

describe('PaymentPagination', () => {
  const onPageChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with current page and total pages', () => {
    const pagination = { page: 2, totalPages: 5, total: 50, limit: 10 }
    render(
      <PaymentPagination pagination={pagination} onPageChange={onPageChange} />
    )

    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '2', current: 'page' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
  })

  it('disables "Previous" button on the first page', () => {
    const pagination = { page: 1, totalPages: 5, total: 50, limit: 10 }
    render(
      <PaymentPagination pagination={pagination} onPageChange={onPageChange} />
    )
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('does not call onPageChange when clicking previous on the first page', () => {
    const pagination = { page: 1, totalPages: 5, total: 50, limit: 10 }
    render(
      <PaymentPagination pagination={pagination} onPageChange={onPageChange} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('disables "Next" button on the last page', () => {
    const pagination = { page: 5, totalPages: 5, total: 50, limit: 10 }
    render(
      <PaymentPagination pagination={pagination} onPageChange={onPageChange} />
    )
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('calls onPageChange with correct page number when a page link is clicked', () => {
    const pagination = { page: 2, totalPages: 5, total: 50, limit: 10 }
    render(
      <PaymentPagination pagination={pagination} onPageChange={onPageChange} />
    )

    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange with previous page number when "Previous" button is clicked', () => {
    const pagination = { page: 2, totalPages: 5, total: 50, limit: 10 }
    render(
      <PaymentPagination pagination={pagination} onPageChange={onPageChange} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('calls onPageChange with next page number when "Next" button is clicked', () => {
    const pagination = { page: 2, totalPages: 5, total: 50, limit: 10 }
    render(
      <PaymentPagination pagination={pagination} onPageChange={onPageChange} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('does not render pagination if totalPages is 1', () => {
    const pagination = { page: 1, totalPages: 1, total: 5, limit: 10 }
    render(
      <PaymentPagination pagination={pagination} onPageChange={onPageChange} />
    )
    expect(
      screen.queryByRole('navigation', { name: 'Pagination' })
    ).not.toBeInTheDocument()
  })
})
