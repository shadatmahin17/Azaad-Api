# Auth Gate Page Overrides (`AuthGate.jsx`)

> **PROJECT:** Azaad Music
> **Page Type:** Studio Authentication & Onboarding Console
> **Skill Applied:** UI/UX Pro Max (`ui-ux-pro-max`) + Universal Frontend Design Constitution

---

## Page-Specific Rules

### 1. Spatial Architecture & Viewport Presence
- **Desktop Layout (`lg:grid-cols-12`, `max-w-6xl`)**: Two-column split-stage layout eliminating the "Desert Island" floating 400px card anti-pattern:
  - **Left Stage (`lg:col-span-7`)**: Editorial studio showcase featuring borderless brand lockup, balanced display headline (`font-display`, `text-wrap: balance`), interactive live audio preview deck, and numbered capability breakdown (`01`, `02`, `03`).
  - **Right Stage (`lg:col-span-5`)**: Single-elevation OLED authentication console (`glass-card`) with zero nested card boxes.
- **Mobile Layout (`min-h-dvh`)**: Prioritizes the authentication form above the fold (`content-priority`) with compact brand header and 44px+ touch targets.

### 2. Accessibility & Form UX (`ui-ux-pro-max` §1 & §8)
- **Accessible Authentication (WCAG 2.2 AA)**:
  - Explicit `<label htmlFor="...">` for all fields (`auth-display-name`, `auth-email`, `auth-password`, `auth-confirm-password`).
  - Proper `autoComplete` tokens (`name`, `email`, `current-password`, `new-password`) and `inputMode="email"` to support password managers, autofill, and paste.
  - Non-cognitive authentication alternatives: 1-Click Google OAuth (`signInWithPopup`) and 1-Click Instant Studio Guest Pass.
- **Inline Validation on Blur (`inline-validation` & `error-placement`)**:
  - Validates fields on `onBlur` and connects field-level errors via `aria-invalid` and `aria-describedby`.
  - Focusable top error summary (`role="alert"`, `aria-live="assertive"`) with actionable recovery path (including instant Guest Session fallback if cloud credentials are not configured).
- **Touch Target & Interaction Discipline (`ui-ux-pro-max` §2)**:
  - Every interactive control (`button`, tab, input, password visibility toggle) enforces `min-h-[44px]` / `min-h-[48px]` and `touch-action: manipulation` with `cursor-pointer`.
- **Zero-Pill Metadata Discipline**:
  - Static metadata uses clean inline typography separated by `·` rather than pill badge clusters.
