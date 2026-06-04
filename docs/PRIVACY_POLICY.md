# Privacy Policy

**Aqdy — AI-Powered Legal Contract Analysis**
**Effective Date:** June 4, 2026
**Last Updated:** June 4, 2026

---

## 1. Introduction

Welcome to Aqdy ("we", "us", or "our"). Aqdy is an AI-powered legal contract analysis platform that helps individuals and businesses review, classify, and redline contracts in Arabic and English.

This Privacy Policy explains how we collect, use, store, share, and protect your personal information when you use our website, application, and related services (collectively, the "Service"). By using Aqdy, you agree to the practices described in this policy.

If you do not agree with any part of this policy, please discontinue use of the Service.

---

## 2. Information We Collect

### 2.1 Information You Provide Directly

- **Account Information:** When you register, we collect your name, email address, and password (stored in hashed form).
- **Contract Documents:** Files you upload for analysis (PDF or DOCX format). These are processed to extract text for AI analysis.
- **Profile Updates:** Any changes you make to your name, email, or password via account settings.
- **Payment Information:** When you subscribe to a paid plan, payment details (such as credit card information) are collected and processed by our third-party payment provider (Stripe). We do not store full payment card details on our servers.
- **Communications:** If you contact our support team, we retain the content of those communications.

### 2.2 Information Collected Automatically

- **Usage Data:** Pages visited, features used, analysis requests made, timestamps, and session duration.
- **Device and Technical Data:** IP address, browser type, operating system, and device identifiers.
- **Log Data:** Server logs including API requests, error events, and response times. Logs are retained for security monitoring and debugging.
- **Cookies and Similar Technologies:** We use cookies and session tokens (stored in httpOnly cookies) to authenticate users and maintain sessions. See Section 9 for details.

### 2.3 AI Analysis Data

When you submit a contract for analysis, the document text is processed through our AI pipeline (Extractor Agent → Risk Classifier Agent → Redline Generator Agent). Analysis results — including identified clauses, risk classifications, confidence scores, and suggested redlines — are stored in association with your account to provide contract history and allow retrieval of past results.

---

## 3. Personally Identifiable Information (PII) Filtering

Aqdy implements automatic PII detection and redaction before contract text is passed to AI models. This includes identification and masking of:

- Phone numbers
- Email addresses
- National identification numbers
- Credit card numbers
- Other sensitive personal identifiers

While we make reasonable efforts to detect and redact PII, we cannot guarantee complete removal of all sensitive information. You are encouraged to review documents before upload and avoid uploading documents containing sensitive third-party personal data where not necessary.

---

## 4. How We Use Your Information

We use the information we collect to:

- **Provide the Service:** Process uploaded contracts, generate AI-powered analysis reports, and display results.
- **Account Management:** Create and maintain your account, authenticate logins, and manage subscription plans and credit balances.
- **Billing and Payments:** Process subscription payments, generate invoices, enforce plan limits, and handle billing history.
- **Credit Enforcement:** Track monthly credit usage and deduct credits per analysis according to your subscription tier.
- **Security:** Detect and prevent fraud, abuse, prompt injection attacks, unauthorized access, and other harmful activity.
- **Compliance and Audit:** Maintain audit logs of key actions (uploads, analyses, account changes, admin actions) for compliance, debugging, and dispute resolution.
- **Service Improvement:** Analyze aggregate usage patterns to improve accuracy, performance, and features.
- **Communications:** Send transactional emails (account confirmation, payment receipts, analysis completion notifications) and, where you have opted in, product updates.
- **Legal Obligations:** Comply with applicable law, respond to lawful requests from authorities, and enforce our Terms of Service.

We do not use your contract documents to train AI models without your explicit consent.

---

## 5. Legal Basis for Processing (GDPR)

If you are located in the European Economic Area (EEA) or a jurisdiction with similar data protection laws, we process your personal data on the following legal bases:

- **Contract Performance:** Processing necessary to provide the Service you have subscribed to.
- **Legitimate Interests:** Security monitoring, fraud prevention, service analytics, and system improvement.
- **Legal Obligation:** Compliance with applicable laws and regulations.
- **Consent:** For optional communications and marketing (you may withdraw consent at any time).

---

## 6. Data Retention

