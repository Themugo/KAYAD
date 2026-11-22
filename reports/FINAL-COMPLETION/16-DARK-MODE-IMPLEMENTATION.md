# 16 — Dark Mode Implementation

**Status: PARTIALLY COMPLETE — infrastructure built and verified on dashboards; deliberately NOT ENABLED because public pages would render half-dark.**

## Built
- `src/theme/themePreference.ts`: light / dark / system, persisted (`kayard_theme_preference`), guarded storage, live OS following; `index.html` applies it before first paint. 4 unit tests.
- `src/components/ui/ThemeSwitcher.tsx`: accessible 3-option radio group (not mounted anywhere — see below).
- `scripts/generate-dark-theme.mjs` → `src/styles/dark-theme.generated.css`: 364 rules derived from the 503 existing colour classes by role (surface/text/border) in HSL, preserving the KAYARD KE teal/navy hue; guard test fails if stale.
- Tailwind `dark:` variant re-pointed to the same switch.

## Why disabled
Every rule requires `<html data-dark-ready="true">`, which nothing sets. Evidence (forced on in the audit): dashboards look coherent (`dealer-banking-dark-1280.png`) but the homepage/marketplace do not: header bar, search field and cards stay light because their colours come from inline styles and CSS files (≈ 2,100 literals) outside the class-based layer; heading text became unreadable (28 contrast failures on home/marketplace in dark vs 4 in light). A half-dark page is worse than none and the approved homepage must not change.
Side effect to know: existing `dark:` classes no longer react to the OS setting on public pages (previously they did, producing the same half-dark mix).

## Dashboards in dark (forced on)
Contrast failures: dealer banking 1, overview 1, settings 1, inventory 5, personal dashboard 7, personal profile 8 nodes. Fixable, not fixed.

## Logo audit
The primary logo is a full-colour image on a transparent/white background; it appears on dark surfaces (see screenshots). **A dark logo variant needs owner approval; none was created.**

## To finish (follow-up)
Migrate inline/CSS colours to the variables, fix the contrast nodes above, review each public page in dark, then set `data-dark-ready` (or delete the gate) and mount `ThemeSwitcher`.
