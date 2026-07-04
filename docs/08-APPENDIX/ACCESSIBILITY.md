# Accessibility — WCAG 2.1 AA Compliance

> Screen reader support, keyboard navigation, RTL accessibility, and focus management for the Aqdy AI contract analysis platform.

---

## Overview

Aqdy targets **WCAG 2.1 Level AA** compliance across all user-facing interfaces. The platform serves Arabic-speaking users as a primary audience, which adds RTL-specific requirements on top of standard accessibility practices.

---

## 1. Keyboard Navigation

All interactive elements are reachable and operable via keyboard alone.

| Element | Behaviour |
|:---|:---|
| Navigation links (`<Link>`, `<a>`) | Focusable via `Tab`; activated with `Enter` |
| Buttons | Focusable; activated with `Enter` or `Space` |
| Contract upload drop-zone | `role="button"`, `tabIndex={0}`, `onKeyDown` handles `Enter` / `Space` |
| User dropdown menu | `aria-haspopup="true"`, `aria-expanded` toggles; `Tab` exits the menu |
| Modal / disclaimer | Traps focus inside while open; `Escape` closes |
| Form inputs | All form fields have associated `<label>` elements |

### Drop-zone Keyboard Pattern

```tsx
// ContractUpload.tsx
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    fileInputRef.current?.click()
  }
}}
role="button"
tabIndex={0}
```

### Focus Styles

Tailwind CSS utilities are used for consistent, high-visibility focus rings:

```css
focus-visible:ring-primary focus-visible:ring-2
```

Focus rings appear **only on keyboard navigation** (`:focus-visible` pseudo-class), keeping the UI clean for mouse users without sacrificing keyboard usability.

---

## 2. Semantic HTML & ARIA

### Landmark Roles

| Landmark | Element |
|:---|:---|
| Navigation | `<nav>` (Navbar) |
| Main content | `<main>` (via React Router outlet in `MainLayout`) |
| Footer | `<footer>` (Footer component) |
| Dialogs / modals | `role` applied at component level |

### ARIA Labels

Key interactive elements carry explicit ARIA attributes sourced from i18n translations:

```tsx
// Navbar — language-aware ARIA labels
<button aria-label={t('common.toggle_theme')}>…</button>
<button aria-label="Switch Language">…</button>

// User menu
<button
  aria-expanded={dropdownOpen}
  aria-haspopup="true"
  aria-label={t('nav.settings')}
  id="user-menu-button"
>
<div
  role="menu"
  aria-orientation="vertical"
  aria-labelledby="user-menu-button"
>

// Menu items
<Link role="menuitem">…</Link>
<button role="menuitem">…</button>
```

### Screen Reader Support

- **Icon-only buttons**: Lucide React icons include `aria-hidden="true"` to prevent screen readers from announcing decorative SVG content.
- **Text-to-speech (TTS)**: The `useSpeechSynthesis` hook and `speakText` utility (`lib/speech.ts`) drive a **read-aloud** feature on clause explanation cards, supporting both `ar-EG` and `en-US` voice synthesis via the Web Speech API.
- **Error messages**: Validation errors are surfaced through `sonner` toasts with `richColors`; toast content is provided with descriptive text rather than just icons.

### Hidden Elements

```tsx
// File input visually hidden but functional
<input
  type="file"
  className="sr-only"
  aria-hidden="true"
/>
```

The `sr-only` Tailwind class keeps the native `<input type="file">` out of the visual layout while keeping it in the DOM for screen readers when necessary.

---

## 3. Color Contrast

The design system is built on OKLCH color tokens with contrast ratios deliberately set to meet AA requirements.

| Token pair | Context | WCAG target |
|:---|:---|:---|
| `--primary` on `--background` (light) | Primary buttons, links | ≥ 4.5 : 1 |
| `--primary` on `--background` (dark) | Primary buttons, links | ≥ 4.5 : 1 |
| `--foreground` on `--background` | Body text | ≥ 4.5 : 1 |
| `--muted-foreground` on `--muted` | Secondary text | ≥ 3 : 1 (large text) |
| `--destructive` | Error states | ≥ 4.5 : 1 |

Risk severity badges use colour **and** icon + text to avoid relying on colour alone:

