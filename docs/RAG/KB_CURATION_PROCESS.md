# Knowledge Base Curation Process — Aqdy Platform

> This document defines the **end-to-end process** for maintaining, extending, and quality-controlling the Aqdy Legal Knowledge Base (`legal_kb.json` — v2 schema).  
> All team members adding or editing KB clauses must follow this process to ensure accuracy, legal validity, and embedding quality.

---

## Table of Contents

1. [Overview](#1-overview)
2. [KB File Structure](#2-kb-file-structure)
3. [Adding a New Clause](#3-adding-a-new-clause)
4. [Editing an Existing Clause](#4-editing-an-existing-clause)
5. [Deleting a Clause](#5-deleting-a-clause)
6. [Quality Control Checklist](#6-quality-control-checklist)
7. [Validation Rules](#7-validation-rules)
8. [Re-Embedding After Changes](#8-re-embedding-after-changes)
9. [ID Naming Convention](#9-id-naming-convention)
10. [Category & Risk Level Guidelines](#10-category--risk-level-guidelines)
11. [Legal Review Requirements](#11-legal-review-requirements)
12. [Clause Writing Style Guide](#12-clause-writing-style-guide)
13. [Versioning & Change Log](#13-versioning--change-log)

---

## 1. Overview

The Aqdy Knowledge Base is a **curated, human-reviewed** legal dataset. It is **not** auto-generated — every clause is researched, written, and validated by hand before being added.

### Why Curation Quality Matters

The KB is injected directly into LLM prompts via the RAG pipeline. Poor-quality entries will:
- Cause the AI to give **incorrect legal advice**
- Reduce semantic search **relevance** (bad embeddings)
- Confuse users who read the explanations

### KB Files

| File | Schema | Role |
|---|---|---|
| `backend/src/data/legal_kb.json` | **v2** | **Active** — source of truth (102 clauses) |
| `backend/src/data/legalKB.json` | v1 | Legacy — 50-clause flat array, kept for reference |

Always edit `legal_kb.json` (v2). The v1 `legalKB.json` is retained as a historical reference only — do not add new clauses to it.

---

## 2. KB File Structure

The active KB (`legal_kb.json`) is a **structured JSON object** with a metadata header:

```json
{
  "version": "1.0",
  "lastUpdated": "2025-05-21",
  "totalEntries": 102,
  "embeddingModel": "multilingual-e5-large",
  "embeddingDimensions": 1024,
  "clauses": [
    { ...clause_001 },
    { ...clause_002 }
  ]
}
```

### Required Fields per Clause (v2 Schema)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | ✅ | Unique slug — see [ID convention](#9-id-naming-convention) |
| `category` | `string` | ✅ | **Title case**, e.g. `"Liability"` — see [Category Guide](#10-category--risk-level-guidelines) |
| `riskLevel` | `string` | ✅ | `"critical"` \| `"high"` \| `"medium"` \| `"low"` |
| `clausePattern` | `string` | ✅ | Template text in English of the risky clause |
| `explanation.ar` | `string` | ✅ | Arabic explanation of what the clause means |
| `explanation.en` | `string` | ✅ | English explanation |
| `whyRisky.ar` | `string` | ✅ | Why it is dangerous (Arabic) |
| `whyRisky.en` | `string` | ✅ | Why it is dangerous (English) |
| `saferAlternative.ar` | `string` | ✅ | Recommended safer wording (Arabic) |
| `saferAlternative.en` | `string` | ✅ | Recommended safer wording (English) |
| `negotiationTips.ar` | `string` | ⚠️ recommended | Actionable negotiation advice (Arabic) |
| `negotiationTips.en` | `string` | ⚠️ recommended | Actionable negotiation advice (English) |
| `context.contractTypes` | `string[]` | ✅ | Title-case contract types, e.g. `["Service Agreement", "NDA"]` |
| `context.frequency` | `string` | ⚠️ optional | `"very_common"` \| `"common"` \| `"occasional"` |
| `context.applicableRegions` | `string[]` | ⚠️ optional | e.g. `["Egypt", "MENA"]` |
| `relatedLaw.egyptianLaw` | `string` | ⚠️ optional | Egyptian law citation, e.g. `"Egyptian Civil Code Article 224"` |
| `relatedLaw.country` | `string` | ⚠️ optional | Usually `"Egypt"` |
| `precedents` | `string[]` | ⚠️ optional | Reference contract filenames |
| `version` | `number` | ⚠️ optional | Clause revision number (start at `1`) |
| `createdAt` | `string` | ⚠️ optional | ISO 8601, e.g. `"2025-05-21T10:00:00Z"` |
| `updatedAt` | `string` | ⚠️ optional | ISO 8601 timestamp of last edit |

---

## 3. Adding a New Clause

Follow this step-by-step process every time you add a clause:

### Step 1 — Research the Clause

1. Identify the clause pattern from a **real contract** (don't invent patterns)
2. Verify that the pattern is **genuinely common** in MENA/Egyptian contracts
3. Look up the applicable Egyptian law article(s)
4. Confirm the risk level against the [risk level guidelines](#10-category--risk-level-guidelines)

### Step 2 — Draft the Clause Object

Use this v2 schema template:

```json
{
  "id": "clause_0XX_short_description",
  "category": "Title Case Category",
  "riskLevel": "critical|high|medium|low",
  "clausePattern": "The exact clause text in English as it appears in contracts...",
  "explanation": {
    "ar": "شرح واضح وبسيط لما يعنيه هذا البند بالعربية",
    "en": "Clear and simple explanation of what this clause means in English"
  },
  "whyRisky": {
    "ar": "لماذا هذا البند خطير أو غير عادل بالعربية",
    "en": "Why this clause is risky or unfair in English"
  },
  "saferAlternative": {
    "ar": "الصياغة البديلة الأكثر أماناً بالعربية",
    "en": "The safer alternative wording in English"
  },
  "negotiationTips": {
    "ar": "نصيحة عملية للتفاوض على هذا البند بالعربية",
    "en": "Practical tip for negotiating this clause in English"
  },
  "context": {
    "contractTypes": ["Service Agreement", "NDA"],
    "frequency": "very_common",
    "applicableRegions": ["Egypt", "MENA"]
  },
  "relatedLaw": {
    "egyptianLaw": "Egyptian Civil Code Article XXX",
    "country": "Egypt"
  },
  "precedents": [],
  "version": 1,
  "createdAt": "YYYY-MM-DDTHH:MM:SSZ",
  "updatedAt": "YYYY-MM-DDTHH:MM:SSZ"
}
```

### Step 3 — Append to the `clauses` Array

- Open `backend/src/data/legal_kb.json`
- Add the new clause at the **end of the `"clauses"` array** (before the closing `]` of the array)
- Update the `"totalEntries"` count and `"lastUpdated"` date in the header
- Ensure proper JSON formatting — no trailing commas on the last item

```json
  { ...clause_101 },
  { ...clause_102 },
  { ...your_new_clause }   ← no trailing comma here
  ]
}
```

### Step 4 — Run the Quality Control Checklist

Complete the [QC Checklist](#6-quality-control-checklist) before committing.

### Step 5 — Re-embed

Run the embedding pipeline to add the new clause to Pinecone:

```bash
# From the project root (recommended)
npx tsx backend/src/scripts/embedKB.ts
```

See [Re-Embedding After Changes](#8-re-embedding-after-changes) for full instructions.

### Step 7 — Update LEGAL_KB.md

Add the new clause entry to [LEGAL_KB.md](./LEGAL_KB.md) in the appropriate risk level section.

---

## 4. Editing an Existing Clause

> ⚠️ **Important:** Editing any field that affects the `text` field (clausePattern, explanation.en, explanation.ar) **requires re-embedding** to update the Pinecone vector.

### Fields That Require Re-Embedding

| Field | Re-embed Required? |
|---|---|
| `clausePattern` | ✅ Yes |
| `explanation.en` | ✅ Yes |
| `explanation.ar` | ✅ Yes |
| `whyRisky` | ❌ No (metadata only) |
| `saferAlternative` | ❌ No (metadata only) |
| `negotiationTips` | ❌ No (metadata only) |
| `riskLevel` | ❌ No (metadata only) |
| `relatedLaw` | ❌ No (metadata only) |
| `context.contractTypes` | ❌ No (metadata only) |
| `context.frequency` | ❌ No (metadata only) |
| `context.applicableRegions` | ❌ No (metadata only) |
| `category` | ❌ No (metadata only) |

### Edit Process

1. Edit the field(s) in `legal_kb.json`
2. Update `"lastUpdated"` and bump `"updatedAt"` on the clause
3. If re-embedding required: run `npx tsx backend/src/scripts/embedKB.ts`
4. Update `LEGAL_KB.md` accordingly
5. Add an entry to the [Change Log](#13-versioning--change-log)

---

## 5. Deleting a Clause

Deleting a clause removes it from both the JSON file and Pinecone.

### When to Delete

- Clause is no longer legally relevant (law changed)
- Clause is a duplicate of an existing entry
- Clause was incorrectly added

### Deletion Process

1. Remove the clause object from the `"clauses"` array in `legal_kb.json`
2. Update `"totalEntries"` and `"lastUpdated"` in the header
3. **Delete from Pinecone manually** using the Pinecone console or API:
   ```typescript
   await index.deleteOne("clause_XXX_name");
   ```
   > ⚠️ `embedKB.ts` uses `upsertRecords` (idempotent) — it will NOT auto-delete removed clauses.
4. Remove the clause entry from `LEGAL_KB.md`
5. Log the deletion in the [Change Log](#13-versioning--change-log)

---

## 6. Quality Control Checklist

Run this checklist for every new or edited clause before committing:

### Content Quality
- [ ] `clausePattern` is taken from a **real contract**, not invented
- [ ] `clausePattern` is in plain English (not Arabic)
- [ ] The explanation is **clear to a non-lawyer** — no legal jargon without explanation
- [ ] Arabic text is natural, fluent modern Arabic (not machine-translated)
- [ ] `whyRisky` specifically explains the **financial or legal harm** — not vague
- [ ] `saferAlternative` offers **actionable** language the user can actually use

### Legal Accuracy
- [ ] `riskLevel` reflects actual harm potential (see [guidelines](#10-category--risk-level-guidelines))
- [ ] `relatedLaw` cites a **real** Egyptian law article (verify the article number)
- [ ] Risk assessment reflects **Egyptian law** specifically, not Western standards
- [ ] If the clause is illegal in Egypt, the `saferAlternative` must state it is void

### Technical Quality
- [ ] `id` follows the [naming convention](#9-id-naming-convention)
- [ ] `id` is **unique** — search the file before adding
- [ ] `category` uses **Title Case** (e.g. `"Liability"`, not `"liability"`)
- [ ] `context.contractTypes` uses Title-case values from the [allowed list](#10-category--risk-level-guidelines)
- [ ] `relatedLaw` is an **object** with `egyptianLaw` and `country` keys (not a plain string)
- [ ] `"totalEntries"` and `"lastUpdated"` in the file header are updated
- [ ] JSON is **valid** — run a JSON linter
- [ ] No trailing commas in the JSON

### Embedding Readiness
- [ ] `clausePattern` + `explanation.en` + `explanation.ar` together form a **semantically rich** text
- [ ] No duplicate or near-duplicate `clausePattern` of an existing clause

---

## 7. Validation Rules

These are hard rules — violations will cause pipeline failures or degraded AI quality:

### JSON Structure Rules (v2)
```
✅ Top-level object with "version", "lastUpdated", "totalEntries", "embeddingModel", "embeddingDimensions", "clauses"
✅ "clauses" is a non-empty array
✅ "totalEntries" matches the actual number of objects in "clauses"
✅ All required fields present on each clause
✅ No null values for required string fields
✅ riskLevel is exactly one of: "critical", "high", "medium", "low"
✅ id is unique across all clauses
```

### Content Rules
```
✅ clausePattern: English only, 15–300 characters
✅ explanation.ar: Arabic only, 20–500 characters
✅ explanation.en: English only, 20–500 characters
✅ whyRisky.ar: Arabic only, 20–400 characters
✅ whyRisky.en: English only, 20–400 characters
✅ saferAlternative.ar: Arabic only, 20–400 characters
✅ saferAlternative.en: English only, 20–400 characters
✅ category: Title Case (e.g. "Liability", "IP Rights", "Non-Compete")
✅ relatedLaw: object with egyptianLaw (string) and country (string)
```

### Allowed `context.contractTypes` Values (Title Case)

```
Employment Agreement
Freelance Contract
Service Agreement
Consulting Agreement
NDA
Vendor Agreement
Subscription Agreement
```

### Allowed `category` Values (Title Case)

```
Liability          Termination        Payment
IP Rights          Non-Compete        Confidentiality
Dispute Resolution Privacy            Working Conditions
Compensation       Leave              Scope of Work
Force Majeure      Warranties         Non-Solicitation
Exclusivity        Employment Terms   Amendment
Indemnification    Governing Law
```

> To add a new category, update this list AND the category reference in [`rag-and-embedding.md`](./rag-and-embedding.md) and [`LEGAL_KB.md`](./LEGAL_KB.md).

---

## 8. Re-Embedding After Changes

Re-embedding is required when the searchable text (`clausePattern`, `explanation.en`, `explanation.ar`) changes.

### When Re-Embedding Is Safe

`embedKB.ts` uses `upsertRecords` — it is **fully idempotent**:
- Existing vectors are **overwritten** by `_id` match
- No duplicate vectors are created
- New clauses are **added**
- Deleted clauses are **NOT removed** (must delete manually from Pinecone)

### Re-Embedding Command

```bash
# From the project root (recommended)
npx tsx backend/src/scripts/embedKB.ts

# From the backend directory
npx tsx src/scripts/embedKB.ts
```

### Expected Output (102 clauses)

```
🚀 Starting Legal KB Embedding pipeline (multilingual-e5-large)...
📂 Loaded 102 clauses from backend/src/data/legal_kb.json (KB v1.0, updated 2025-05-21)
✅ Index "legal-kb" already exists.

📤 Upserting 102 clauses to Pinecone index "legal-kb"…
   Upserting batch 1 (25 records)…
   Upserting batch 2 (25 records)…
   Upserting batch 3 (25 records)…
   Upserting batch 4 (25 records)…
   Upserting batch 5 (2 records)…

🎉 Success: Confirmed that all 102 clauses have been embedded and upserted into Pinecone!
```

### Verifying the Embedding

After re-embedding, verify via Pinecone Console:
1. Navigate to the `legal-kb` index
2. Confirm record count is **102** (matching `totalEntries` in `legal_kb.json`)
3. Sample a record and verify the `text` field contains Arabic text from `explanation.ar`
4. Run a test query using the evaluation script: `npx tsx backend/src/scripts/evaluateRAG.ts`

---

## 9. ID Naming Convention

Clause IDs follow a strict pattern:

```
clause_{sequence_number}_{short_description}
```

### Rules

| Part | Format | Example |
|---|---|---|
| Prefix | Always `clause_` | `clause_` |
| Sequence | Zero-padded 3-digit number | `001`, `051`, `100` |
| Description | Snake_case, lowercase, max 30 chars | `unlimited_liability` |

### Examples

```
clause_001_unlimited_liability      ✅
clause_051_salary_deduction         ✅
CLAUSE_001_LIABILITY                ❌  (uppercase)
clause_1_unlimited_liability        ❌  (not zero-padded)
clause_001_The Unlimited Liability  ❌  (spaces, uppercase)
clause_001                          ❌  (no description)
```

### Next Available Number

The current KB has clauses `001` through `102`. New clauses start at `103`.

To find the next available number:
```bash
# On Linux/Mac
grep '"id"' backend/src/data/legal_kb.json | tail -5

# On Windows PowerShell
Select-String '"id"' backend\src\data\legal_kb.json | Select-Object -Last 5
```

---

## 10. Category & Risk Level Guidelines

### Risk Level Assignment

| Risk Level | Criteria | Examples |
|---|---|---|
| 🔴 **critical** | Clause is **illegal** in Egypt OR causes catastrophic, irreversible harm | Unlimited liability, blanket rights waiver, unilateral salary cut |
| 🟠 **high** | Clause violates labor/civil law OR causes serious financial/career harm | No severance, mandatory unpaid overtime, foreign jurisdiction |
| 🟡 **medium** | Clause is significantly unfavorable but not immediately catastrophic | 90-day payment, indefinite NDA, scope creep |
| 🟢 **low** | Minor concern or actually a positive/protective clause | Subcontracting restriction, balanced termination clause |

### Decision Tree for Risk Level

```
Is the clause ILLEGAL under Egyptian law?
├── YES → critical (if the violation is serious)
│   └── Example: probation > 3 months, waived severance
└── NO → Continue

Can it cause catastrophic irreversible harm?
├── YES → critical
│   └── Example: unlimited liability, blanket IP assignment
└── NO → Continue

Does it violate Egyptian law OR cause serious career/financial harm?
├── YES → high
│   └── Example: mandatory unpaid overtime, foreign jurisdiction
└── NO → Continue

Is it significantly unfair / requires negotiation?
├── YES → medium
│   └── Example: 90-day payment, indefinite NDA
└── NO → low (minor concern or positive clause)
```

### Category Selection Guidelines

Choose the **most specific** category that applies:

- Use `liability` for damage cap / unlimited liability / joint liability clauses
- Use `termination` for contract ending rights (unilateral, automatic renewal, no pay on termination)
- Use `payment` for fee, invoice, interest, pricing clauses
- Use `employment_terms` for hiring conditions (probation, working hours, benefits) — distinct from `working_conditions`
- Use `working_conditions` specifically for overtime and hours-related violations
- Use `confidentiality` for NDA scope and duration clauses
- Use `amendment` for contract modification rights (unilateral or otherwise)
- Use `obligations` for operational requirements (insurance, first refusal) with no better category

---

## 11. Legal Review Requirements

### Who Can Add Clauses

| Role | Can Add? | Review Required |
|---|---|---|
| Legal consultant / lawyer | ✅ Yes | Self-review + peer review |
| Product manager | ⚠️ Draft only | Must be reviewed by legal consultant |
| Developer | ⚠️ Technical fields only | Content must be reviewed by legal consultant |

### Legal Review Process

1. **Draft clause** is added to a feature branch (not `main`)
2. **Legal reviewer** checks:
   - Law article number is correct and applicable
   - Risk level is accurate under Egyptian law
   - Safer alternative is legally sound and actionable
   - Arabic content is legally accurate (not just a translation)
3. **Review approval** is required before merge to `main`
4. **Re-embedding** happens only after merge

### Sources for Legal Research

| Source | Use |
|---|---|
| Egyptian Law Database (manshurat.org) | Look up law articles |
| Egyptian Labor Law No. 12/2003 | Employment clauses |
| Egyptian Civil Code No. 131/1948 | Commercial/service clauses |
| Egyptian IP Law No. 82/2002 | IP clauses |
| Egyptian Data Protection Law No. 151/2020 | Privacy clauses |
| CRCICA (crcica.org) | Arbitration references |

---

## 12. Clause Writing Style Guide

### `clausePattern` — The Risky Clause Text

- Write it as if it **appears in a real contract** (formal legal tone)
- Use third-person ("The Company", "The Employee", "The Service Provider")
- English only — no Arabic in this field
- Do not add quotation marks inside the field value
- Length: 15–200 characters

**Good:**
```
"clausePattern": "Employee agrees to work such hours as required by the business including weekends and holidays without additional compensation"
```

**Bad:**
```
"clausePattern": "you have to work whenever they want with no extra pay"  ← too informal
```

### `explanation` — What the Clause Means

- Write for a **non-lawyer** — no legal jargon unless immediately explained
- Start by explaining what the clause **does** (not what it says)
- Keep it concrete: "This means X can happen to you"
- Arabic: Natural, colloquial-leaning Modern Standard Arabic

**Good:**
```
"en": "This clause allows the company to change prices, obligations, or scope entirely without informing you, making the contract unstable"
```

**Bad:**
```
"en": "This clause effectuates a unilateral novation of contractual terms without bilateral consent"  ← too legal
```

### `whyRisky` — The Risk Rationale

- Focus on **concrete harm**: financial loss, career damage, legal exposure
- Quantify where possible: "could cost you X", "prevents you from working for Y years"
- Reference the specific Egyptian law being violated if applicable

**Good:**
```
"en": "May result in catastrophic financial losses even for minor breaches, far exceeding the contract value"
```

**Bad:**
```
"en": "This is not good for you"  ← too vague
```

### `saferAlternative` — The Fix

- Be **actionable** — what should they ask for?
- Use verbs: "Request...", "Negotiate...", "Limit...", "Reject..."
- If the clause is legally void in Egypt, say so explicitly

**Good:**
```
"en": "Negotiate to 6 months, narrow geographic and professional scope, and add financial compensation for the restriction period"
```

**Good (void clause):**
```
"en": "This clause is legally void in Egypt. You cannot waive legal rights that have not yet arisen"
```

### `keywords`

- Include the **exact terms** a contract would use (for retrieval)
- Include both formal legal terms AND common contract phrases
- Arabic keywords should match terms in actual Arabic contracts
- Minimum: 2 English + 2 Arabic
- Maximum: ~10 total

**Good:**
```json
["unlimited liability", "liable", "damages", "مسؤولية غير محدودة", "تعويض", "مسؤول"]
```

---

## 13. Versioning & Change Log

Track all significant KB changes in this section. Most recent first.

### Format

```
## vX.Y — YYYY-MM-DD
### Added
- clause_XXX_name: Brief description
### Modified
- clause_XXX_name: What changed and why
### Deleted
- clause_XXX_name: Why it was removed
```

---

### v1.0 — 2026-05-25

**Initial release of the Aqdy Legal Knowledge Base.**

#### Added
- `clause_001_unlimited_liability` — Unlimited liability cap absence
- `clause_002_automatic_renewal` — 90-day auto-renewal trap
- `clause_003_unilateral_modification` — Unilateral contract modification
- `clause_004_ip_assignment_broad` — Broad IP assignment including personal time
- `clause_005_non_compete_broad` — 2-year broad non-compete
- `clause_006_unilateral_termination` — Termination without cause or notice
- `clause_007_excessive_penalty` — 50% per-incident penalty
- `clause_008_payment_discretion` — Payment at client's sole discretion
- `clause_009_data_sharing_broad` — Broad personal data sharing
- `clause_010_foreign_jurisdiction` — Exclusive foreign court jurisdiction
- `clause_011_compound_interest` — 5% monthly compound interest
- `clause_012_indefinite_nda` — Indefinite confidentiality obligation
- `clause_013_forced_arbitration` — Mandatory individual arbitration waiver
- `clause_014_scope_creep` — Uncompensated additional tasks
- `clause_015_delayed_payment_90` — 90-day payment with internal approval gate
- `clause_016_mandatory_unpaid_overtime` — Mandatory unpaid overtime including weekends
- `clause_017_blanket_indemnity` — Blanket indemnification including client's own faults
- `clause_018_leave_denial` — Leave denial at employer's discretion
- `clause_019_unilateral_salary_cut` — Unilateral salary reduction
- `clause_020_warranty_disclaimer` — Full as-is warranty disclaimer
- `clause_021_narrow_force_majeure` — Overly narrow force majeure definition
- `clause_022_moral_rights_waiver` — Waiver of attribution moral rights
- `clause_023_long_probation` — 6-month probation (illegal in Egypt)
- `clause_024_device_monitoring` — Monitoring personal communications on company devices
- `clause_025_no_subcontract` — Subcontracting restriction without approval
- `clause_026_ownership_dispute` — IP dispute presumed in company's favor
- `clause_027_non_solicitation` — 1-year post-termination non-solicitation
- `clause_028_confidentiality_no_exceptions` — Confidentiality with no legal disclosure exception
- `clause_029_no_severance` — No end-of-service gratuity (illegal in Egypt)
- `clause_030_exclusive_client` — Full exclusivity without employment benefits
- `clause_031_contract_renewal_price_hike` — 30% unilateral price increase on renewal
- `clause_032_ip_pre_existing` — Pre-existing IP absorbed into deliverables
- `clause_033_liability_cap_low` — Liability cap disproportionately low (EGP 1,000)
- `clause_034_unilateral_sla_change` — Immediate SLA changes without notice
- `clause_035_termination_clause_asymmetric` — Asymmetric notice periods (7 days vs 90 days)
- `clause_036_non_disparagement` — One-sided post-employment non-disparagement
- `clause_037_liquidated_damages_unilateral` — Unilateral invoice deductions for damages
- `clause_038_entire_agreement_block` — Entire agreement clause erasing verbal promises
- `clause_039_no_written_variation` — Written variation only (positive clause)
- `clause_040_ambiguous_deliverables` — Undefined scope of work
- `clause_041_termination_no_payment` — No payment for completed but undelivered work
- `clause_042_governing_law_egypt` — Egyptian governing law (positive clause)
- `clause_043_no_reference_guarantee` — No employment reference guarantee
- `clause_044_joint_and_several_liability` — Joint and several liability in partnerships
- `clause_045_insurance_requirement` — EGP 5M professional indemnity requirement
- `clause_046_right_of_first_refusal` — 2-year right of first refusal on future projects
- `clause_047_notice_valid_email_only` — Registered mail only notices
- `clause_048_benchmarking_clause` — Unilateral fee reduction via benchmarking
- `clause_049_waiver_of_claims` — Advance waiver of all future employment claims
- `clause_050_balanced_termination` — Balanced mutual termination clause (positive)

**Total at v1.0:** 50 clauses across 24 categories

---

### v2.0 — 2025-05-21

**KB expanded from 50 to 102 clauses with a new v2 JSON schema.**

#### Schema Changes
- Top-level structure changed from plain array `[]` to structured object with metadata header
- `keywords` field removed; replaced with semantic embedding (no keyword matching needed)
- `negotiationTips` (bilingual) added to every clause
- `context` block added: `contractTypes`, `frequency`, `applicableRegions`
- `relatedLaw` changed from plain string to `{ egyptianLaw, country }` object
- `contractTypes` moved from top-level to `context.contractTypes`
- `category` casing changed from `snake_case` to `Title Case`
- `precedents`, `version`, `createdAt`, `updatedAt` fields added per clause

#### Added (52 new clauses)
- `clause_051` through `clause_102` covering Employment, NDA, Service Agreement, and Consulting categories
- More Arabic/MENA-specific clause patterns
- Safer alternatives for all high-risk clauses now include actionable `negotiationTips`

**Total at v2.0:** 102 clauses

---

*Last updated: May 2026 | Aqdy Platform Documentation*
