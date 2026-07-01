# OWASP LLM Top 10 Security Control Mapping 🛡️

This document details how the Aqdy contract analysis platform mitigates the **OWASP Top 10 for Large Language Model (LLM) Applications** (2023 version) using specific code references and control mechanisms.

---

## 📋 Security Mapping Table

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

## 🛠️ Mitigations & Code References

### LLM01: Prompt Injection
To defend against jailbreaks and prompt override attempts, Aqdy scans incoming prompt contexts against specific patterns before invoking agents.
*   **Active Patterns**: Scans for English strings (e.g. `ignore all previous instructions`) and Arabic equivalents (e.g. `تجاهل جميع التعليمات`).
*   **Implementation**: Done inside `SanitizationService` (`backend/src/services/sanitization.service.ts`) using the `detectPromptInjection` method.

### LLM02: Insecure Output Handling
To prevent raw LLM output from introducing script injection or formatting breaks:
*   **Strict Typing**: We use Zod schemas to enforce the shape of LLM outputs.
*   **JSON Repair**: If the model outputs malformed JSON, `json-repair` is run to clean the formatting.
*   **Render Security**: The React frontend treats all values as plain text data, preventing XSS injection from the LLM outputs.

### LLM04: Model Denial of Service
To prevent malicious scripts from flooding model APIs and causing budget exhaustion:
*   **Global Rate Limits**: Express rate limiters restrict anonymous users to 20 requests per 15 minutes.
*   **Authenticated Limits**: Standard tiers are capped at 10 analysis uploads per 24 hours.
*   **Granular Limits**: Clause chat is throttled to 20 messages per user per clause per day.

### LLM09: Overreliance & Hallucination Mitigations
To ensure accuracy of legal recommendations and prevent model hallucination:
*   **Vector Database Grounding**: The system searches Pinecone for exact matches within the curated 50-clause Legal Knowledge Base (`legalKB.json`).
*   **Confidence Blending**: The LLM confidence rating is combined with Pinecone's vector similarity score to determine final risk alerts.
*   **System Prompt Boundaries**: Prompts force the model to reject queries unrelated to the specific clause or not supported by the provided text.
