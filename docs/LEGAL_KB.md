# Legal Knowledge Base — `LEGAL_KB.md`

> **Reference documentation** for the `legalKB.json` / `legal_kb.json` files used by the Aqdy RAG pipeline.  
> This document describes every clause in the knowledge base: its ID, category, risk level, legal reference, and applicable contract types.

---

## Table of Contents

1. [Overview](#overview)
2. [File Locations](#file-locations)
3. [Clause Schema](#clause-schema)
4. [Complete Clause Inventory](#complete-clause-inventory)
   - [Critical Risk Clauses 🔴](#critical-risk-clauses-)
   - [High Risk Clauses 🟠](#high-risk-clauses-)
   - [Medium Risk Clauses 🟡](#medium-risk-clauses-)
   - [Low Risk Clauses 🟢](#low-risk-clauses-)
5. [Category Summary](#category-summary)
6. [Legal References Index](#legal-references-index)
7. [Contract Type Coverage](#contract-type-coverage)

---

## Overview

The Aqdy Legal Knowledge Base (KB) is a curated dataset of **50 real legal clause patterns** commonly found in Egyptian and MENA-region contracts. Each clause includes:

- **Bilingual content** (Arabic + English) for explanation, risk rationale, and safer alternatives
- **Risk classification** on a 4-level scale: `critical`, `high`, `medium`, `low`
- **Legal citations** referencing specific Egyptian law articles
- **Contract type tags** indicating which contract categories the clause applies to

The KB is used by the RAG pipeline to ground LLM risk analysis in domain-specific legal knowledge. See [`rag-and-embedding.md`](./rag-and-embedding.md) for pipeline details.

---

## File Locations

| File | Path | Notes |
|---|---|---|
| Primary KB | `backend/src/data/legalKB.json` | Used by `embedKB.ts` |
| Alias | `backend/src/data/legal_kb.json` | Identical copy |

Both files are identical. `legalKB.json` is the canonical name referenced in code.

---

## Clause Schema

Each clause object conforms to this TypeScript interface:

```typescript
interface Clause {
  id: string;              // Unique slug, e.g. "clause_001_unlimited_liability"
  category: string;        // Topic area, e.g. "liability"
  riskLevel: string;       // "critical" | "high" | "medium" | "low"
  clausePattern: string;   // Template text of the risky clause in English
  keywords: string[];      // Bilingual keywords for retrieval matching
  explanation: {
    ar: string;            // Arabic explanation of what the clause means
    en: string;            // English explanation
  };
  whyRisky: {
    ar: string;            // Why this clause is risky (Arabic)
    en: string;            // Why this clause is risky (English)
  };
  saferAlternative: {
    ar: string;            // Recommended safer wording (Arabic)
    en: string;            // Recommended safer wording (English)
  };
  relatedLaw?: string;     // Egyptian law citation, e.g. "Egyptian Civil Code Article 224"
  contractTypes: string[]; // Contract categories this clause applies to
}
```

---

## Complete Clause Inventory

### Critical Risk Clauses 🔴

These clauses can cause **catastrophic financial or legal harm** and should be rejected or heavily renegotiated.

---

#### `clause_001_unlimited_liability`
| Field | Value |
|---|---|
| **Category** | `liability` |
| **Risk Level** | 🔴 critical |
| **Pattern** | *"The Service Provider shall be liable for unlimited damages arising from any breach"* |
| **Related Law** | Egyptian Civil Code Article 224 |
| **Contract Types** | service_agreement, freelance, vendor |

**Why it's dangerous:** Exposes the service provider to catastrophic financial losses far exceeding the contract value, with no cap.

**Safer alternative:** Cap liability at total contract value or 12 months of fees, whichever is lower.

---

#### `clause_003_unilateral_modification`
| Field | Value |
|---|---|
| **Category** | `amendment` |
| **Risk Level** | 🔴 critical |
| **Pattern** | *"The Company reserves the right to modify these terms at any time without prior notice"* |
| **Related Law** | Egyptian Civil Code Article 147 |
| **Contract Types** | service_agreement, employment, subscription, vendor |

**Why it's dangerous:** The other party can change prices, obligations, or scope entirely without your knowledge or consent.

**Safer alternative:** Any modification requires written consent from both parties with minimum 30 days advance notice.

---

#### `clause_004_ip_assignment_broad`
| Field | Value |
|---|---|
| **Category** | `intellectual_property` |
| **Risk Level** | 🔴 critical |
| **Pattern** | *"All work product and intellectual property created by Employee whether during or outside working hours shall be the sole property of the Company"* |
| **Related Law** | Egyptian IP Law No. 82/2002 Article 135 |
| **Contract Types** | employment |

**Why it's dangerous:** Employer claims ownership of all your creations — including personal projects, side businesses, and hobbies — made in your own time.

**Safer alternative:** Ownership limited to work directly related to company business, created during working hours, using company resources only.

---

#### `clause_019_unilateral_salary_cut`
| Field | Value |
|---|---|
| **Category** | `compensation` |
| **Risk Level** | 🔴 critical |
| **Pattern** | *"The Company reserves the right to adjust the Employee's salary downward based on performance reviews at any time"* |
| **Related Law** | Egyptian Labor Law No. 12/2003 Article 35 |
| **Contract Types** | employment |

**Why it's dangerous:** Agreed salary is not guaranteed; company can reduce it unilaterally based on subjective criteria.

**Safer alternative:** Salary is guaranteed; any adjustment requires written consent with pre-defined, objective performance criteria.

---

#### `clause_049_waiver_of_claims`
| Field | Value |
|---|---|
| **Category** | `termination` |
| **Risk Level** | 🔴 critical |
| **Pattern** | *"Upon signing this agreement Employee waives all rights to bring any future claims against the Company relating to their employment"* |
| **Related Law** | Egyptian Labor Law No. 12/2003 Article 67 |
| **Contract Types** | employment |

**Why it's dangerous:** Forces advance waiver of all legal rights before they even arise. **Legally void in Egypt** — you cannot waive rights that do not yet exist.

**Safer alternative:** This clause is legally unenforceable in Egypt. Reject entirely.

---

### High Risk Clauses 🟠

These clauses are **seriously unfair or violate Egyptian law** and require negotiation before signing.

---

#### `clause_002_automatic_renewal`
| Field | Value |
|---|---|
| **Category** | `termination` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"This agreement shall automatically renew for successive periods unless terminated with 90 days written notice"* |
| **Related Law** | Egyptian Commercial Law Article 67 |
| **Contract Types** | service_agreement, subscription, vendor |

**Why it's dangerous:** 90-day notice window is easy to miss, locking you in for another full term.

**Safer alternative:** Reduce notice period to 30 days; convert to opt-in renewal.

---

#### `clause_005_non_compete_broad`
| Field | Value |
|---|---|
| **Category** | `non_compete` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"Employee shall not engage in any business competing with the Company for 2 years after termination within any geographic area where the Company operates"* |
| **Related Law** | Egyptian Labor Law No. 12/2003 Article 66 |
| **Contract Types** | employment |

**Why it's dangerous:** Could ban you from your entire professional field for 2 years.

**Safer alternative:** 6-month maximum; narrow geographic and professional scope; financial compensation for restriction period.

---

#### `clause_006_unilateral_termination`
| Field | Value |
|---|---|
| **Category** | `termination` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"The Company may terminate this agreement at any time with or without cause with no obligation to provide notice or compensation"* |
| **Related Law** | Egyptian Labor Law No. 12/2003 Articles 120–122 |
| **Contract Types** | employment, freelance, service_agreement |

**Safer alternative:** Minimum 30-day notice + severance compensation for termination without cause.

---

#### `clause_007_excessive_penalty`
| Field | Value |
|---|---|
| **Category** | `penalties` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"In case of any breach the breaching party shall pay a penalty of 50% of the total contract value per incident"* |
| **Related Law** | Egyptian Civil Code Article 224 |
| **Contract Types** | service_agreement, vendor, freelance |

**Safer alternative:** Graduated penalties proportional to actual damage, with a reasonable maximum cap.

---

#### `clause_008_payment_discretion`
| Field | Value |
|---|---|
| **Category** | `payment` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"Payment shall be made at the sole discretion of the Client based on their assessment of work quality"* |
| **Related Law** | Egyptian Commercial Law Article 348 |
| **Contract Types** | freelance, service_agreement |

**Safer alternative:** Clear, objective acceptance criteria with a mandatory payment obligation upon meeting agreed standards.

---

#### `clause_009_data_sharing_broad`
| Field | Value |
|---|---|
| **Category** | `privacy` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"The Company may share your personal data with third parties for marketing and business purposes without further notice"* |
| **Related Law** | Egyptian Data Protection Law No. 151/2020 |
| **Contract Types** | service_agreement, subscription, employment |

**Safer alternative:** Explicit opt-in consent required for each data sharing purpose; right to withdraw at any time.

---

#### `clause_010_foreign_jurisdiction`
| Field | Value |
|---|---|
| **Category** | `dispute_resolution` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"Any disputes shall be resolved exclusively in the courts of a foreign country under foreign law"* |
| **Related Law** | Egyptian Civil Procedure Law Article 1 |
| **Contract Types** | service_agreement, vendor, employment |

**Safer alternative:** Local arbitration via CRCICA, or Egyptian courts as an option for the Egyptian party.

---

#### `clause_013_forced_arbitration`
| Field | Value |
|---|---|
| **Category** | `dispute_resolution` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"By signing this agreement Employee waives the right to participate in any class action lawsuit and agrees to binding individual arbitration only"* |
| **Related Law** | Egyptian Arbitration Law No. 27/1994 |
| **Contract Types** | employment, service_agreement |

**Safer alternative:** If arbitration is mandatory, negotiate cost-sharing, arbitrator neutrality, and right to appeal.

---

#### `clause_016_mandatory_unpaid_overtime`
| Field | Value |
|---|---|
| **Category** | `working_conditions` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"Employee agrees to work such hours as required by the business including weekends and holidays without additional compensation"* |
| **Related Law** | Egyptian Labor Law No. 12/2003 Articles 84–90 |
| **Contract Types** | employment |

**Why it's dangerous:** **Violates Egyptian Labor Law** which mandates overtime pay for hours beyond 8 per day.

**Safer alternative:** Overtime pay per Egyptian Labor Law; maximum working hours specified.

---

#### `clause_017_blanket_indemnity`
| Field | Value |
|---|---|
| **Category** | `indemnification` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"The Contractor shall indemnify and hold harmless the Client from any and all claims damages or expenses arising from the Contractor's services"* |
| **Related Law** | Egyptian Civil Code Article 216 |
| **Contract Types** | freelance, service_agreement |

**Safer alternative:** Indemnification limited to claims directly caused by your negligence or willful misconduct only.

---

#### `clause_018_leave_denial`
| Field | Value |
|---|---|
| **Category** | `leave` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"Leave entitlement is subject to business requirements and may be denied at the Company's sole discretion"* |
| **Related Law** | Egyptian Labor Law No. 12/2003 Article 47 |
| **Contract Types** | employment |

**Why it's dangerous:** **Violates Egyptian Labor Law** — paid annual leave is a guaranteed right that cannot be waived by contract.

---

#### `clause_022_moral_rights_waiver`
| Field | Value |
|---|---|
| **Category** | `intellectual_property` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"Contractor waives all moral rights in the work product including the right to attribution and the right to object to modifications"* |
| **Related Law** | Egyptian IP Law No. 82/2002 Articles 143–145 |
| **Contract Types** | freelance, service_agreement |

**Safer alternative:** Retain attribution rights for personal portfolio at minimum.

---

#### `clause_026_ownership_dispute`
| Field | Value |
|---|---|
| **Category** | `intellectual_property` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"Any dispute regarding ownership of deliverables shall be resolved in the Company's favor pending resolution"* |
| **Related Law** | Egyptian IP Law No. 82/2002 |
| **Contract Types** | freelance, service_agreement |

**Safer alternative:** Ownership held equally during dispute or reverts to creator until final ruling.

---

#### `clause_029_no_severance`
| Field | Value |
|---|---|
| **Category** | `termination` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"Upon termination for any reason Employee shall not be entitled to any severance pay gratuity or compensation beyond the last day worked"* |
| **Related Law** | Egyptian Labor Law No. 12/2003 Articles 126–130 |
| **Contract Types** | employment |

**Why it's dangerous:** **Legally void in Egypt** — end-of-service gratuity cannot be contracted away.

---

#### `clause_030_exclusive_client`
| Field | Value |
|---|---|
| **Category** | `exclusivity` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"Contractor agrees to work exclusively for Client and shall not accept any other projects during the contract term"* |
| **Related Law** | Egyptian Civil Code Article 67 |
| **Contract Types** | freelance, service_agreement |

**Safer alternative:** Reject exclusivity or limit to direct competitors only with financial compensation.

---

#### `clause_041_termination_no_payment`
| Field | Value |
|---|---|
| **Category** | `termination` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"Upon early termination by the Client no payment shall be made for work completed but not yet delivered"* |
| **Related Law** | Egyptian Civil Code Articles 157–162 |
| **Contract Types** | freelance, service_agreement |

**Safer alternative:** Payment for percentage of work completed at termination date, plus early termination compensation.

---

#### `clause_044_joint_and_several_liability`
| Field | Value |
|---|---|
| **Category** | `liability` |
| **Risk Level** | 🟠 high |
| **Pattern** | *"In case of a joint venture all parties shall be jointly and severally liable for the full amount of any damages or penalties"* |
| **Related Law** | Egyptian Civil Code Article 280 |
| **Contract Types** | vendor, service_agreement |

**Safer alternative:** Limit each party's liability to their ownership share in the project.

---

### Medium Risk Clauses 🟡

These clauses are **unfavorable and require negotiation** — not immediately dangerous but worth addressing.

---

#### `clause_011_compound_interest`
| Field | Value |
|---|---|
| **Category** | `payment` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"Late payments shall incur interest at 5% per month compounded monthly until full payment is received"* |
| **Related Law** | Egyptian Civil Code Article 226 |
| **Contract Types** | service_agreement, vendor, freelance |

**Safer alternative:** Simple (not compound) interest at Central Bank of Egypt rate + 2%.

---

#### `clause_012_indefinite_nda`
| Field | Value |
|---|---|
| **Category** | `confidentiality` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"The confidentiality obligations under this agreement shall survive indefinitely and apply to all information disclosed"* |
| **Related Law** | Egyptian Commercial Law Article 66 |
| **Contract Types** | employment, freelance, nda |

**Safer alternative:** 3–5 year time limit; explicitly exclude publicly available information.

---

#### `clause_014_scope_creep`
| Field | Value |
|---|---|
| **Category** | `scope_of_work` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"The Service Provider shall perform any additional tasks reasonably requested by the Client without additional compensation"* |
| **Related Law** | Egyptian Civil Code Article 150 |
| **Contract Types** | freelance, service_agreement |

**Safer alternative:** Defined scope + formal change request process with pricing for additional work.

---

#### `clause_015_delayed_payment_90`
| Field | Value |
|---|---|
| **Category** | `payment` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"Payment shall be made within 90 days of invoice receipt subject to internal approval processes"* |
| **Related Law** | Egyptian Commercial Law Article 369 |
| **Contract Types** | freelance, service_agreement, vendor |

**Safer alternative:** 30-day payment terms with automatic late fees and service suspension rights.

---

#### `clause_020_warranty_disclaimer`
| Field | Value |
|---|---|
| **Category** | `warranties` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"Services are provided as is without any warranty express or implied including fitness for a particular purpose"* |
| **Related Law** | Egyptian Consumer Protection Law No. 181/2018 |
| **Contract Types** | service_agreement, vendor, subscription |

**Safer alternative:** Basic warranty that the service will perform its agreed core functions with a complaint process.

---

#### `clause_021_narrow_force_majeure`
| Field | Value |
|---|---|
| **Category** | `force_majeure` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"Force majeure events are limited to acts of God only and do not include epidemics government actions or supply chain disruptions"* |
| **Related Law** | Egyptian Civil Code Article 165 |
| **Contract Types** | service_agreement, vendor, employment |

**Safer alternative:** Broader definition including pandemics, natural disasters, government orders, and supply chain disruptions.

---

#### `clause_023_long_probation`
| Field | Value |
|---|---|
| **Category** | `employment_terms` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"During the probationary period of 6 months the Company may terminate employment without notice cause or compensation"* |
| **Related Law** | Egyptian Labor Law No. 12/2003 Article 28 |
| **Contract Types** | employment |

**Why it's risky:** **Illegal in Egypt** — probation period is capped at 3 months.

---

#### `clause_024_device_monitoring`
| Field | Value |
|---|---|
| **Category** | `privacy` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"The Company reserves the right to monitor all communications including personal emails and messages on company devices"* |
| **Related Law** | Egyptian Data Protection Law No. 151/2020 |
| **Contract Types** | employment |

**Safer alternative:** Monitoring limited to professional communications only; employee notified of policy.

---

#### `clause_027_non_solicitation`
| Field | Value |
|---|---|
| **Category** | `non_solicitation` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"For 1 year after termination Employee shall not solicit or hire any current employee of the Company"* |
| **Related Law** | Egyptian Labor Law No. 12/2003 |
| **Contract Types** | employment |

**Safer alternative:** 6 months; limited to employees you directly managed.

---

#### `clause_028_confidentiality_no_exceptions`
| Field | Value |
|---|---|
| **Category** | `confidentiality` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"Employee shall not disclose any information obtained during employment under any circumstances including legal proceedings"* |
| **Related Law** | Egyptian Criminal Procedure Law |
| **Contract Types** | employment, nda |

**Why it's risky:** Could expose you to contempt of court charges if required to testify.

**Safer alternative:** Explicitly exclude disclosures required by law, government authorities, or courts.

---

#### `clause_031_contract_renewal_price_hike`
| Field | Value |
|---|---|
| **Category** | `payment` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"Upon renewal the Company may increase service fees by up to 30% without requiring the Client's consent"* |
| **Related Law** | Egyptian Civil Code Article 147 |
| **Contract Types** | subscription, service_agreement |

**Safer alternative:** Cap annual increase to inflation rate only; right to cancel without penalty if price rises.

---

#### `clause_032_ip_pre_existing`
| Field | Value |
|---|---|
| **Category** | `intellectual_property` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"Any pre-existing IP brought into the project by the Contractor becomes part of the deliverables and property of the Client"* |
| **Related Law** | Egyptian IP Law No. 82/2002 |
| **Contract Types** | freelance, service_agreement |

**Safer alternative:** Pre-existing IP remains contractor's property; client gets a license to use it for the project only.

---

#### `clause_033_liability_cap_low`
| Field | Value |
|---|---|
| **Category** | `liability` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"The total liability of the Service Provider shall not exceed EGP 1,000 regardless of the nature of the claim"* |
| **Related Law** | Egyptian Civil Code Article 224 |
| **Contract Types** | service_agreement, freelance |

**Safer alternative:** Liability cap should be proportional to contract value (e.g., total fees paid).

---

#### `clause_034_unilateral_sla_change`
| Field | Value |
|---|---|
| **Category** | `amendment` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"The Provider may update the Service Level Agreement at any time and such updates shall be effective immediately"* |
| **Related Law** | Egyptian Civil Code Article 147 |
| **Contract Types** | subscription, service_agreement |

**Safer alternative:** SLA changes require 30-day advance notice with the right to terminate without penalty.

---

#### `clause_035_termination_clause_asymmetric`
| Field | Value |
|---|---|
| **Category** | `termination` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"The Company may terminate with 7 days notice while the Service Provider must provide 90 days notice to terminate"* |
| **Related Law** | Egyptian Civil Code Article 148 |
| **Contract Types** | service_agreement, freelance |

**Safer alternative:** Equal notice periods for both parties.

---

#### `clause_036_non_disparagement`
| Field | Value |
|---|---|
| **Category** | `confidentiality` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"Employee agrees not to make any negative statements about the Company its products or its employees after termination"* |
| **Related Law** | Egyptian Civil Code Article 50 |
| **Contract Types** | employment |

**Safer alternative:** Mutual non-disparagement; exclude truthful factual statements; time-limited to 1 year.

---

#### `clause_037_liquidated_damages_unilateral`
| Field | Value |
|---|---|
| **Category** | `penalties` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"The Client may deduct liquidated damages directly from outstanding invoices without prior notice or agreement from the Contractor"* |
| **Related Law** | Egyptian Civil Code Article 224 |
| **Contract Types** | service_agreement, vendor |

**Safer alternative:** Deductions require written notice; contractor has 15 days to dispute before deduction occurs.

---

#### `clause_038_entire_agreement_block`
| Field | Value |
|---|---|
| **Category** | `amendment` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"This agreement constitutes the entire agreement and supersedes all prior representations warranties or commitments made during negotiations"* |
| **Related Law** | Egyptian Civil Code Article 91 |
| **Contract Types** | service_agreement, employment, nda, vendor |

**Why it's risky:** Verbal promises made during negotiation (e.g., salary progression, bonus, promotion) are eliminated.

**Safer alternative:** Attach a written summary of negotiated commitments as an annexure before signing.

---

#### `clause_040_ambiguous_deliverables`
| Field | Value |
|---|---|
| **Category** | `scope_of_work` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"The Contractor shall deliver all necessary work as determined by the Client from time to time"* |
| **Related Law** | Egyptian Civil Code Article 150 |
| **Contract Types** | freelance, service_agreement |

**Safer alternative:** Precise deliverables defined in a detailed appendix with clear acceptance criteria.

---

#### `clause_045_insurance_requirement`
| Field | Value |
|---|---|
| **Category** | `obligations` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"The Contractor must maintain professional indemnity insurance of no less than 5 million EGP throughout the contract term"* |
| **Related Law** | Egyptian Insurance Law No. 10/1981 |
| **Contract Types** | service_agreement, vendor |

**Safer alternative:** Insurance amount proportional to actual contract value; cost shared with client.

---

#### `clause_048_benchmarking_clause`
| Field | Value |
|---|---|
| **Category** | `payment` |
| **Risk Level** | 🟡 medium |
| **Pattern** | *"The Client may reduce fees if market benchmarking shows the Contractor's rates exceed industry average by more than 10%"* |
| **Related Law** | Egyptian Civil Code Article 148 |
| **Contract Types** | vendor, service_agreement |

**Safer alternative:** Neutral third-party benchmarking; right to reject or terminate without penalty.

---

### Low Risk Clauses 🟢

These clauses are **minor concerns or even favorable** — worth noting but not urgent. Some are examples of good practice.

---

#### `clause_025_no_subcontract`
| Field | Value |
|---|---|
| **Category** | `performance` |
| **Risk Level** | 🟢 low |
| **Pattern** | *"The Service Provider shall not subcontract any part of this agreement without prior written consent from the Client"* |
| **Related Law** | Egyptian Civil Code Article 706 |
| **Contract Types** | freelance, service_agreement |

**Safer alternative:** Add "not unreasonably withheld" standard; specify response deadline for approval requests.

---

#### `clause_039_no_written_variation`
| Field | Value |
|---|---|
| **Category** | `amendment` |
| **Risk Level** | 🟢 low |
| **Pattern** | *"No amendment to this agreement shall be valid unless made in writing and signed by both parties"* |
| **Related Law** | Egyptian Electronic Signature Law No. 15/2004 |
| **Contract Types** | service_agreement, employment, nda, vendor |

**Note:** This is a **positive clause** protecting both parties. Verify whether electronic signatures are explicitly accepted.

---

#### `clause_042_governing_law_egypt`
| Field | Value |
|---|---|
| **Category** | `governing_law` |
| **Risk Level** | 🟢 low |
| **Pattern** | *"This agreement shall be governed by and construed in accordance with the laws of the Arab Republic of Egypt"* |
| **Related Law** | Egyptian Civil Code |
| **Contract Types** | service_agreement, employment, nda, vendor |

**Note:** This is a **favorable clause** for Egyptian parties. Ensure dispute resolution clause also specifies Egyptian courts.

---

#### `clause_043_no_reference_guarantee`
| Field | Value |
|---|---|
| **Category** | `employment_terms` |
| **Risk Level** | 🟢 low |
| **Pattern** | *"The Company reserves the right to provide any reference or no reference at its sole discretion following termination"* |
| **Related Law** | Egyptian Labor Law No. 12/2003 Article 132 |
| **Contract Types** | employment |

**Safer alternative:** Negotiate for a neutral reference confirming dates of employment and job title at minimum.

---

#### `clause_046_right_of_first_refusal`
| Field | Value |
|---|---|
| **Category** | `obligations` |
| **Risk Level** | 🟢 low |
| **Pattern** | *"The Contractor grants the Client the right of first refusal on all future projects for a period of 2 years"* |
| **Related Law** | Egyptian Civil Code Article 940 |
| **Contract Types** | freelance, service_agreement |

**Safer alternative:** Limit to project types related to client's field; shorten to 6 months maximum.

---

#### `clause_047_notice_valid_email_only`
| Field | Value |
|---|---|
| **Category** | `notices` |
| **Risk Level** | 🟢 low |
| **Pattern** | *"All notices under this agreement shall be sent by registered mail only and are deemed received 7 days after posting"* |
| **Related Law** | Egyptian Civil Code Article 67 |
| **Contract Types** | service_agreement, employment, nda, vendor |

**Safer alternative:** Accept official email with read receipt as valid notification.

---

#### `clause_050_balanced_termination`
| Field | Value |
|---|---|
| **Category** | `termination` |
| **Risk Level** | 🟢 low |
| **Pattern** | *"Either party may terminate this agreement with 30 days written notice. In case of material breach the non-breaching party may terminate immediately after 15 days cure period"* |
| **Related Law** | Egyptian Civil Code Article 157 |
| **Contract Types** | service_agreement, freelance, vendor |

**Note:** This is a **well-balanced clause**. Ensure "material breach" is clearly defined in a contract appendix.

---

## Category Summary

| Category | Clauses | Highest Risk |
|---|---|---|
| `liability` | 3 | 🔴 critical |
| `termination` | 8 | 🔴 critical |
| `intellectual_property` | 4 | 🔴 critical |
| `amendment` | 4 | 🔴 critical |
| `compensation` | 1 | 🔴 critical |
| `payment` | 6 | 🟠 high |
| `dispute_resolution` | 2 | 🟠 high |
| `privacy` | 2 | 🟠 high |
| `working_conditions` | 1 | 🟠 high |
| `indemnification` | 1 | 🟠 high |
| `exclusivity` | 1 | 🟠 high |
| `non_compete` | 1 | 🟠 high |
| `leave` | 1 | 🟠 high |
| `confidentiality` | 3 | 🟡 medium |
| `scope_of_work` | 2 | 🟡 medium |
| `force_majeure` | 1 | 🟡 medium |
| `warranties` | 1 | 🟡 medium |
| `employment_terms` | 2 | 🟡 medium |
| `penalties` | 2 | 🟡 medium |
| `obligations` | 2 | 🟢 low |
| `non_solicitation` | 1 | 🟡 medium |
| `performance` | 1 | 🟢 low |
| `notices` | 1 | 🟢 low |
| `governing_law` | 1 | 🟢 low |

**Total: 50 clauses across 24 categories**

---

## Legal References Index

| Law | Articles Cited | Categories Covered |
|---|---|---|
| Egyptian Civil Code (No. 131/1948) | 50, 67, 91, 147, 148, 150, 157–162, 165, 216, 224, 226, 280, 706, 940 | liability, amendment, termination, force_majeure, penalties, payment, indemnification |
| Egyptian Labor Law (No. 12/2003) | 28, 35, 47, 66, 67, 84–90, 120–122, 126–130, 132 | employment_terms, compensation, leave, non_compete, working_conditions, termination |
| Egyptian IP Law (No. 82/2002) | 82, 135, 143–145 | intellectual_property |
| Egyptian Data Protection Law (No. 151/2020) | — | privacy |
| Egyptian Arbitration Law (No. 27/1994) | — | dispute_resolution |
| Egyptian Commercial Law (No. 17/1999) | 66, 67, 348, 369 | confidentiality, payment |
| Egyptian Civil Procedure Law | Art. 1 | dispute_resolution |
| Egyptian Consumer Protection Law (No. 181/2018) | — | warranties |
| Egyptian Insurance Law (No. 10/1981) | — | obligations |
| Egyptian Electronic Signature Law (No. 15/2004) | — | amendment |
| Egyptian Criminal Procedure Law | — | confidentiality |

---

## Contract Type Coverage

| Contract Type | # Clauses | Key Risk Areas |
|---|---|---|
| `employment` | 22 | IP, non-compete, overtime, probation, severance, salary, leave |
| `service_agreement` | 21 | Liability, payment, scope, termination, indemnification |
| `freelance` | 18 | Payment, scope, IP, exclusivity, indemnification |
| `vendor` | 14 | Liability, payment, renewal, joint liability, insurance |
| `subscription` | 6 | Renewal, data sharing, price hike, SLA |
| `nda` | 5 | Confidentiality scope, duration, legal disclosure |

---

*Last updated: May 2026 | Aqdy Platform Documentation*
