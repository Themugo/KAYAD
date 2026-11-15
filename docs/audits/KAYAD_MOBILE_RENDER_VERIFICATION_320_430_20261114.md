# KAYAD Mobile Rendering Verification — 320–430px — 14 November 2026

## Scope
Requested verification of the latest homepage compact-polish archive at 320px, 360px, 390px, 414px and 430px widths, with attention to the hero, search, inventory, and fixed mobile bottom navigation.

## Source archive integrity
- Input archive: `KAYAD-HOMEPAGE-COMPACT-POLISH-2026-11-14.zip`
- ZIP test: PASS
- Entries: 3,459

## Checks executed
- `node scripts/validate-homepage-responsive-polish-20261114.mjs` — PASS, 9/9.
- `node scripts/validate-navigation-convergence.mjs` — PASS, 43/43.
- `node scripts/validate-page-journey-navigation.mjs` — PASS, 8/8.

These are source-contract validators, not browser rendering tests.

## Source-level responsive findings
- Dedicated `max-width:379px` rules exist for the brand header, hero pair image stage and inventory toolbar; the hero pair is reduced to an 88px image stage in the later small-phone override.
- The mobile hero vehicle images use `object-fit: contain`, and mobile support copy is explicitly kept visible.
- Search bridge input and button are set to 39px high in the compact mobile override.
- Inventory toolbar controls use a responsive grid; at `max-width:379px` they collapse to a single column.
- Inventory timeout message typography and retry button have compact mobile rules; retry target remains at least 44px high.
- Bottom navigation is fixed with left/right safe-area insets, bottom safe-area placement, 5 equal columns and 76px minimum height.
- The mobile dock is hidden when the drawer opens.
- The component adds body bottom padding (`84px + safe-area-inset-bottom`) and homepage adds `5.5rem + safe-area-inset-bottom` padding. These are intentional overlap safeguards in source but may reserve more scroll space than needed; only runtime measurement can determine whether this creates unnecessary blank space.

## Actual browser/device verification — BLOCKED
Could not produce actual viewport screenshots or measure bounding boxes for 320, 360, 390, 414 and 430 CSS-pixel widths:
- Project declares Node `>=22.22.2`; available Node is `22.16.0`.
- Project dependencies are absent.
- `npm ci` could not complete in this environment; the prior attempt was interrupted after waiting on dependency retrieval. The earlier recorded npm registry DNS failure remains the known network limitation.
- Without Vite and the project dependencies, the supplied source archive cannot be served as the actual React application. A system Chromium binary alone does not render the project.
- No Playwright run, screenshot capture, horizontal-overflow measurement, or fixed-dock overlap measurement is claimed.

## Required browser verification matrix
Run on the actual built application after dependency installation:
- Widths: 320, 360, 390, 414, 430 CSS px.
- Viewports: representative short and tall phone heights, with mobile browser chrome/safe areas.
- Pages/states: initial Home, hero loaded, inventory loaded, inventory timeout/retry, search/filter expanded, bottom dock visible, drawer open.
- Measure: `document.documentElement.scrollWidth <= window.innerWidth`; hero, search and inventory bounds; dock top edge versus last interactive content; safe-area spacing; no controls obscured by dock; no unintended horizontal scrolling.
- Capture screenshots at each width and inspect text wrapping, car image containment, CTA widths, toolbar layout and retry action.
- Repeat at least on Android Chrome and one WebKit/Safari mobile browser if available.

## Status
**SOURCE RESPONSIVE CONTRACTS PASS; ACTUAL MOBILE RENDERING NOT YET VERIFIED.**
No source changes were made during this verification-only pass. No deployment, database operation, payment action, commit or push was performed.
