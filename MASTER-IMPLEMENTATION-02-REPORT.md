# KAYARD KE — MASTER IMPLEMENTATION 02: Global Brand Migration & Premium Automotive Homepage

Scope: production implementation on top of MI-01 (all MI-01 work preserved). Nothing was committed, pushed, deployed or migrated; no production data was touched.

## 1. Branding inventory
- **Migrated (user-visible):** ~620 occurrences across 163 files — navbar/footer/hero/marketplace copy, auth & onboarding, dashboards, legal/FAQ/support, escrow/financing/inspection/auction copy, SEO fallbacks, error-boundary reference prefix (`KAYARD-`), service worker strings, brand SVG titles, backend transactional email/SMS/PDF/notification/chat role names, `BREVO_FROM_NAME` default, hero-presentation validation messages. Tests and validators that pinned old copy were updated.
- **Social/SEO:** `index.html` now has `og:image`, size/alt, `twitter:card=summary_large_image`, `twitter:image`; `public/opengraph.jpg` regenerated as a valid 1200×630 brand card (the previous file was a corrupted non-image and unreferenced); every SEO fallback image points at it.
- **Symbol:** approved geometric K-and-road mark is what renders (verified in screenshots: navbar, mobile header, footer default). Favicon `/branding/kayard-k-mark.png`; PWA 192/512/badge PNGs were already the K mark (PNG assets checked, not SVG-only). No car-logo revert; the flag is only a small inline badge.
- **Legal identity retained:** footer copyright default and the Terms/Privacy pages name **KAYARD MOTOR HUB** as the operating legal entity/data controller behind the KAYARD KE brand.

## 2. Legacy references retained intentionally
| Reference | Why |
|---|---|
| `BrandingContext.tsx` legacy logo/logoText/footer mapping | Admin-saved branding that still contains old values is mapped, never silently overwritten; uploaded assets are untouched. |
| `PageJourneyNavigation.tsx`, `VehicleMarketplace.tsx` `'KAYAD EA …'` comparison | Normaliser that rewrites a previously saved hero default to the new copy. |
| `mpesaService.js` AccountReference `KAYAD`, `bookingService.js` prefix `KAYAD` | External integration / already-issued reference formats. |
| `KAYAD_COLORS`, `KAYADLive`, `kayad_*` storage keys, `kayad-*` CSS classes/files, `kayad.space` domain/emails, env names | Identifiers/contracts, not user-visible brand. |
| DB columns, migrations, supabase, API paths | Not renamed (contracts). |

## 3. Branding files changed
163 source files (script-assisted, tsc-verified), plus `index.html`, `public/sw.js`, `public/opengraph.jpg`, `public/branding/*.svg` titles, `src/utils/seoService.ts`, `src/pages/LegalPage.tsx`.

## 4. Admin configuration changes (no new system)
- The existing hero slider (`/api/hero` copy/CTAs), `heroFeaturedMode`/`heroCarIds`, `heroCardContent[id].heroImage`, Super Admin featured campaigns and `heroPresentation` are reused unchanged; **no schema, API or duplicate system was added**.
- Active in the redesigned hero: copy & CTA labels/links, vehicle source/selection/order, admin-chosen gallery photo, rotation seconds (0 = off), arrows/dots, background image layer, button colours, vehicle info chip, illustrative fallback toggle.
- Layout controls that the single responsive layout no longer uses are now labelled **“legacy – inactive”** in the admin panel (kept only for saved-config compatibility).
- Default copy: eyebrow "KENYA'S VEHICLE MARKETPLACE", "Drive Your Dream Today", "Find, compare and buy verified vehicles from trusted sellers across Kenya.", "Explore Vehicles", "Sell Your Vehicle" (→ `dashboard:create-listing`). Previously saved legacy defaults are mapped to the new ones; custom admin text is shown as written.

## 5. Components redesigned
- New `src/components/home/PremiumHero.tsx` + `premium-hero.css` (presentation only; navy→teal layered gradient, restrained road arc, dark text column with controlled fade, vehicle stage on the right, separate mobile layout, no hard image rectangle — rectangular photos get a soft mask, transparent artwork stands free with a contact shadow).
- Navbar nav label "Auction" → **Auctions**; footer/legal wording.
- Category strip: fixed a pre-existing bug where the active chip rendered white-on-white; unified premium chip states in the brand palette (keyboard-focus visible).
- Vehicle cards show "Featured vehicle" status for featured listings.

## 6. Hero vehicle integration architecture
`VehicleMarketplace` still owns the data flow → `selectHeroVehicles` (campaign > real featured/admin-selected inventory > clearly-labelled illustrative artwork only when no real vehicle) → `PremiumHero` renders one vehicle per slide. Click opens the real listing (`handleVehicleSelect`); illustrative artwork is never priced or opened as a listing. Image is eager/high-priority with intrinsic width/height (no layout shift); failures degrade to a neutral silhouette (no broken icon); no record needed for the design to render; reduced-motion disables autoplay; pause control, prev/next, dots, live-region announcement.

## 7. Data eligibility
Unchanged and enforced where it already was: hero vehicles come from `getCars({featured:true})` / campaign lookups (the public cars API returns published inventory only) and admin `heroCarIds` are intersected with that set — an unpublished/removed/draft id can never appear because it is not in the fetched set. No private fields are read by the hero.

## 8. Test results (executed)
- TypeScript: clean. ESLint (changed files): 0 errors.
- Frontend vitest (full): **202 files passed, 1703 tests passed, 1 skipped, 0 failed**.
- Backend: full Jest run exhausted memory in this sandbox, so the 36 suites that exercise changed files were run in-band: **35 passed / 1 skipped, 544 tests passed**.
- Validators: 344 scripts; failures identical to the pre-existing baseline set (34 baseline). 20 validators that pinned old hero markup or old brand strings were retargeted to the same intent against the new component.
- Playwright `scripts/browser-journeys-mi02.mjs`: **42/42 checks** across 12 journeys (guest/authenticated home, navbar, search, category, featured navigation, admin select / change / disable, empty config, image failure, six viewport sizes, a11y pause/keyboard/reduced-motion). Network is stubbed at the boundary, so admin journeys prove the frontend behaviour for the supplied config, **not** backend persistence.
- New tests: `PremiumHero.test.tsx` (8), `branding/kayardMigration.test.ts` (5), updated hero tests in `VehicleMarketplace.test.tsx`.

## 9. Screenshots
`audit-screenshots/master-implementation-02/` — `hero-home-{1440x900,1280x800,1024x768,768x1024,390x844,360x800}.png`, guest/auth/no-vehicle/image-failure states, `journeys-results.txt`. The user-supplied reference image is the "before" (old wordmark with flag); no separate before-capture of the old build was made.

## 10. Remaining limitations
- The older admin-panel layout fields remain stored but inactive (by design, backward compatible).
- `docs/` is excluded from the ZIP per packaging rules.
- Other homepage sections (dealer showcase, financing, auctions promos) were audited and left as the existing consolidated journey: quick actions → categories → real filters → inventory → inspection/sell prompts; no duplicate promo cards were added.
- Visual parity with the reference is by composition (copy/CTA/trust row, navy→teal, vehicle right), not pixel-identical; stock vehicle artwork in tests is the repo's own hero assets.
- Installed-PWA rendering on a physical device was not exercised (no device); icon files were verified as PNG.
