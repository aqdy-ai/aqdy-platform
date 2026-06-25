# Multimodal Capabilities

> **Status**: Deferred — No multimodal features are implemented in v1.0.

This document records the multimodal scope decisions for the Aqdy platform.

---

## Current State (v1.0)

The Aqdy v1.0 contract analysis pipeline is **text-only**. All inputs enter the AI pipeline as extracted plain text.

### Document Ingestion — Text Extraction Only

| Format | Service | Library | Input | Output |
|--------|---------|---------|-------|--------|
| PDF | [`pdf.service.ts`](file:///g:/proj/aqdy-platform/backend/src/services/pdf.service.ts) | `pdfjs-dist` | Binary PDF buffer | Plain text (page-by-page concatenation) |
| DOCX | [`docx.service.ts`](file:///g:/proj/aqdy-platform/backend/src/services/docx.service.ts) | `mammoth` | Binary DOCX buffer | Plain text via `extractRawText()` |

Both services extract **machine-readable text layers** from digital documents. They do **not** perform optical character recognition (OCR), image analysis, or any visual processing.

### LLM Interaction — Text-Only

| Component | Model(s) | Input Modality |
|-----------|----------|----------------|
| [`llm.service.ts`](file:///g:/proj/aqdy-platform/backend/src/services/llm.service.ts) | GPT-4o (primary) / Gemini 3.1 Flash Lite (fallback) | Text only (SystemMessage + HumanMessage) |
| [`langchain.config.ts`](file:///g:/proj/aqdy-platform/backend/src/config/langchain.config.ts) | Same as above | `ChatPromptTemplate.fromMessages()` — text strings only |

All three agents (Extractor, RiskClassifier, Redline) communicate with LLMs exclusively through `@langchain/core/messages` using `SystemMessage` and `HumanMessage` — both text-only message types. No `HumanMessage` with `image_url` content parts, no `Blob` inputs, and no multimodal content blocks are used anywhere in the codebase.

---

## Deferred Multimodal Features

The following multimodal capabilities were considered for Aqdy but **explicitly deferred** from the v1.0 scope. Rationale is documented for each.

### 1. Vision/OCR for Scanned Contracts

**Description**: Process scanned PDF contracts (image-only pages, no text layer) by using an OCR engine or a vision-capable LLM to extract text from page images.

**Rationale for deferral**:

- **Scope prioritization**: v1.0 focuses on digital-native contracts (typed PDFs and DOCX files), which represent the majority of contracts uploaded to SaaS platforms in the MENA region. Scanned documents are a minority use case for the initial target market.
- **OCR complexity for Arabic**: Arabic OCR introduces significant challenges — right-to-left text, ligature handling, diacritics (tashkeel), and mixed Arabic/English layout. Off-the-shelf OCR (Tesseract) has limited accuracy for Arabic legal documents; a production-quality solution would require fine-tuning or a specialized service (e.g., Google Cloud Vision, Azure Document Intelligence), adding cost and complexity.
- **Quality vs. coverage trade-off**: Poor OCR accuracy would cascade into extraction and classification errors, undermining the platform's 95%+ accuracy target. It is better to reject scanned documents gracefully than to deliver unreliable analyses.
- **Current behavior**: `pdfService.parsePdf()` will throw an error (`"Could not extract text from PDF."`) if a PDF has no text layer, giving the user a clear signal that the document is not supported.

**Planned approach (future)**:

| Option | Service | Pros | Cons |
|--------|---------|------|------|
| A. Cloud Vision API | Google Cloud Vision / Azure Document Intelligence | High Arabic accuracy, layout-aware | Adds external dependency, per-page cost |
| B. Gemini Vision | GPT-4o / Gemini multimodal input | Direct image → text via existing LLM | Higher token cost, may hallucinate on low-quality scans |
| C. Dedicated OCR pipeline | Tesseract + Arabic fine-tuned model | Self-hosted, no API cost | Requires training data, maintenance burden |

**Recommended for v2.0**: Option A (Cloud Vision) for page-level OCR, with extracted text feeding into the existing text pipeline. This isolates the OCR concern and keeps the agent pipeline unchanged.

### 2. Image/Table Extraction from Contracts

**Description**: Extract and analyze tables, charts, signatures, stamps, or embedded images within contracts.

**Rationale for deferral**:

- Not required for clause-level risk analysis, which operates on textual content.
- Table extraction from PDFs is a distinct, complex problem (spanning columns, merged cells) better addressed by dedicated document intelligence services.
- No user demand signal for this feature in the initial market research.

### 3. Audio/Voice Input (Speech-to-Text & Text-to-Speech)

**Description**: Allow users to interact with the Clause Chat using voice. Speech-to-Text allows users to dictate questions, and Text-to-Speech allows listening to AI-synthesized responses read aloud.

**Implementation Details (v1.1)**:
- **Speech-to-Text**: Implemented using the browser-native `SpeechRecognition` API. When the user clicks the microphone button next to the chat text area, it records voice and appends transcribed text to the chat input area.
- **Text-to-Speech**: Implemented using browser-native `speechSynthesis` API. A speaker icon is shown next to AI assistant responses. Clicking it reads the response aloud.
- **Language Configurations**:
  - Arabic: Configured to Egyptian Arabic (`ar-EG`) for both recognition and synthesis.
  - English: Configured to US English (`en-US`).
- **Safety and Reliability**:
  - **Browser Support Detection**: Checks if `window.SpeechRecognition || window.webkitSpeechRecognition` is defined. If unsupported, the microphone feature is disabled, displaying a clear user-facing fallback message: *"Voice input is not supported in this browser."*
  - **Graceful Degradation**: Text chat remains completely functional even if speech synthesis or recognition features are unsupported or permission is denied.
  - **Cleanup**: Stopping recognition (`recognition.abort()`) and cancelling speech playback (`speechSynthesis.cancel()`) are handled immediately on component unmount to prevent resource/audio leaks.
  - **Concurrent Audio Playback Prevention**: Before any message starts playing, `speechSynthesis.cancel()` is invoked to prevent overlapping audio playback. Only one assistant response can play at a time.

- **Browser Compatibility & Limitations**:
  - *Google Chrome / Microsoft Edge*: Full support for both Speech Recognition and Speech Synthesis. Offers very high accuracy for Arabic legal dictation utilizing cloud-based processing.
  - *Apple Safari*: Supported on both macOS and iOS. Speech synthesis requires direct user interaction to trigger playback (which aligns with our speaker button model).
  - *Mozilla Firefox*: Speech synthesis is fully supported. Speech recognition is disabled by default behind the `media.webspeech.recognition.enable` preference flag in Firefox configuration. If disabled, the interface gracefully degrades and presents the unsupported message.
  - *Internet Requirement*: Dictation transcription requires an active internet connection on most browsers, as recognition is typically processed online.

---

## Summary

| Capability | Status | Target Release |
|-----------|--------|----------------|
| Text extraction from digital PDFs | ✅ Implemented | v1.0 |
| Text extraction from DOCX files | ✅ Implemented | v1.0 |
| OCR for scanned PDFs | ❌ Deferred | v2.0 (planned) |
| Image/table extraction | ❌ Deferred | TBD |
| Speech-to-Text (STT) Clause Chat | ✅ Implemented | v1.1 |
| Text-to-Speech (TTS) Clause Chat | ✅ Implemented | v1.1 |

> [!IMPORTANT]
> When scanned PDF support is added in v2.0, the OCR step should be implemented as a **pre-processing service** that outputs plain text, keeping the three-agent pipeline unchanged. The `pdf.service.ts` can be extended with a `hasTextLayer()` check to route scanned documents to the OCR path automatically.

---

*Last updated: Sprint 2. Owners: Engineering team. This document should be updated when multimodal features are added or scope decisions change.*
