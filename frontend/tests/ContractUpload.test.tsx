import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import ContractUpload from '../src/components/features/ContractUpload'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar' },
  }),
}))

// Mock framer-motion to remove animation complexity in jsdom
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      layout: _layout,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    ),
    button: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    ),
    span: ({
      children,
      animate: _animate,
      transition: _transition,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...(props as React.HTMLAttributes<HTMLSpanElement>)}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

// Helper: simulate a file upload via fireEvent (sync, no userEvent async issues)
function uploadFile(file: File) {
  const input = document.getElementById(
    'contract-upload-input'
  ) as HTMLInputElement
  expect(input).toBeInTheDocument()
  fireEvent.change(input, { target: { files: [file] } })
}

const PDF_FILE = new File(['contract'], 'contract.pdf', {
  type: 'application/pdf',
})

describe('ContractUpload', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render the contract upload component', () => {
    render(<ContractUpload />)
    // upload.title is rendered via t('upload.title') which returns the key
    expect(screen.getByText('upload.title')).toBeInTheDocument()
  })

  it('should show the file name after file is selected', () => {
    render(<ContractUpload />)

    act(() => {
      uploadFile(PDF_FILE)
    })

    // File name should now be visible in the selected-file card
    expect(screen.getByText('contract.pdf')).toBeInTheDocument()
  })

  it('should show analyze button after upload completes', () => {
    render(<ContractUpload />)

    act(() => {
      uploadFile(PDF_FILE)
    })

    // Advance through the upload simulation (11 steps × 200ms = 2200ms)
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    // After upload completes, the analyze button appears
    const analyzeBtn = screen.getByRole('button', {
      name: /upload.analyze_button/i,
    })
    expect(analyzeBtn).toBeInTheDocument()
    expect(analyzeBtn).toBeEnabled()
  })

  it('should remove file when clicking remove button', () => {
    render(<ContractUpload />)

    act(() => {
      uploadFile(PDF_FILE)
    })

    // Advance timers so upload completes and remove button is visible
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    const removeBtn = screen.getByRole('button', { name: /common.remove/i })
    expect(removeBtn).toBeInTheDocument()

    act(() => {
      fireEvent.click(removeBtn)
    })

    expect(screen.queryByText('contract.pdf')).not.toBeInTheDocument()
  })
})
