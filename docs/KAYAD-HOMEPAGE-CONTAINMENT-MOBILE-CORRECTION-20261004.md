# KAYAD Homepage — Hero Containment + Mobile Correction

## Scope
Controlled correction on the existing homepage foundation. No new marketplace, CMS, navigation, payment, auction, or inventory architecture was introduced.

## Corrections
- Showcase vehicle assets now use transparent/cleaned presentation assets rather than the older composite promotional PNGs.
- Desktop vehicle information cards are constrained inside their vehicle stage and cannot leak outside the hero viewport.
- Vehicle image transforms remain independent from vehicle information cards.
- The center hero card remains the existing canonical card and remains admin-configurable.
- Mobile no longer hides the center hero message and leaves only the skyline; it uses a dedicated responsive hero composition with the same canonical copy, CTA behavior, vehicle pair, arrows and dots.
- The existing broadcast ticker remains the canonical `TopNoticeStrip`; it is compacted to a maximum 30px presentation height on phones while retaining admin-controlled content and desktop height.
- Showcase vehicle defaults and fallback config use the cleaned vehicle asset paths.

## Admin contract preserved
The existing `platform_config.hero_presentation` contract remains the source of truth for hero presentation. Existing controls for vehicle source, vehicle selection, scale, horizontal positioning, card scale/width, background positioning, ticker and floating cards remain intact.

## Validation
- `validate-home-hero-premium.mjs`: 12/12 PASS.
- TypeScript transpile/parser checks: PASS for modified TS/TSX files.
- Backend hero route syntax check: PASS.
- `.vercel` directory/build artifacts are not present in the foundation.
- Full production build was not claimed in this environment because the repository requires Node >=22.22.2 and this environment is Node 22.16.0. Windows Node 22.22.2 remains authoritative.