| Data Type | Retention Period |
|-----------|-----------------|
| Account information | Duration of account plus 30 days after deletion |
| Uploaded contract documents | Duration of account (or until you delete them) |
| Analysis results and contract history | Duration of account (or until you delete them) |
| Audit logs | 12 months |
| Payment records | 7 years (legal/tax requirement) |
| Server logs | 90 days |

Upon account deletion (soft delete followed by purge), your personal data and uploaded documents are removed from active systems within 30 days. Anonymized or aggregated data may be retained indefinitely.

---

## 7. Data Sharing and Disclosure

We do not sell your personal information. We may share data in the following circumstances:

### 7.1 Service Providers (Sub-processors)

We engage trusted third-party providers to operate the Service, including:

- **Stripe** — payment processing
- **Google (Gemini API)** — AI language model inference
- **Pinecone** — vector database for semantic search over legal knowledge base
- **Langfuse** — AI pipeline tracing and monitoring
- **MongoDB Atlas** — database hosting
- **Cloud infrastructure providers** — hosting and deployment

These providers are contractually obligated to use your data only as necessary to deliver their services to us and to maintain appropriate security standards.

### 7.2 Legal Requirements

We may disclose information if required to do so by law or in response to valid legal process (such as a court order or government request), or to protect the rights, property, or safety of Aqdy, our users, or others.

### 7.3 Business Transfers

In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify you via email or a prominent notice on our website before your data is transferred and becomes subject to a different privacy policy.

### 7.4 With Your Consent

We may share your information for any other purpose with your explicit consent.

---

## 8. Data Security

We implement industry-standard security measures to protect your information, including:

- Encryption of data in transit (TLS/HTTPS)
- Hashed password storage
- JWT authentication via httpOnly secure cookies
- Input validation and sanitization on all API endpoints
- Prompt injection prevention for AI pipeline inputs
- Rate limiting to prevent abuse
- Role-based access controls (user vs. admin roles)
- Regular security testing and code review

No method of transmission over the internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.

---

## 9. Cookies and Tracking

We use the following types of cookies:

- **Session Cookies:** httpOnly cookies used to maintain your authenticated session securely.
- **Functional Cookies:** To remember your language preference (Arabic or English).
- **Analytics Cookies:** To understand aggregate usage patterns and improve the Service (where applicable, with your consent).

You can control cookie settings through your browser preferences. Disabling cookies may affect your ability to use certain features of the Service, including staying logged in.

---

## 10. Your Rights

Depending on your location, you may have the following rights regarding your personal data:

- **Access:** Request a copy of the personal data we hold about you.
- **Correction:** Request correction of inaccurate or incomplete data.
- **Deletion:** Request deletion of your personal data ("right to be forgotten"), subject to legal retention obligations.
- **Portability:** Request a machine-readable export of your data.
- **Restriction:** Request that we restrict processing of your data in certain circumstances.
- **Objection:** Object to processing based on legitimate interests.
- **Withdrawal of Consent:** Where processing is based on consent, withdraw that consent at any time.

To exercise any of these rights, please contact us at **[privacy@aqdy.com]**. We will respond within 30 days.

---

## 11. International Data Transfers

Aqdy may process and store data in countries outside your country of residence, including the United States and other jurisdictions where our service providers operate. When transferring data internationally, we take steps to ensure appropriate safeguards are in place in accordance with applicable data protection laws (such as Standard Contractual Clauses for EEA transfers).

---

## 12. Children's Privacy

The Service is not directed at individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe we have inadvertently collected information from a minor, please contact us immediately and we will take steps to delete it.

---

## 13. Third-Party Links

The Service may contain links to third-party websites or services. This Privacy Policy does not apply to those third parties, and we are not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party sites you visit.

---

## 14. Changes to This Policy

We may update this Privacy Policy from time to time. When we make material changes, we will notify you by updating the "Last Updated" date at the top of this policy and, where appropriate, by sending you an email notification. Your continued use of the Service after changes become effective constitutes your acceptance of the revised policy.

---

## 15. Contact Us

If you have any questions, concerns, or requests regarding this Privacy Policy, please contact:

**Aqdy Privacy Team**
Email: [privacy@aqdy.com]

---

*This Privacy Policy was last reviewed and updated on June 4, 2026.*
