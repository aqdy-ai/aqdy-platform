/**
 * UI Component Test Template
 * Use this for testing React components in /src/components
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MyComponent from '../../src/components/MyComponent.tsx';

describe('MyComponent', () => {
  it('should render the component with correct title', () => {
    render(<MyComponent title="Aqdy Platform" />);
    
    const element = screen.getByText(/Aqdy Platform/i);
    expect(element).toBeInTheDocument();
  });

  it('should trigger callback when button is clicked', () => {
    const mockFn = vi.fn();
    render(<MyComponent onClick={mockFn} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
