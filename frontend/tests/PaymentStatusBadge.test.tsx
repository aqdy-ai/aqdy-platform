// frontend/tests/components/features/billing/PaymentStatusBadge.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaymentStatusBadge } from '@/components/features/billing/PaymentStatusBadge';
import { useTranslation } from 'react-i18next';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key, // Mock t function to return the key
    i18n: {
      language: 'en',
      dir: () => 'ltr',
    },
  }),
}));

// Mock Shadcn Badge component
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ variant, children, className }: { variant: string; children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

describe('PaymentStatusBadge', () => {
  it('renders "succeeded" status correctly with green color', () => {
    render(<PaymentStatusBadge status="succeeded" />);
    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('billing.status_succeeded');
    expect(badge).toHaveAttribute('data-variant', 'default'); // Base variant
    expect(badge).toHaveClass('bg-green-500 text-green-50'); // Custom color class
  });

  it('renders "failed" status correctly with red color', () => {
    render(<PaymentStatusBadge status="failed" />);
    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('billing.status_failed');
    expect(badge).toHaveAttribute('data-variant', 'destructive');
    expect(badge).toHaveClass('bg-red-500 text-red-50');
  });

  it('renders "pending" status correctly with yellow color', () => {
    render(<PaymentStatusBadge status="pending" />);
    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('billing.status_pending');
    expect(badge).toHaveAttribute('data-variant', 'secondary');
    expect(badge).toHaveClass('bg-yellow-500 text-yellow-900');
  });

  it('renders "refunded" status correctly with blue color', () => {
    render(<PaymentStatusBadge status="refunded" />);
    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('billing.status_refunded');
    expect(badge).toHaveAttribute('data-variant', 'secondary');
    expect(badge).toHaveClass('bg-blue-500 text-blue-50');
  });

  it('renders default variant for unknown status', () => {
    // @ts-ignore - testing an invalid status for fallback
    render(<PaymentStatusBadge status="unknown" />);
    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('billing.status_unknown'); // Translation key remains the same
    expect(badge).toHaveAttribute('data-variant', 'default');
    expect(badge).toHaveClass('bg-gray-500 text-gray-50');
  });
});