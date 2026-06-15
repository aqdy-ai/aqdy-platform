# ACCESSIBILITY

## WCAG 2.1 AA Audit Checklist

| Feature | Pass/Fail | Notes |
|---|---|---|
| **Screen Reader Support** | ✅ Pass | All interactive elements have appropriate ARIA roles and labels. |
| **Keyboard Navigation** | ✅ Pass | Tab order follows logical reading order; focus indicators visible. |
| **Color Contrast (Text)** | ✅ Pass | Contrast ratios ≥ 4.5:1 for normal text, ≥ 3:1 for large text. |
| **Color Contrast (UI Controls)** | ✅ Pass | Buttons and links meet 3:1 contrast. |
| **Resizable Text** | ✅ Pass | Layout adapts up to 200% zoom without loss of content or functionality. |
| **ARIA Labels & Roles** | ✅ Pass | All custom components include `aria-label` or `role` attributes. |
| **Focus Management** | ✅ Pass | Modal dialogs trap focus and return focus on close. |
| **Language Attribute** | ✅ Pass | `lang="ar"` and `lang="en"` set correctly for bilingual pages. |
| **RTL Support** | ✅ Pass | Layout flips correctly; no overflow issues. |
| **Skip Navigation Link** | ✅ Pass | Visible on focus; allows fast jump to main content. |
| **Form Validation Feedback** | ✅ Pass | Errors announced to screen readers via `aria-live`. |
| **Timing Controls** | ✅ Pass | Users can extend timeouts where applicable. |
| **Accessible PDFs** | ✅ Pass | Generated reports include tagged PDFs. |

### Additional Notes
- Run automated aXe tests nightly (`npm run test:accessibility`).
- Manual screen‑reader walkthrough performed with NVDA (Arabic) and VoiceOver (English).
- Any new UI component must be added to this checklist before merging.

---
*This checklist is versioned alongside the codebase and should be updated whenever accessibility changes are made.*
