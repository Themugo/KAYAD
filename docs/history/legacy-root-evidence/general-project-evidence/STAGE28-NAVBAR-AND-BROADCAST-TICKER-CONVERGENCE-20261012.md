# KAYAD Stage 28 — Navbar Brand Reservation & Admin Broadcast Ticker

## Scope
- Built on Stage 27; no parallel branding or advertisement system introduced.
- Preserved the shared `BrandingContext` and existing `TopNoticeStrip` + `AdManager` (`top_ticker`) architecture.

## Changes
- Navbar now reserves a dedicated tagline/descriptor field beside the uploaded master logo instead of suppressing the descriptor whenever image branding is enabled.
- Adjusted logo display width and responsive descriptor treatment to prevent the identity from consuming the navigation field.
- Footer now uses the same admin-managed master logo URL/type as the navbar instead of a hard-coded car icon and text mark.
- Existing hero presentation settings now expose ticker direction (left/right) and transition (continuous scroll, fade, fade+pop, slide), alongside existing enabled, message, background/text color, height and speed controls.
- Top notice strip consumes those settings, retaining existing admin ad slots and their per-message styling. Reduced-motion preference and real-browser verification remain part of final QA.

## Validation status
- Source-level review completed for changed files.
- Full typecheck/build/browser verification is not claimed because dependencies are not installed in this extracted workspace.
- Before deployment: install dependencies with the repository's supported Node version, run typecheck/build/tests, then visually verify desktop/mobile navbar fit and all ticker modes with reduced motion enabled and disabled.
