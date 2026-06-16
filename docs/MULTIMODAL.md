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

### 3. Audio/Voice Input

**Description**: Allow users to upload or record audio (e.g., verbal contract negotiations) for transcription and analysis.

**Rationale for deferral**:

- Outside the core value proposition of written contract analysis.
- Transcription services (Whisper, Google Speech-to-Text) are mature but add an orthogonal integration layer.
- Can be added later as a preprocessing step that feeds transcribed text into the existing pipeline.

---

## Summary

| Capability | Status | Target Release |
|-----------|--------|----------------|
| Text extraction from digital PDFs | ✅ Implemented | v1.0 |
| Text extraction from DOCX files | ✅ Implemented | v1.0 |
| OCR for scanned PDFs | ❌ Deferred | v2.0 (planned) |
| Image/table extraction | ❌ Deferred | TBD |
| Audio/voice input | ❌ Deferred | TBD |

> [!IMPORTANT]
> When scanned PDF support is added in v2.0, the OCR step should be implemented as a **pre-processing service** that outputs plain text, keeping the three-agent pipeline unchanged. The `pdf.service.ts` can be extended with a `hasTextLayer()` check to route scanned documents to the OCR path automatically.

---

*Last updated: Sprint 2. Owners: Engineering team. This document should be updated when multimodal features are added or scope decisions change.*
