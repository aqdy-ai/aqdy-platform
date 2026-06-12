/* src/components/features/ClauseChat.tsx */
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare, Send, AlertCircle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export interface ClauseChatProps {
  contractId: string
  clauseIndex: number
  clauseText: string
}

export default function ClauseChat({
  contractId,
  clauseIndex,
  clauseText,
}: ClauseChatProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<{
    type: '402' | '429' | 'generic'
    message: string
  } | null>(null)
  const [prevIndex, setPrevIndex] = useState(clauseIndex)
  const [prevContract, setPrevContract] = useState(contractId)

  if (clauseIndex !== prevIndex || contractId !== prevContract) {
    setPrevIndex(clauseIndex)
    setPrevContract(contractId)
    setMessages([])
    setError(null)
    setIsStreaming(false)
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const activeReaderRef =
    useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (
      messagesEndRef.current &&
      typeof messagesEndRef.current.scrollIntoView === 'function'
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Cleanup active streams and requests
  const cleanupStream = () => {
    if (activeReaderRef.current) {
      try {
        activeReaderRef.current.cancel()
      } catch (err) {
        console.warn('Reader cancel failed:', err)
      }
      activeReaderRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      cleanupStream()
    }
  }, [])

  // Cleanup active streams if props change without unmounting
  useEffect(() => {
    cleanupStream()
  }, [contractId, clauseIndex])

  const suggestedQuestions = [
    t('chat.suggested_questions.q1', 'What does this mean for me?'),
    t('chat.suggested_questions.q2', 'Is this standard in MENA contracts?'),
    t('chat.suggested_questions.q3', 'How should I negotiate this?'),
    t('chat.suggested_questions.q4', 'What is the worst-case risk here?'),
  ]

  const handleChipClick = (question: string) => {
    if (isStreaming) return
    setInput(question)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleSend = async () => {
    if (isStreaming || !input.trim()) return

    const userMessage = input.trim()
    setInput('')
    setError(null)

    // Save previous history to send to API
    const historyPayload = messages
      .filter((m) => !m.isStreaming)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }))

    // Add user message to UI
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsStreaming(true)

    // Set up AbortController
    cleanupStream()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch(
        `/api/contracts/${contractId}/clauses/${clauseIndex}/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            history: historyPayload,
          }),
          signal: abortController.signal,
        }
      )

      if (response.status === 402) {
        setError({
          type: '402',
          message: t('chat.insufficient_credits', 'Insufficient credits.'),
        })
        setIsStreaming(false)
        return
      }

      if (response.status === 429) {
        setError({
          type: '429',
          message: t(
            'chat.rate_limit_reached',
            'Rate limit reached (20 messages).'
          ),
        })
        setIsStreaming(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to get response from server')
      }

      // Add placeholder assistant message for streaming
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', isStreaming: true },
      ])

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }
      activeReaderRef.current = reader

      const decoder = new TextDecoder()
      let partialLine = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunkText = decoder.decode(value, { stream: true })
        const lines = (partialLine + chunkText).split('\n')
        partialLine = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const dataContent = trimmed.slice(6).trim()
          if (dataContent === '[DONE]') {
            continue
          }

          try {
            const parsed = JSON.parse(dataContent)
            if (parsed.text) {
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last && last.role === 'assistant') {
                  last.content += parsed.text
                }
                return next
              })
            } else if (parsed.error) {
              setError({
                type: 'generic',
                message: parsed.error,
              })
            }
          } catch {
            // Ignore incomplete JSON chunks
          }
        }
      }

      // Mark streaming completed
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last && last.role === 'assistant') {
          delete last.isStreaming
        }
        return next
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Ignored, request was cancelled intentionally
        return
      }
      console.error('Error during clause chat request:', err)
      setError({
        type: 'generic',
        message: t('common.error', 'Something went wrong'),
      })
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
      activeReaderRef.current = null
    }
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="bg-card border-border/60 flex flex-col rounded-2xl border p-4 shadow-inner"
      data-testid="clause-chat-container"
    >
      {/* Header */}
      <div
        className="border-border/40 mb-3 flex items-center gap-2 border-b pb-2"
        aria-describedby={`clause-chat-desc-${clauseIndex}`}
      >
        <span id={`clause-chat-desc-${clauseIndex}`} className="sr-only">
          Chatting about: {clauseText}
        </span>
        <MessageSquare size={16} className="text-primary" />
        <h4 className="text-foreground text-sm font-bold">
          {t('chat.chat_about_clause', 'Chat about this clause')}
        </h4>
        {isStreaming && (
          <RefreshCw size={12} className="text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Messages Window */}
      <div className="bg-muted/30 border-border/40 mb-3 flex max-h-[300px] min-h-[120px] flex-col gap-3 overflow-y-auto rounded-xl border p-3">
        {messages.length === 0 && (
          <div className="text-muted-foreground my-auto text-center text-xs font-medium">
            {isRtl
              ? 'اطرح أي سؤال حول تفاصيل هذا البند وصياغته ومخاطره.'
              : 'Ask any question about this clause details, negotiation points, or risks.'}
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === 'user'
          return (
            <div
              key={index}
              className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed font-medium shadow-sm select-text ${
                  isUser
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-secondary text-secondary-foreground rounded-tl-none'
                }`}
              >
                {msg.content}
                {msg.isStreaming && (
                  <span
                    className="ml-0.5 inline-block animate-pulse"
                    aria-hidden="true"
                  >
                    |
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* Errors Container */}
        {error && (
          <div
            className="border-destructive/20 bg-destructive/10 text-destructive flex items-center justify-between rounded-xl border p-3 text-xs leading-normal font-bold"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error.message}</span>
            </div>
            {error.type === '402' && (
              <Link
                to="/pricing"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/95 rounded-lg px-2.5 py-1 font-bold shadow-sm transition-all"
              >
                {t('chat.upgrade_cta', 'Upgrade Plan')}
              </Link>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      <div
        className="mb-2 flex flex-wrap gap-1.5"
        role="group"
        aria-label="Suggested questions"
      >
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleChipClick(q)}
            disabled={isStreaming}
            className="bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground cursor-pointer rounded-full px-3 py-1.5 text-start text-[10px] font-bold transition-all disabled:pointer-events-none disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Row */}
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder={t(
              'chat.placeholder',
              'Ask a question about this clause...'
            )}
            rows={1}
            className="border-border/60 focus:border-primary bg-card text-foreground placeholder:text-muted-foreground focus:ring-primary max-h-[100px] min-h-[38px] w-full resize-none overflow-y-auto rounded-xl border px-3 py-2 text-xs font-semibold shadow-inner transition-all outline-none focus:ring-1 disabled:pointer-events-none disabled:opacity-50"
            style={{ direction: isRtl ? 'rtl' : 'ltr' }}
          />
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="text-muted-foreground text-[9px] leading-none font-bold">
            {t('chat.credits_cost', '~5 credits')}
          </span>
          <button
            onClick={() => void handleSend()}
            disabled={isStreaming || !input.trim()}
            aria-label={t('chat.send', 'Send')}
            className="bg-primary hover:bg-primary/95 text-primary-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl shadow-md transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            <Send size={14} className={isRtl ? 'rotate-180' : ''} />
          </button>
        </div>
      </div>
    </div>
  )
}
