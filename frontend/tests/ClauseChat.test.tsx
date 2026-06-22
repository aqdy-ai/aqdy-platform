/* tests/ClauseChat.test.tsx */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import ClauseChat from '../src/components/features/ClauseChat'

let currentLang = 'en'

const translations: Record<string, Record<string, string>> = {
  en: {
    'chat.chat_about_clause': 'Chat about this clause',
    'chat.hide_chat': 'Hide chat',
    'chat.credits_cost': '~5 credits',
    'chat.insufficient_credits': 'Insufficient credits.',
    'chat.upgrade_cta': 'Upgrade Plan',
    'chat.rate_limit_reached': 'Rate limit reached (20 messages).',
    'chat.placeholder': 'Ask a question about this clause...',
    'chat.send': 'Send',
    'chat.suggested_questions.q1': 'What does this mean for me?',
    'chat.suggested_questions.q2': 'Is this standard in MENA contracts?',
    'chat.suggested_questions.q3': 'How should I negotiate this?',
    'chat.suggested_questions.q4': 'What is the worst-case risk here?',
    'common.error': 'Something went wrong',
  },
  ar: {
    'chat.chat_about_clause': 'اسأل حول هذا البند',
    'chat.hide_chat': 'إخفاء المحادثة',
    'chat.credits_cost': '~5 نقاط',
    'chat.insufficient_credits': 'رصيد غير كافٍ.',
    'chat.upgrade_cta': 'ترقية الباقة',
    'chat.rate_limit_reached': 'تم الوصول للحد الأقصى (20 رسالة).',
    'chat.placeholder': 'اسأل سؤالاً حول هذا البند...',
    'chat.send': 'إرسال',
    'chat.suggested_questions.q1': 'ماذا يعني هذا بالنسبة لي؟',
    'chat.suggested_questions.q2': 'هل هذا قياسي في عقود الشرق الأوسط وشمال أفريقيا؟',
    'chat.suggested_questions.q3': 'كيف يجب أن أفاوض على هذا البند؟',
    'chat.suggested_questions.q4': 'ما هو أسوأ سيناريو للمخاطر هنا؟',
    'common.error': 'حدث خطأ ما',
  },
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[currentLang]?.[key] ?? key,
    i18n: {
      get language() {
        return currentLang
      },
    },
  }),
}))

const Wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

