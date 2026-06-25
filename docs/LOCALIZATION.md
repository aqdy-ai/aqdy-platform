# LOCALIZATION

## Overview
This document describes how Aqdy’s bilingual (Arabic/English) architecture handles internationalization (i18n), right‑to‑left (RTL) layout, and Arabic legal terminology.

### i18n Setup
- Uses **i18next** with a JSON resource bundle per language (`en.json`, `ar.json`).
- All static strings are accessed via the `t('key')` function.
- Dates and numbers are formatted with **Intl.DateTimeFormat** and **Intl.NumberFormat** based on the user’s locale.

### RTL Layout Implementation
- Global CSS variable `--direction` is set to `ltr` or `rtl` based on the selected language.
- Core layout components (header, sidebar, cards) use `direction: var(--direction);`.
- Utility classes:
  ```css
  .rtl { direction: rtl; text-align: right; }
  .ltr { direction: ltr; text-align: left; }
  ```
- Ant Design’s `ConfigProvider` is configured with `direction: 'rtl'` when Arabic is active.

### Arabic Legal Terminology & Dialects
- Legal terms are stored in `arLegal.json` with keys that map to region‑specific variations (e.g., `en-US`, `ar-EG`, `ar-SA`).
- When a contract is uploaded, the language detector selects the appropriate dialect bundle.
- Guidelines for contributors:
  1. Use **Modern Standard Arabic** as the base language.
  2. Add dialect‑specific overrides only when a term differs significantly.
  3. Keep terminology consistent with the **Legal Glossary** (`docs/LEGAL_GLOSSARY.md`).

### Adding New Arabic Content
1. Add the translation key/value to `src/i18n/ar.json` (or the relevant dialect file).
2. If UI layout changes, ensure the component respects the `--direction` variable.
3. Run `npm run lint:i18n` to validate JSON syntax.

### Maintaining RTL Styling for New Features
- Wrap new UI components with the `rtl`/`ltr` class based on the current locale.
- Test both directions using the language switcher in the dev environment.
- Verify contrast & spacing with the accessibility checklist (see `ACCESSIBILITY.md`).

---

*This file is part of the documentation suite and should be kept up‑to‑date with any i18n or RTL changes.*
