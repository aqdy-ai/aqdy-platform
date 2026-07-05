# Multimodal AI

> Speech, and document processing capabilities.

## Speech-to-Text — Clause Chat Voice Input

**Location**: `frontend/src/components/features/ClauseChat.tsx`

- Uses the browser-native `SpeechRecognition` API (`webkitSpeechRecognition`).
- Users can tap a microphone button in the clause chat to speak their query instead of typing.
- Automatically detects when the user stops speaking and submits the transcribed text.
- Displays a listening indicator and handles errors (unsupported browser, transcription failure).
- Language is set dynamically based on the contract language (AR/EN).

Core utility: `frontend/src/lib/speech.ts` — manages voice initialization and cached voice lists.

## Text-to-Speech — Analysis Dashboard & Results

### Executive Summary (`frontend/src/components/features/ExecutiveSummary.tsx`)
- TTS toggle button reads the executive summary aloud.
- Uses `useSpeechSynthesis()` hook with `ar-EG` for Arabic contracts and `en-US` for English.
- Visual play/pause indicator while speaking.

### Clause Cards (`frontend/src/components/features/ClauseCard.tsx`)
- Each clause card has a speaker icon to read the clause text aloud.
- Only rendered when `window.speechSynthesis` is available.

### Analytics Dashboard (`frontend/src/pages/admin/AnalyticsDashboard.tsx`)
- TTS toggle to read dashboard metrics aloud.
- Uses `speakText()` from `frontend/src/lib/speech.ts`.

### TTS Utility (`frontend/src/lib/speech.ts`, `frontend/src/hooks/useSpeechSynthesis.ts`)
- Wraps the browser `window.speechSynthesis` API.
- `speakText(text, lang)` — speaks text in the specified language.
- `useSpeechSynthesis()` hook — provides `speak`, `stop`, `toggle`, `isPlaying`, `isSupported` state.
- Voice selection: prioritizes a voice matching the requested language tag, falls back to language prefix match.

## Document Format Handling

| Format | Library | Approach |
|--------|---------|----------|
| PDF | `pdfjs-dist` v5.4.296 | Text layer extraction |
| DOCX | `mammoth` v1.12.0 | Conversion to HTML, then plain text |
| Plain text | Native | Direct input via contract upload |

All formats produce raw text that feeds into the text extraction pipeline with OCR artifact handling in the ExtractorAgent prompt.
