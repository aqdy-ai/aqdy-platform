import { useCallback, useRef, useState } from 'react'
import { speakText } from '../lib/speech'

interface UseSpeechSynthesisOptions {
  onEnd?: () => void
  onError?: (event: SpeechSynthesisErrorEvent) => void
}

export function useSpeechSynthesis(options?: UseSpeechSynthesisOptions) {
  const [isPlaying, setIsPlaying] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback(
    (text: string, lang = 'en-US') => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return

      window.speechSynthesis.cancel()

      const utterance = speakText(text, lang)

      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => {
        setIsPlaying(false)
        options?.onEnd?.()
      }
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event)
        setIsPlaying(false)
        options?.onError?.(event)
      }

      utteranceRef.current = utterance
    },
    [options]
  )

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setIsPlaying(false)
  }, [])

  const toggle = useCallback(
    (text: string, lang = 'en-US') => {
      if (isPlaying) {
        stop()
      } else {
        speak(text, lang)
      }
    },
    [isPlaying, speak, stop]
  )

  return { isPlaying, speak, stop, toggle }
}
