# 10 — Accessibility, keyboard and responsive evidence

**No WCAG 2.2 AA compliance claim is made.** axe-core is an automated scanner that detects only part of the issues; results below are evidence and a defect list. Script: `ci/browser/admin-a11y.mjs`; raw data `evidence/a11y/a11y.json`. Disposable stack, Super Admin session, Chromium.

## Automated (axe-core tags wcag2a/2aa/21a/21aa/22aa) — all 53 routes at 390 and 1440 (106 page scans, 0 scan errors)
* 99 of 106 scans: no serious/critical violations.
* **Open findings (not fixed in this closure):**
  | Route | Width | Rule | Nodes |
  |---|---|---|---|
  | `/admin/staff` | 390, 1440 | color-contrast (serious) | 1 |
  | `/admin/staff-permissions` | 390, 1440 | color-contrast (serious) | 2 |
  | `/admin/communications` | 390, 1440 | color-contrast (serious) | 1 |
  | `/admin/vxp` (deliberately unavailable page) | 390 | target-size (serious) | 4 |
* Recommended follow-up: darken the offending muted-text token on those three pages; enlarge/space the four VXP controls. Each is a CSS-only change; deferred to avoid unreviewed visual change to Super-Admin-only pages.

## Responsive (7 viewports: 320, 360, 390, 430, 768, 1280, 1920 × 10 key routes = 70 samples)
* Horizontal page overflow: **0 of 70** samples (scrollWidth ≤ viewport + 1px).
* Screenshots: `evidence/a11y/320_*.png`, `1280_*.png` (dashboard, users, personal accounts).
* Small interactive targets (<24 CSS px) counted per width (informational, includes icon buttons and hidden-ish controls; max 15 on one page): not a pass/fail; WCAG 2.2 target-size is only assessed by axe above.

## Keyboard (5 routes, 45 Tab presses each)
* Skip link, `<main>`, `<nav>`, `lang` present on all five.
* Every focused element showed a focus indicator (0 without outline/box-shadow); no keyboard trap (44–45 distinct stops).
* **Finding:** `/admin/settings` has no `<h1>` (all other probed routes have exactly one). Deferred (document-structure only).

## Not done
Screen-reader pass (NVDA/VoiceOver/TalkBack), 200% zoom/reflow with real devices, forced-colors, reduced-motion review, dark mode. These remain NOT VERIFIED.
