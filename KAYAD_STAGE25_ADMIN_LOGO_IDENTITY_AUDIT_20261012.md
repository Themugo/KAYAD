# KAYAD Stage 25 — Admin-Managed Logo Identity Audit

## Foundation
- Based on `KAYAD-STAGE24-THEME-CONVERGENCE-20261012.zip`.
- Scope limited to the canonical admin branding configuration, Navbar identity, Footer identity, and upload preview/validation.
- No second branding system or new backend route was introduced.

## Changes
1. Navbar already consumed `BrandingContext`; its uploaded logo remains constrained to a 180px-wide, 40px-high area with `object-contain` and non-cropping alignment.
2. Footer now consumes the same `BrandingContext` and displays the configured uploaded logo in both centered and column footer layouts. The image uses `object-fit: contain`, preserving aspect ratio and preventing crop. Existing icon/text identity remains the fallback when image mode is not configured.
3. Admin upload preview now uses a wide preview surface and `object-fit: contain` instead of a square `object-fit: cover` crop. It states the navbar/footer fit guidance and supports PNG, JPEG, WebP and SVG client-side selection with a 5 MB client-side limit.
4. The upload success path sets both `logoType: 'image'` and the returned `logoUrl` in local admin state. The existing save-branding flow remains the way to persist the overall branding configuration.
5. Existing server endpoint still requires `protect` and `adminOnly`, uploads through the current image service, and persists `branding.logoType` and `branding.logoUrl` to the existing platform config.
6. Added `validate:admin-logo-identity` script and 12 source-contract checks.

## Validation
- `node scripts/validate-stage25-admin-logo-identity-20261012.mjs`: 12/12 PASS.
- No production upload was performed; no logo asset was fabricated or hard-coded.
- Full Vite build, semantic TypeScript check, and browser visual test were not run in this workspace. The local Node version is 22.16.0; the project foundation specifies Node 22.22.2 or newer, and this workspace has no installed `node_modules`.

## Acceptance follow-up
After extracting this ZIP in the configured project environment, run `npm run validate:admin-logo-identity`, the regular typecheck/build/tests, then upload a real horizontal transparent logo from Admin → Settings → Branding. Verify at desktop and phone widths that the Navbar and both Footer layouts show the same logo, preserve aspect ratio, and fall back safely when logo mode is icon/text.
