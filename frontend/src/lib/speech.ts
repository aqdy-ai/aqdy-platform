let cachedVoices: SpeechSynthesisVoice[] | null = null

export function initSpeechSynthesis(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices()
  }
}

export function getVoiceForLang(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null

  const liveVoices = window.speechSynthesis.getVoices()
  if (liveVoices.length > 0) {
    cachedVoices = liveVoices
  }

  if (!cachedVoices || cachedVoices.length === 0) return null

  let voice = cachedVoices.find((v) => v.lang === lang) || null
  if (!voice) {
    const prefix = lang.split('-')[0]
    voice = cachedVoices.find((v) => v.lang.startsWith(prefix)) || null
  }
  return voice
}

export function speakText(
  text: string,
  lang = 'en-US',
  options?: { rate?: number; pitch?: number }
): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = options?.rate ?? 1
  utterance.pitch = options?.pitch ?? 1

  const voice = getVoiceForLang(lang)
  if (voice) utterance.voice = voice

  window.speechSynthesis.speak(utterance)

  return utterance
}
