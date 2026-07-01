# PII Filtering & Input Sanitization 🛡️

This document describes how Aqdy processes incoming texts (contracts and metadata) to strip Personally Identifiable Information (PII) and malicious payloads prior to database persistence and LLM inference.

---

## 🧼 Input Sanitization Flow

When a document is uploaded, its content is parsed (either via PDF or DOCX parsers) and immediately sanitized via `sanitizeText` from [security.middleware.ts](file:///d:/iti/0%20Final%20Project/aqdy/aqdy-platform/backend/src/middlewares/security.middleware.ts).

### 🛠️ Sanitization Mechanics

```typescript
export function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Strip HTML script tags
    .replace(/<[^>]*>/g, "")                                           // Strip other HTML tags
    .replace(/\0/g, "")                                                // Remove null bytes
    .trim();
}
```

This cleans:
1.  **Script Blocks**: Removes `<script>...</script>` tags entirely.
2.  **HTML Formatting**: Strips standard tags like `<div>`, `<a>`, `<href>` to prevent HTML injection.
3.  **Null Bytes (`\0`)**: Removes null bytes to protect native file-system integrations and regex libraries from memory corruption vectors.

---

## 🔒 PII Scrubbing Rules

Before contract texts are forwarded to Pinecone, stored in MongoDB Atlas, or processed by the LLM agents, they are scrubbed of sensitive personal data using the regex patterns defined in [piiFiltering.ts](file:///d:/iti/0%20Final%20Project/aqdy/aqdy-platform/backend/src/services/piiFiltering.ts).

### 📋 Supported Regular Expressions

The `redactPII` function applies regex matches and replaces sensitive values with `[REDACTED]`:

| Data Type | Regex Target | Description | Replacement Label |
| :--- | :--- | :--- | :--- |
| **Email Address** | `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g` | Captures standard email formatting | `[REDACTED]` |
| **Credit Card** | `/\b(?:\d[ -]*?){13,16}\b/g` | Captures 13-to-16 digit numbers (with spaces/dashes) | `[REDACTED]` |
| **Egyptian National ID** | `/\b[23]\d{13}\b/g` | Egyptian NID starting with 2 or 3 (14 digits) | `[REDACTED]` |
| **US SSN** | `/\b\d{3}-\d{2}-\d{4}\b/g` | Standard US Social Security Number pattern | `[REDACTED]` |
| **Egyptian Phone** | `/\b(?:010|011|012|015)\d{8}\b/g` | Captures Egyptian mobile network carriers | `[REDACTED]` |

---

## ⚠️ Identified Gaps & Future Hardening

1.  **Clause Chat Inputs**: Currently, the clause interactive chat router (`POST /api/contracts/:contractId/clauses/:clauseIndex/chat`) does **not** scrub user messages for PII. If a user asks a question mentioning names, IDs, or phone numbers, these are forwarded in the raw system prompts.
    *   *Remediation Plan*: Pipe `userMessage` through `redactPII` in `clauseChat.controller.ts` before constructing Langfuse or Gemini SDK calls.
2.  **Entity Name Recognition (NER)**: Simple regular expressions cannot catch names of contracting parties, physical addresses, or custom company registers.
    *   *Remediation Plan*: Integrate a lightweight named-entity recognition (NER) model or compromise-free legal-focused NLP libraries to redact names and corporate entities dynamically.