- 🔴 **High** — `ShieldAlert` icon + red label
- 🟡 **Medium** — `AlertTriangle` icon + amber label
- 🟢 **Low** — `ShieldCheck` icon + green label

---

## 4. RTL (Right-to-Left) Accessibility

### Direction Management

The application detects the active language and applies `dir` and `lang` attributes to `<html>`:

```tsx
// App.tsx — AppContent effect
document.documentElement.dir = getDirection(i18n.language as SupportedLocale)
document.documentElement.lang = i18n.language
```

```css
/* index.css — Arabic font override */
:root[dir='rtl'] {
  --font-sans: 'Inter', 'Noto Sans Arabic', sans-serif;
}
```

### Tailwind Logical Properties

All layout components use Tailwind's logical (direction-agnostic) utilities:

| Physical (avoid) | Logical (used) |
|:---|:---|
| `pl-4` | `ps-4` (padding-inline-start) |
| `mr-2` | `me-2` (margin-inline-end) |
| `text-left` | `text-start` |

This ensures layouts mirror correctly in Arabic without separate RTL stylesheets.

### RTL-aware Components

- **`LanguageSwitcher`**: Toggles between `ar` / `en` and renders the opposing language label.
- **`Toaster`**: Configured with `dir="rtl"` for Arabic and `position="bottom-left"` for a natural reading start position.
- **`ContractUpload`**: Arrow animation direction reverses based on `isRtl`:
  ```tsx
  animate={{ x: isRtl ? [-4, 0, -4] : [4, 0, 4] }}
  ```
- **`ChevronRight`** in `DisclaimerModal` rotates 180° in RTL mode.

---

## 5. Focus Management

| Scenario | Implementation |
|:---|:---|
| Disclaimer modal | Blocks backdrop interaction (`e.stopPropagation()`); focus is constrained inside the card |
| User dropdown | `useRef` captures the dropdown container; `mousedown` event on `document` closes it when focus moves outside |
| Route transitions | React Router handles SPA navigation; page titles updated via `react-helmet-async` on each route |
| Error Boundary | Provides a "Try again" button — focusable and keyboard-activatable — so recovery does not require mouse |

---

## 6. Motion & Animation

All animations are implemented via **Framer Motion** with reasonable defaults. The platform respects the `prefers-reduced-motion` media query through Framer Motion's built-in motion safety, and none of the animations are essential to conveying information (they are purely cosmetic).

---

## 7. Forms & Validation

- All inputs use associated `<label>` elements.
- Password strength feedback (`PasswordStrengthIndicator`) provides text-based strength level descriptions alongside the visual indicator bars.
- Auth forms display inline validation feedback with descriptive text.
- File upload errors are conveyed via `sonner` custom toast with `AlertCircle` icon + descriptive message text.

---

## 8. Testing & Tooling

| Tool | Purpose |
|:---|:---|
| `eslint-plugin-jsx-a11y` | Static lint rules enforced in CI: `aria-props`, `aria-proptypes`, `aria-role`, `interactive-supports-focus` |
| `vitest-axe` | Automated axe-core rule execution within Vitest unit tests |
| Browser DevTools | Accessibility tree inspection during development |
| Lighthouse | Automated audit (Accessibility score) as part of review |

### ESLint Accessibility Rules (enforced)

```js
// eslint.config.js
...jsxA11y.flatConfigs.recommended.rules,
'jsx-a11y/aria-props': 'error',
'jsx-a11y/aria-proptypes': 'error',
'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
'jsx-a11y/interactive-supports-focus': 'error',
'jsx-a11y/anchor-is-valid': ['error', { aspects: ['invalidHref'] }],
```

### Running Accessibility Linting

```bash
# From the frontend directory
npm run lint:a11y      # Lint + Stylelint
npm run fix:a11y       # Auto-fix where possible
```

---

## 9. Known Limitations

- Mobile screen reader behaviour (VoiceOver / TalkBack) is validated manually during development sprints but is not yet part of the automated CI pipeline.
- The Recharts-based analytics charts in admin pages do not yet have full ARIA table fallbacks; this is tracked as a future improvement.

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [MDN ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
- [vitest-axe](https://github.com/nickmccurdy/vitest-axe)
- [Framer Motion — Accessibility](https://www.framer.com/motion/guide-accessibility/)