describe('ClauseChat Component', () => {
  const mockProps = {
    contractId: 'contract_123',
    clauseIndex: 2,
    clauseText: 'The Service Provider shall not be liable for indirect damages.',
  }

  beforeEach(() => {
    currentLang = 'en'
    vi.stubGlobal('fetch', vi.fn())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper to create mocked stream responses
  function createMockStream(chunks: string[], delayMs = 10) {
    const encoder = new TextEncoder()
    return new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          if (delayMs > 0) {
            await new Promise((r) => setTimeout(r, delayMs))
          }
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      },
    })
  }

  it('renders chat layout and direction correctly in LTR (EN)', () => {
    render(<ClauseChat {...mockProps} />, { wrapper: Wrapper })

    const container = screen.getByTestId('clause-chat-container')
    expect(container).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('Chat about this clause')).toBeInTheDocument()
    expect(screen.getByText('~5 credits')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ask a question about this clause...')).toBeInTheDocument()
  })

  it('renders chat layout and direction correctly in RTL (AR)', () => {
    currentLang = 'ar'
    render(<ClauseChat {...mockProps} />, { wrapper: Wrapper })

    const container = screen.getByTestId('clause-chat-container')
    expect(container).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText('اسأل حول هذا البند')).toBeInTheDocument()
    expect(screen.getByText('~5 نقاط')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('اسأل سؤالاً حول هذا البند...')).toBeInTheDocument()
  })

  it('populates input field when suggested question chips are clicked', () => {
    render(<ClauseChat {...mockProps} />, { wrapper: Wrapper })

    const chip = screen.getByText('What does this mean for me?')
    fireEvent.click(chip)

    const textarea = screen.getByPlaceholderText('Ask a question about this clause...') as HTMLTextAreaElement
    expect(textarea.value).toBe('What does this mean for me?')
  })

  it('disables input and send button during active streaming, and enables them when done', async () => {
    const stream = createMockStream(['data: {"text": "AI response"}\n\n', 'data: [DONE]\n\n'])
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    } as any)

    render(<ClauseChat {...mockProps} />, { wrapper: Wrapper })

    const textarea = screen.getByPlaceholderText('Ask a question about this clause...') as HTMLTextAreaElement
    const sendButton = screen.getByLabelText('Send')

    // Set input and send
    fireEvent.change(textarea, { target: { value: 'Explain this clause' } })
    fireEvent.click(sendButton)

    // Verify controls are disabled during active request/streaming
    expect(textarea).toBeDisabled()
    expect(sendButton).toBeDisabled()

    // Wait for stream to finish
    await waitFor(() => {
      expect(screen.getByText('AI response')).toBeInTheDocument()
    })

    // Verify controls are enabled again
    await waitFor(() => {
      expect(textarea).not.toBeDisabled()
    })
    expect(textarea.value).toBe('')
  })

  it('submits on Enter key press but allows newline on Shift+Enter', async () => {
    const stream = createMockStream(['data: {"text": "Ack"}\n\n'])
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    } as any)

    render(<ClauseChat {...mockProps} />, { wrapper: Wrapper })

    const textarea = screen.getByPlaceholderText('Ask a question about this clause...') as HTMLTextAreaElement

    // Typing with Shift+Enter
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    // Verify fetch has NOT been called because Shift+Enter allows a newline
    expect(global.fetch).not.toHaveBeenCalled()

    // Pressing normal Enter
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('accumulates chunks incrementally and builds response text instead of replacing it', async () => {
    const stream = createMockStream([
      'data: {"text": "This "}\n\n',
      'data: {"text": "is "}\n\n',
      'data: {"text": "a "}\n\n',
      'data: {"text": "test."}\n\n',
      'data: [DONE]\n\n',
    ], 20)

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    } as any)

    render(<ClauseChat {...mockProps} />, { wrapper: Wrapper })

    const textarea = screen.getByPlaceholderText('Ask a question about this clause...') as HTMLTextAreaElement
    const sendButton = screen.getByLabelText('Send')

    fireEvent.change(textarea, { target: { value: 'Run test stream' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('This is a test.')).toBeInTheDocument()
    })
  })

  it('propagates historical messages in subsequent API requests', async () => {
    const stream1 = createMockStream(['data: {"text": "AI Answer 1"}\n\n', 'data: [DONE]\n\n'], 0)
    const stream2 = createMockStream(['data: {"text": "AI Answer 2"}\n\n', 'data: [DONE]\n\n'], 0)

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream1,
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream2,
      } as any)

    render(<ClauseChat {...mockProps} />, { wrapper: Wrapper })

    const textarea = screen.getByPlaceholderText('Ask a question about this clause...') as HTMLTextAreaElement
    const sendButton = screen.getByLabelText('Send')

    // Message 1
    fireEvent.change(textarea, { target: { value: 'Question 1' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('AI Answer 1')).toBeInTheDocument()
    })

    // Message 2
    fireEvent.change(textarea, { target: { value: 'Question 2' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('AI Answer 2')).toBeInTheDocument()
    })

    // Check second fetch payload for history propagation
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/contracts/contract_123/clauses/2/chat',
      expect.objectContaining({
        body: JSON.stringify({
          message: 'Question 2',
          history: [
            { role: 'user', content: 'Question 1' },
            { role: 'assistant', content: 'AI Answer 1' },
          ],
        }),
      })
    )
  })

  it('handles 402 Insufficient Credits with an inline warning and pricing link CTA', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ success: false, error: 'Insufficient credits available.' }),
    } as any)

    render(<ClauseChat {...mockProps} />, { wrapper: Wrapper })

    const textarea = screen.getByPlaceholderText('Ask a question about this clause...') as HTMLTextAreaElement
    const sendButton = screen.getByLabelText('Send')

    fireEvent.change(textarea, { target: { value: 'Will this fail?' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('Insufficient credits.')).toBeInTheDocument()
    })

    const link = screen.getByRole('link', { name: 'Upgrade Plan' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/pricing')
  })

  it('handles 429 Rate Limit reached with a notice', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ success: false, error: 'Rate limit exceeded.' }),
    } as any)

    render(<ClauseChat {...mockProps} />, { wrapper: Wrapper })

    const textarea = screen.getByPlaceholderText('Ask a question about this clause...') as HTMLTextAreaElement
    const sendButton = screen.getByLabelText('Send')

    fireEvent.change(textarea, { target: { value: 'Will this rate limit?' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('Rate limit reached (20 messages).')).toBeInTheDocument()
    })
  })

  it('aborts active streaming reader on unmount or on clause/contract changes', async () => {
    const cancelMock = vi.fn()
    const mockReader = {
      read: async () => new Promise(() => { }), // hangs/never completes
      cancel: cancelMock,
    }
    const mockBody = {
      getReader: () => mockReader,
    }

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      body: mockBody,
    } as any)

    const { unmount, rerender } = render(<ClauseChat {...mockProps} />, { wrapper: Wrapper })

    const textarea = screen.getByPlaceholderText('Ask a question about this clause...') as HTMLTextAreaElement
    const sendButton = screen.getByLabelText('Send')

    fireEvent.change(textarea, { target: { value: 'Trigger cleanup' } })
    fireEvent.click(sendButton)

    // Wait for fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Rerender with a new clauseIndex
    rerender(<ClauseChat {...mockProps} clauseIndex={9} />)

    // Verify stream was cancelled
    expect(cancelMock).toHaveBeenCalled()

    // Trigger another stream
    fireEvent.change(textarea, { target: { value: 'Trigger cleanup again' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    // Unmount
    unmount()

    // Verify stream was cancelled again
    expect(cancelMock).toHaveBeenCalledTimes(2)
  })
})
