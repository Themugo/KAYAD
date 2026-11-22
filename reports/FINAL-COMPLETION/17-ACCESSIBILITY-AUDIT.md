# 17 — Accessibility Audit

**No WCAG conformance or certification is claimed.** Automated axe-core (wcag2a/2aa/21a/21aa/22aa tags) in real Chromium at 390 and 1280 px, 9 surfaces, light and dark (`evidence/browser-*/audit.json`). Automated tools find only a subset of issues.

## Light theme (the shipped theme)
| Surface | Result |
|---|---|
| login, dealer overview/inventory/banking/settings, personal dashboard, personal profile | **0 axe violations** |
| home, marketplace | `color-contrast` 4 nodes (featured-vehicle card text on its gradient); `target-size` 5 nodes (carousel previous/next, nav toggle buttons) |
Both findings are on the approved homepage; fixing them touches homepage elements (owner approval pending per doc 02), so they were not changed.

## Dark theme (forced; not shipped) — see 16: 138 contrast nodes summed, mostly public pages.

## Manual
Keyboard-only and screen-reader passes: **NOT PERFORMED** (no screen reader in this environment; NVDA/VoiceOver/TalkBack NOT TESTED). New controls were built with roles/labels (`radiogroup`, `role=alert` on failure states) but not manually verified.
