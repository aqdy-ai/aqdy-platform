# MENA Business Practice Norms — Aqdy Platform

> This document captures the regional legal and contractual norms that inform the Aqdy knowledge base and AI risk analysis engine.  
> Understanding MENA (Middle East & North Africa) business culture and law is essential for accurate clause risk-scoring and useful advisory output.

---

## Table of Contents

1. [Regional Overview](#1-regional-overview)
2. [Egypt — Primary Market](#2-egypt--primary-market)
3. [Key Legal Frameworks](#3-key-legal-frameworks)
4. [Contract Culture in MENA](#4-contract-culture-in-mena)
5. [Common Contractual Risks in the Region](#5-common-contractual-risks-in-the-region)
6. [Employment Norms](#6-employment-norms)
7. [Freelance & Gig Economy Norms](#7-freelance--gig-economy-norms)
8. [Payment & Financial Norms](#8-payment--financial-norms)
9. [Dispute Resolution Norms](#9-dispute-resolution-norms)
10. [Data Privacy & Digital Contracts](#10-data-privacy--digital-contracts)
11. [Language & Bilingual Contracts](#11-language--bilingual-contracts)
12. [How These Norms Affect the Aqdy KB](#12-how-these-norms-affect-the-aqdy-kb)

---

## 1. Regional Overview

The MENA region spans 20+ countries with highly varied legal systems, yet shares several common business practice characteristics that distinguish it from Western markets:

| Characteristic | MENA Context |
|---|---|
| **Primary legal tradition** | Civil law (French-influenced) + Islamic law (Sharia) elements |
| **Contract enforcement** | Relationship-based; courts are slow → arbitration preferred |
| **Power dynamics** | Employer/client holds significantly more leverage |
| **Formality** | High — written contracts respected but verbal agreements still common |
| **Language** | Arabic is legally primary in most MENA countries |
| **Regulatory pace** | Laws often lag digital/gig economy reality |

**Aqdy's primary market is Egypt**, with secondary relevance to KSA, UAE, Jordan, and Lebanon.

---

## 2. Egypt — Primary Market

Egypt is the core jurisdiction Aqdy is designed for. Key characteristics:

### Legal System
- **Civil law** system derived from the Napoleonic code (via French and Italian influence)
- **Religious courts** for personal status matters (not commercial contracts)
- Primary commercial law sources:
  - Egyptian Civil Code (Law No. 131/1948)
  - Egyptian Labor Law (Law No. 12/2003)
  - Egyptian Commercial Code (Law No. 17/1999)
  - Egyptian Intellectual Property Law (Law No. 82/2002)
  - Egyptian Data Protection Law (Law No. 151/2020)

### Business Culture Norms
- **Hierarchy is respected**: junior employees rarely push back on unfavorable contract terms
- **Verbal agreements are common** but unenforceable in disputes
- **Wasta (connections/influence)** can informally override contract rights
- **Long notice periods** favor the employer and are standard in large corporations
- **Non-compete clauses** are widely used but often legally unenforceable when overly broad

### Common Employer Behaviors
- Offering contracts only after the start date (retroactive signing)
- Omitting mandatory benefits (health insurance, social insurance) from contract text
- Using vague scope-of-work language to enable scope creep
- Probation periods exceeding the 3-month legal maximum
- Asking employees to sign blank or pre-filled employment forms

---

## 3. Key Legal Frameworks

### Egyptian Labor Law (No. 12/2003)
The most important law for employment contracts. Key provisions Aqdy monitors:

| Article | Subject | Employee Right |
|---|---|---|
| Art. 28 | Probation period | Max 3 months |
| Art. 35 | Salary | Cannot be reduced unilaterally |
| Art. 47 | Annual leave | Minimum 21 days/year (first year) |
| Art. 66 | Non-compete | Must be reasonable in scope, area, time |
| Arts. 84–90 | Overtime | Must be paid at 35% premium (daytime), 70% (nighttime) |
| Arts. 120–122 | Termination | Cause required; 2-month minimum notice |
| Arts. 126–130 | Severance | End-of-service gratuity is mandatory |
| Art. 132 | References | Employer must provide service certificate |

### Egyptian Civil Code (No. 131/1948)
Governs commercial and service contracts:

| Article | Subject |
|---|---|
| Art. 147 | Contract sanctity — cannot be modified unilaterally |
| Art. 148 | Good faith principle in contract execution |
| Art. 150 | Interpretation favors the party that did not draft |
| Art. 157 | Termination of contract for breach |
| Art. 165 | Force majeure — unforeseen, unavoidable event |
| Art. 216 | Limitation of indemnification clauses |
| Art. 224 | Proportionality of penalty clauses |
| Art. 226 | Interest rate limits |

### Egyptian Data Protection Law (No. 151/2020)
Regulates personal data processing in digital contracts:
- Explicit consent required for data collection
- Data subject rights: access, correction, deletion
- Cross-border data transfer restrictions apply
- Fines up to EGP 5 million for violations

### Egyptian Intellectual Property Law (No. 82/2002)
- Moral rights (attribution) cannot be waived under Egyptian law
- Employer only owns IP created within scope of employment using company resources
- Work-for-hire must be explicitly agreed in writing

---

## 4. Contract Culture in MENA

### Written vs. Verbal Agreements
- Most MENA countries require written contracts for enforceability of key terms
- Egypt: employment contracts should be written; oral contracts are valid but extremely hard to prove
- UAE: employment contracts must be written per the Labour Law
- KSA: contracts are binding but Saudi courts prefer Arabic written versions

### Arabic Language Requirements
- **Egypt**: No statutory requirement for Arabic-only contracts, but courts interpret ambiguous terms against the drafter
- **KSA**: Arabic is the official language for all legal proceedings; English contracts may need certified translation
- **UAE**: Both Arabic and English accepted; Arabic prevails in disputes

### Witnessing & Notarization
- Many MENA businesses expect contracts to be notarized (توثيق) even when not legally required
- Freelancers often lack access to notarization, making them more vulnerable
- Notarized contracts carry stronger evidentiary weight

---

## 5. Common Contractual Risks in the Region

These are patterns specifically prevalent in MENA contracts that Aqdy's KB is designed to detect:

### 🔴 Critical Risk Patterns

| Pattern | Why Common in MENA |
|---|---|
| **Unlimited liability clauses** | Copied from Western templates without adjustment |
| **Unilateral modification rights** | Employers assume power to change terms at will |
| **Blanket IP assignment** | Technology companies claim all IP including side projects |
| **Waiver of future claims** | Common in settlement-focused corporate culture |
| **Unilateral salary reduction** | Performance-management tool in hierarchical cultures |

### 🟠 High Risk Patterns

| Pattern | Why Common in MENA |
|---|---|
| **Long automatic renewal with 90-day notice** | Subscription and SaaS companies from Gulf |
| **No severance / no gratuity** | Employers try to contract out of statutory rights |
| **Mandatory unpaid overtime** | Tech startups, consulting firms |
| **Foreign jurisdiction clauses** | International companies serving Egyptian market |
| **Exclusivity for freelancers** | Clients want full availability without employment commitments |

### 🟡 Medium Risk Patterns

| Pattern | Why Common in MENA |
|---|---|
| **90-day payment terms** | Large corporate procurement culture |
| **Indefinite NDAs** | Copied from US/EU templates without localization |
| **6-month probation** | HR departments unaware of 3-month legal cap |
| **Device monitoring clauses** | Tech companies with BYOD policies |
| **Benchmarking fee reduction** | Gulf-based procurement departments |

---

## 6. Employment Norms

### Social Insurance (التأمين الاجتماعي)
- Mandatory for all employees in Egypt
- Both employer and employee contribute
- Many informal employers offer net salary without insurance (illegal but common)
- Aqdy flags contracts that do not mention social insurance for employment contracts

### Working Hours
- Egyptian law: 8 hours/day, 48 hours/week maximum
- Ramadan: reduced to 6 hours/day for Muslims
- Overtime: mandatory additional pay (35% daytime, 70% nighttime)
- Many tech companies include "as required by business" clauses to avoid overtime pay

### Annual Leave
- Minimum 21 days/year for first 5 years of employment
- Increases to 30 days/year after 5+ years
- Religious holidays are additional (in Egypt: approximately 10–12 days)
- Leave cannot be waived by contract even if employee signs agreement

### Termination Protections
- Employer must prove just cause for termination
- Unfair dismissal: employee entitled to 2 months' salary + compensation
- End-of-service gratuity: calculated on last salary for years of service
- Prohibited terminations: during illness, pregnancy, maternity leave

---

## 7. Freelance & Gig Economy Norms

The MENA freelance market is rapidly growing but legally under-protected:

### Legal Status of Freelancers in Egypt
- No specific freelance legal framework exists (as of 2025)
- Freelancers operate under Egyptian Civil Code (service contracts)
- No access to Labor Law protections unless misclassified as employees
- Tax registration as self-employed required for income above EGP 15,000/year

### Common Freelance Contract Risks
1. **Payment at sole discretion** — no objective acceptance criteria
2. **IP ownership** — all work transferred without portfolio rights
3. **Unlimited revisions** — scope creep enabled by vague deliverables
4. **Late payment** — 60–90 day terms are standard; no late fees
5. **Exclusivity without employment benefits** — client wants employee behavior without employee obligations

### Practical Norms
- Many Egyptian freelancers work without written contracts
- Platform-based work (Upwork, Mostaql) provides partial protection via escrow
- Direct client contracts are the highest risk scenario
- WhatsApp messages have been accepted as evidence in Egyptian courts (limited precedent)

---

## 8. Payment & Financial Norms

### Currency & Payment Methods
- Egypt: EGP (Egyptian Pound) — significant devaluation risk in multi-year contracts
- Contracts should address exchange rate fluctuation for USD/EUR-priced services
- Bank transfers are standard; cash still common for small businesses
- Central Bank of Egypt limits certain cross-border transfers

### Interest Rates
- Egyptian Civil Code Article 226: legal interest rate = 4% (civil) / 5% (commercial)
- Contractual interest can exceed this but must not be unconscionable
- Compound interest is legally disfavored — courts may reduce excessive rates
- Late payment interest norms: 1–2% per month is considered high

### Invoice & Payment Terms
- Standard in Egypt: NET 30 for SMEs, NET 60–90 for large corporations
- Government entities: payments can take 90–180 days (budget cycle dependency)
- Invoicing: freelancers must issue فاتورة ضريبية (tax invoice) if registered

---

## 9. Dispute Resolution Norms

### Court System
- Egyptian courts are notoriously slow (civil cases: 2–5 years)
- Commercial Courts (established 2008) are faster but still slow
- Appeals system creates long delays

### Arbitration
- Egyptian Arbitration Law (No. 27/1994) — based on UNCITRAL model
- Cairo Regional Centre for International Commercial Arbitration (CRCICA) is the preferred institution
- Arbitration awards are enforceable and faster than court judgments
- Costs are higher for individuals than for corporations

### Preferred Outcomes
- Most Egyptian business disputes settle informally through negotiation (وساطة)
- Mediation is not formally institutionalized but widely practiced
- Relationships matter: threatening legal action can permanently damage business relationships

### Foreign Jurisdiction Red Flags
- Many Gulf or international companies specify Dubai, London, or New York courts
- For Egyptian parties, this makes legal action effectively impossible (cost-prohibitive)
- Aqdy flags foreign jurisdiction clauses as **high risk**

---

## 10. Data Privacy & Digital Contracts

### Egyptian Data Protection Law (No. 151/2020)
Egypt's first comprehensive data protection law, still being implemented:

- **Personal data**: name, address, national ID, email, phone, biometrics
- **Consent required**: explicit, prior, and specific
- **Data retention**: limited to purpose duration
- **Data breach notification**: required to regulator and affected parties
- **Cross-border transfers**: permitted only to countries with equivalent protection

### Electronic Signatures
- Egyptian Electronic Signature Law (No. 15/2004)
- Qualified electronic signatures have same legal weight as handwritten
- DocuSign, Adobe Sign, and similar are accepted
- Contracts can be formed via email exchange (offer + acceptance)

### SaaS & Subscription Contract Concerns
- Many SaaS contracts contain broad data sharing rights
- "Usage analytics" clauses often include PII without explicit consent
- Auto-renewal clauses common in subscription software

---

## 11. Language & Bilingual Contracts

### Aqdy's Bilingual Approach
The platform handles contracts in both Arabic and English because:

1. **Arabic contracts** — more common with local Egyptian employers and government
2. **English contracts** — standard with international companies, tech sector, and Gulf clients
3. **Mixed contracts** — increasingly common; Arabic translation provided for Arabic terms

### Language Risk Factors
- Ambiguous translation of key terms (e.g., "reasonable" = معقول has different legal weight)
- Arabic version may be legally primary even if English version was signed
- Technical legal terms may not have direct Arabic equivalents
- Aqdy flags language inconsistencies between bilingual contract sections

### Arabic Legal Terminology Reference

| English Term | Arabic Term | Notes |
|---|---|---|
| Breach of contract | إخلال بالعقد | |
| Force majeure | قوة قاهرة | |
| Non-compete | عدم المنافسة | |
| Intellectual property | الملكية الفكرية | |
| Severance | مكافأة نهاية الخدمة | Literally: end-of-service bonus |
| Arbitration | تحكيم | |
| Indemnification | تعويض / ضمان | |
| Termination | إنهاء / فسخ | إنهاء = end; فسخ = rescission |
| Probation period | فترة التجربة | |
| Notice period | فترة الإشعار | |

---

## 12. How These Norms Affect the Aqdy KB

The `legalKB.json` knowledge base was built with these MENA norms in mind:

| Design Decision | MENA Rationale |
|---|---|
| **All clauses have Arabic + English explanations** | Contracts exist in both languages; users may be Arabic-native |
| **Egyptian Civil Code + Labor Law cited** | Primary laws for Egyptian market |
| **50 clauses covering 20 categories** | Covers the full spectrum of MENA contract risk patterns |
| **Risk levels calibrated to Egyptian law** | A "critical" clause violates specific Egyptian statute |
| **saferAlternative in both languages** | User can copy-paste into their contract negotiations |
| **Keywords include Arabic terms** | Enables matching against Arabic contract clauses |
| **Low-risk clauses included** | Helps users identify genuinely fair clauses |

### Categories Specific to MENA Context

| Category | MENA Specificity |
|---|---|
| `employment_terms` | Probation >3 months is illegal in Egypt specifically |
| `working_conditions` | Mandatory overtime pay is Egyptian Labor Law specific |
| `leave` | 21-day minimum is Egyptian Labor Law Article 47 |
| `compensation` | Unilateral salary cut violates Egyptian Labor Law Article 35 |
| `dispute_resolution` | Foreign courts are inaccessible for most Egyptian plaintiffs |
| `governing_law` | Egyptian law is specifically favorable for Egyptian parties |

---

*Last updated: May 2026 | Aqdy Platform Documentation*
