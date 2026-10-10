# KAYAD CLI / Vercel / production deployment sweep — 2026-10-04
Base: KAYAD-main-HOMEPAGE-CONVERGED-20261003.zip (no .git in zip; git commands could not be run here).

## Baseline
Node 22.22.2, npm 10.9.7. engines.node ">=22.22.2". Vercel CLI pinned in deploy.yml: `npm install -g vercel@60.1.3` (installed and exercised locally: 60.1.3 supports every flag the workflow uses: link --project, pull --environment, build --prod, deploy --prebuilt --prod --project).

## Findings and fixes
| # | Category | Finding | Fix |
|---|---|---|---|
| 1 | H Render/backend (BOOT CRASH) | `backend/server.js` used `auctionSettlementRoutes` and `auctionFulfilmentRoutes` without importing them -> ReferenceError at import -> process exits -> Render health check fails -> old build keeps serving / 502 at the proxy. Reproduced locally: backend crashed on boot. Second incident of the same class as `authLimiter`. | Added both imports in server.js. Backend now boots: /health 200, /api/v1/auth/csrf 200 with X-KAYAD headers. |
| 2 | I runtime | `services/otpService.js` verify path used undefined `sb` -> every OTP verification would throw (onboarding). | use `getSupabase()` |
| 3 | I runtime | `services/reconciliationService.js` used `update` (not imported); `services/marketplaceHealthService.js` used `findOne`/`create` (not imported; called by the scheduler). | added to db/index.js imports |
| 4 | I runtime | `config/queue.js` DLQ warning referenced undefined `dlqName` (would throw inside the failed-job handler). | use `${queueName}:dlq` |
| 5 | G API rewrite | SPA fallback `/(.*)` also matched missing `/assets/*`; a stale hashed chunk returned index.html with 200 (reproduced in preview) -> "module script MIME text/html" blank page after deploys. API-before-SPA order was already correct. | vercel.json fallback is now `/((?!api/|assets/).*)` (filesystem files still served first; /api still proxied first). |
| 6 | regression | Nothing prevented undefined-identifier boot crashes from recurring. | `npm run validate:backend-boot` (ESLint no-undef on boot-critical files; verified it FAILS on the old bug) and a step in deploy.yml validate job. `validate:vercel-ci` now asserts API rewrite precedes SPA fallback and the fallback does not capture /api or /assets. |

## Marketplace 502, traced
Browser -> `GET /api/cars?...` (src/services/vehicleApi.ts) -> Vercel rewrite `/api/:path*` -> `https://api.kayad.space/api/cars` -> Render. A 502 is produced by the proxy when the Render service is down/unhealthy. Evidence this tree: with the pre-sweep server.js the backend cannot start at all. Locally, after the fix, the same chain (preview proxy -> backend) returns API JSON for /api/v1/auth/csrf (200) and a JSON 404 for unknown /api routes, while SPA routes return HTML; API failures are never converted to HTML. No mock data was added; error handling untouched.
NOT verified against production (sandbox cannot reach api.kayad.space / kayad.space).

## Environment contract
Frontend reads only: VITE_API_URL, VITE_SOCKET_URL, VITE_PUBLIC_URL, VITE_POSTHOG_API_KEY, VITE_POSTHOG_HOST (+ DEV/PROD). No service-role/secret values in VITE_ vars (VITE_POSTHOG_API_KEY and the Supabase publishable key are public by design). CI deploy needs repo secrets VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID (deploy.yml refuses to run without them). Backend/Render needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, REFRESH_TOKEN_SECRET, SESSION_SECRET (+ REDIS_URL, provider keys). Never printed.
Vercel project link in the zip's `.vercel/project.json`: projectName `kayad-space` (`.vercel/` is gitignored; do not commit).

## CLI / Windows
All 108 npm scripts are `node ...`/vite/vitest invocations; none use Unix-only shell syntax. Deploy steps run in GitHub Actions (bash on ubuntu), which is the canonical deploy path.

## Verification (local, Node 22.22.2)
clean `npm ci` root + backend OK; typecheck 0; build OK + dist check; frontend 47 files / 319 tests (1 skipped); backend `npm test` jest 27 suites/549, vitest 5/16, node:test 1; validators pass incl. homepage-convergence, premium-presentation-pass, vercel-ci, deployment-readiness, v14 release-candidate/runtime-preflight, phase6-release, backend-boot; root audit clean; backend prod audit clean; `vite preview` routing checks as above.
Pre-existing, environment/doc failures (unchanged): validate:communications:providers (needs provider credentials), validate:live-runtime (needs SUPABASE env), validate:wave3-convergence + validate:release (OpenAPI documents 1107/1112 routes), validate:c1-c5-convergence (reset/verification token hashing check).

## NOT done / not verified
- NO Vercel deployment performed and NO post-deploy verification: no VERCEL_TOKEN/credentials here and no network route to Vercel/Render. Vercel is NOT certified fixed.
- `git status` / `git diff --check` / commit identity: no .git in the zip; whitespace checked manually on changed files (no new trailing whitespace).
- Latent, not fixed (needs a design decision): `marketplaceHealthService.getHealthTrend/getActiveAlerts` call a removed Mongoose-style `MarketplaceHealth` model; ~12 other files reference removed Mongoose-era models (FeatureFlag, ListingQuality, NotificationAudit, Organization, JobFailure, DuplicateVehicleLog) or out-of-scope vars (chat/lowCode/smsBidding controllers, adminRoutes userIds, escrowAuditService aggregate, communicationGateway delivery). They fail at call time, not boot. List via: npx eslint with no-undef over backend/.
- `.vercel/output` and `.vercel/static-build` exist in the zip (build artifacts); keep ignored.

## Owner actions
1. Push; confirm Render deploy goes Live and `curl -i https://api.kayad.space/health` and `/api/cars?limit=1` return 200 (not 502). Check Render logs for the earlier ReferenceError.
2. Confirm GitHub secrets VERCEL_TOKEN/VERCEL_ORG_ID/VERCEL_PROJECT_ID; watch "Deploy to Production" go green; `npm run verify:production` runs in that job (checks release identity via EXPECTED_COMMIT).
3. Apply supabase migrations (registration needs kayad_register_identity_atomic).
Suggested commit: `chore: stabilize production deployment and homepage foundation`

---
## Applied onto KAYAD-main__23_.zip (your newer project with hero-placement work)
Applied unchanged (these files were identical to the previous base): backend/server.js, backend/config/queue.js,
backend/services/otpService.js, reconciliationService.js, marketplaceHealthService.js, vercel.json,
.github/workflows/deploy.yml, scripts/validate-vercel-ci-contract.mjs, scripts/validate-backend-boot.mjs.
Merged by hand: package.json (only added the `validate:backend-boot` script; your new
`validate:production-verifier-contract` script is kept).
Adjusted for your new validator: scripts/validate-production-verifier-contract.mjs pinned the SPA fallback to the exact
source `/(.*)`. It now asserts the same intent (fallback is second, after the API rewrite, serves app routes, and does NOT
capture /api/* or /assets/*) so it accepts the hardened pattern.
Nothing in your hero-placement code, App/Navbar/VehicleMarketplace or CSS was modified.

Results on this project: clean npm ci (root + backend); typecheck 0; build OK; frontend 48 files / 323 tests (1 skipped);
backend jest 27 suites/549 + vitest 5/16 + node:test 1; every validator the CI workflows call passes (backend-boot,
deployment-readiness, frontend-runtime-contracts, homepage-convergence, phase6-release, v14 release-candidate,
v14 runtime-preflight, vercel-ci); validate:local-runtime passes (boots the real backend incl. hero placement code);
npm audit clean (root; backend production deps).
Still failing, NOT gated by CI and not caused by these changes:
- validate:premium-presentation-pass: expects hero copy "KAYAD Select" and "Featured on KAYAD" in VehicleMarketplace.tsx;
  your component no longer contains them (file and validator are byte-identical to your upload). Update the validator or restore the copy, your call.
- validate:communications:providers (needs provider credentials), validate:live-runtime (needs SUPABASE env),
  validate:wave3-convergence + validate:release (OpenAPI documents 1107/1112 routes), validate:c1-c5-convergence (token hashing check).
- verify:production needs a deployed URL; not run (no network/credentials).

---
## Mobile hero per wireframe (added to this project)
Requested layout: brand/verified label -> headline -> Explore | How it works -> FULL vehicle image -> caption (make/model, "body style · transmission").
The mobile hero (`aria-label="KAYAD mobile hero"` in VehicleMarketplace.tsx) already had this order; the vehicle was a 132px strip at 66% width. Changes (mobile only, lg: and desktop untouched):
- Vehicle stage: height `clamp(168px, 50vw, 250px)`, image `object-contain` at 80% width, so the whole vehicle is visible and is the dominant block.
- Caption: make + model, then "<body style> · <transmission>" (auctions keep their live-bid line; falls back to the existing caption text when those fields are empty).
- Legibility: eyebrow chips 9px -> 10px, caption 8-9px -> 10-11px, supporting copy 12px -> 13px.
Same data (existing featured-vehicle state), same carousel arrows/dots, same CTAs. Not screenshot-verified (no browser in this environment): please check at 320 / 360 / 390 / 430px, especially that the arrow buttons do not cover the vehicle at 320px.

---
## Mobile hero vehicle carousel (final direction)
Scope: only the `lg:hidden` mobile block, the mobile index helpers and one CSS block. Desktop pair markup is untouched
(diff touches only the React import line, the mobile helpers, and the mobile block).
- Data: the carousel consumes `heroSourceVehicles`, the same canonical list desktop uses (showcase config by default:
  Land Cruiser 300 + Mercedes GLE; selected/featured vehicles when admin configures them). Mobile shows one at a time
  by index, so a 3-vehicle admin selection becomes Land Cruiser -> Mercedes -> Range Rover with no code change.
  No second carousel implementation or state was added: the existing mobile index (`heroMobileIndex`) is reused; only
  animation metadata (swipe start, last direction) lives in refs.
- Stage: one vehicle, full width, `object-contain`, height clamp(168px, 52vw, 260px).
- Controls: arrows + dots moved to their own row BELOW the vehicle (previously arrows floated over the stage and could
  cover headlights/bumper). Tap targets 44px (40px under 360px). Nothing overlays the vehicle at 320-430px.
- Swipe: deliberate horizontal swipe (>=40px and clearly more horizontal than vertical) changes vehicle; vertical scroll
  is unaffected (`touch-action: pan-y`). Wraps both directions.
- Transition: 320ms fade + 18px horizontal slide, direction-aware. `prefers-reduced-motion: reduce` -> no animation (immediate swap).
- Caption: restored the canonical admin tagline. My earlier wireframe edit had replaced it with "<body style> · <transmission>"
  ("SUV · Automatic"), which dropped "Premium SUV · 4WD · Automatic". Now `heroCaption()` is used: admin tagline for
  showcase vehicles ("Premium SUV · 4WD · Automatic" / "Luxury SUV · Automatic"), existing real auction meta
  (status/reserve/current bid/ending) for auctions. No values are fabricated.
- Tests (4 new, marketplace file now 24): single vehicle + exact captions, arrow wrap both ways, dots in sync/jump,
  swipe vs vertical scroll, arrows not inside the stage and image is object-contain.

### Asset alpha-bounds check (done before relying on object-contain)
| asset | size | alpha bbox | opaque px on edges (top/bottom/left/right) |
|---|---|---|---|
| kayad-land-cruiser-clean.png (canonical) | 390x226 | full frame | 6 / 83 / 0 / 2 |
| kayad-mercedes-gle-clean.png (canonical) | 358x195 | full frame | 9 / 2 / 3 / 3 |
| kayad-land-cruiser-cutout.png (unused) | 1021x634 | inset 8px | 0 / 0 / 0 / 0 |
| kayad-mercedes-gle-cutout.png (unused) | 1028x610 | inset 8px | 0 / 0 / 0 / 0 |
`object-contain` shows each canonical image completely (CSS crops nothing). However the canonical Land Cruiser PNG itself touches
the bottom edge (83 opaque px, the tyre/shadow region was cut in the source), has a faint pink edge fringe, and is only 390px wide
(soft on 3x phones). The unused `-cutout.png` files are higher resolution, fully inset and clean (746-804 KB PNG each; convert to WebP
before using on mobile). Swapping the canonical image changes desktop too, so it was NOT done here: it is an admin/config decision
(`showcaseVehicles[].image`) or a separate desktop-approved change.

### Not done / not verified
- No browser here, so nothing was seen on screen: please check 320/360/375/390/412/430px (stage height, controls row, caption
  truncation), swipe on a real phone, and reduced motion.
- Mobile has no autoplay (it never did; desktop autoplay is a no-op with only two vehicles). Admin "rotation timing"
  has no existing config field, so none was added.
- Auction display on mobile relies on the existing `heroAuctionMeta()` data; not exercised with a live auction here.

---
## FINAL mobile hero carousel asset hardening pass (visual foundation frozen)
Architecture unchanged: canonical hero vehicle list -> heroMobileIndex -> one active vehicle -> swipe/arrows/dots -> caption.
Desktop hero untouched (verified by diff: no change touches heroLeftVehicle / heroRightVehicle / heroPairIndex / changeHeroPair; the
desktop `image` fields and `-clean.png` files are byte-identical to the previous zip; no composition, size, position, card or height change).

### What changed
- Canonical type extended, no second schema: `HeroShowcaseVehicle.mobileImage?` (types/heroPresentation.ts). `Vehicle.heroMobileImage?` is the optional carrier on the
  already-mapped hero vehicle. Default showcase config: `image` = approved desktop PNG (unchanged), `mobileImage` = new WebP. Admin panel gets one optional
  "Mobile image URL" field next to the existing Image URL.
- Same two records power desktop, mobile and admin. Stored admin configs saved before this field existed still get the canonical mobile WebP, but only while
  their desktop `image` is still the canonical one (a custom vehicle is never paired with the wrong photo; covered by a test).
- Assets (public/hero): `kayad-land-cruiser-mobile.webp` 1021x634, 163 KB; `kayad-mercedes-gle-mobile.webp` 1028x610, 173 KB (target 150-300 KB).
  Converted from the high-res cutouts at WebP q94-95, alpha lossless (alpha error 0.00), mean RGB error 1.1-1.3/255 (not visible), alpha bounds inset 8-9px
  from every edge (the old clean PNG touched the bottom edge), no halo on deep teal or light backgrounds (checked at 50% over both).
- Mobile-only delivery: `<picture>` with `<source media="(max-width: 1023.98px)" srcset=mobile.webp>` and the approved desktop PNG as the `<img>` fallback.
  Phones/tablets download the WebP; desktop never does (the hidden mobile block falls back to the desktop image it already has). Preloading is
  viewport-aware (phones warm only mobile assets, larger screens only desktop assets). `width/height` set to prevent layout shift.
- Unchanged and verified: object-contain stage; arrows BELOW the vehicle; 44px targets (40px under 360px); swipe; dots; wrap-around; vertical scroll
  (`touch-action: pan-y`); 320ms fade + 18px directional slide; reduced motion = no animation; no autoplay; captions
  ("Premium SUV · 4WD · Automatic", "Luxury SUV · Automatic", real auction metadata for auctions).
- Guard: `npm run validate:hero-mobile-assets` (also a step in deploy.yml): mobileImage declared, files exist, valid WebP with alpha, 100-320 KB, desktop
  image still the clean PNG, mobile-only <source>, 320ms transition, reduced-motion rule, no autoplay.
- Tests: marketplace file now 26 (added: picture/source selection per vehicle + fallback + intrinsic size; custom-vehicle guard).

### Containment geometry (COMPUTED from the CSS rules; not a visual test)
Stage height = clamp(168px, 52vw, 260px); image is object-contain, so it is always height-limited and never exceeds the stage width.
| viewport | stage WxH (16px page pad) | Land Cruiser shown | Mercedes GLE shown |
|---|---|---|---|
| 320 | 288x168 | 271x168 | 283x168 |
| 360 | 328x187 | 301x187 | 315x187 |
| 375 | 343x195 | 314x195 | 329x195 |
| 390 | 358x203 | 327x203 | 342x203 |
| 412 | 380x214 | 345x214 | 361x214 |
| 430 | 398x224 | 360x224 | 377x224 |
Also fits with 24px page padding (checked). At 430px @3x the largest asset is displayed at ~1.1x upscale: acceptable.

### Release hygiene
`.vercel` is absent from this project and listed in .gitignore (`.vercel/`); no stale `.vercel/output` is shipped. Do not deploy from a local `.vercel/output`;
the CI deploy builds fresh. NO Vercel deployment was performed or verified: Vercel is NOT certified.

### NOT VISUALLY VERIFIED
No browser or device was available. Automated tests (jsdom) cover logic: arrow, dot, swipe left/right, vertical scroll ignored, wrap-around, one vehicle rendered,
source/fallback selection. They do NOT prove rendering. The required matrix is still to be run by a person on a real browser/device:
widths 320, 360, 375, 390, 412, 430, each with reduced motion OFF and ON; tap arrow, tap dot, swipe left, swipe right, vertical scroll.
Check in particular: complete car visible (no crop, wheels/bumper/roof), no horizontal page overflow, controls row never touching the card, caption truncation,
and that the 1021px WebP looks sharp on a real phone.

---
## Hero fully admin-controlled (audit + fixes)
Method: every field of the canonical hero config types was checked against the admin panel, the backend save allowlist, and the public hero JSX.
Backend needed no change: `/admin config` already persists `heroPresentation`, `heroCardContent`, `heroFeaturedMode`, `heroCarIds` (object-merge, so new keys persist).

### Gaps found and fixed
| # | Gap | Fix |
|---|---|---|
| 1 | MOBILE hero eyebrow, headline and supporting copy were hardcoded: admin hero-slide edits never reached mobile | Desktop and mobile now render the same constants (`heroEyebrowDisplay`, `heroHeadlineNode`, `heroSupportCopy`) |
| 2 | Desktop headline: any admin headline containing "Dream Today" was rewritten to "Drive Your Dream Today" | Only the exact canonical default gets the designed line break; admin text renders exactly as written (tested with "Find Your Dream Today") |
| 3 | CTA button labels ignored the admin hero slide's `ctaPrimaryText`/`ctaSecondaryText` ("How It Works" was always hardcoded) | Label order: vehicle card content (existing) -> admin slide text -> default; desktop + mobile |
| 4 | Four config fields had NO admin control: `primaryButtonColor`, `secondaryButtonBorderColor`, `cardTextColor`, `secondaryOverlayColor` | Color pickers added to the Hero Marketing System panel |
| 5 | Hero rotation timers were literal 6500 ms (hero slides + desktop vehicle pair) | New admin field `rotationSeconds` (default 6.5 = unchanged; 0 = off; 3-60) |
| 6 | Mobile stage height `clamp(168px,52vw,260px)` and 320 ms transition were hardcoded | New admin fields `mobileStageMinPx` (120-320, default 168), `mobileStageMaxPx` (168-420, default 260), `mobileTransitionMs` (0-1000, default 320) |
| 7 | No guarantee a stored/edited value cannot break layout; `Number(x) \|\| default` pattern cannot store 0 | One shared `normalizeHeroExtras` used by BOTH the public page and the admin save path: clamps, keeps max>=min, preserves explicit 0 |
Defaults equal the approved visual foundation, so with no admin changes the hero renders as before (desktop layout classes untouched; only text sources, timers and the mobile stage dimensions are now config-driven).
Reduced motion still always forces an instant swap (CSS), regardless of the admin transition value.

### Already admin-controlled (verified, unchanged)
Vehicle source (showcase / featured / selected) and selection; showcase vehicle make/model/year/image/mobileImage/eyebrow/tagline/enabled; per-vehicle card
content; hero slide eyebrow/headline/subheadline/CTAs/links/background/overlay/layout/visibility/order; floating cards (all fields); background URL + position/scale;
overlays; card width/scale/offset/opacity/blur/border; vehicle scale/top/width/nudges/offsets; info cards, labels, arrows, dots toggles; ticker (text, colors, height, speed);
section visibility (`searchTrustCard`).

### Guard
`npm run validate:hero-admin-control` (also a deploy.yml step): every field of HeroPresentationConfig / HeroShowcaseVehicle / HeroFloatingCard must be referenced by an admin control;
backend allowlist keys present; shared normalizer on both paths; the public hero has no hardcoded headline/eyebrow/copy/CTA labels, no `includes('Dream Today')` hack, no 6500 ms,
no hardcoded mobile stage height; colors read from config. Adding a new hero config field without an admin control now fails CI.
Tests: marketplace file 30 (new: admin slide copy + exact headline + CTA labels on mobile, canonical fallback, stage height/transition/explicit 0, clamping of unsafe stored values);
`heroExtras.test.ts` (normalizer: defaults, explicit 0, clamps, junk).

### Deliberately NOT admin-controlled (behavioural constants / accessibility)
Swipe threshold (40px) and slide distance (18px); the 52vw factor of the stage; carousel ARIA labels ("Previous featured vehicle" etc.); the canonical default copy used only when
the admin has set nothing. Mobile carousel remains manual (no autoplay, per the frozen-foundation instruction), so `rotationSeconds` applies to hero text slides and the
desktop vehicle pair only (the admin label says so).

### Caveats
- Legacy-default rewrites kept for compatibility: an admin eyebrow equal to the old seed "KAYAD EA · PREMIUM AUTOMOTIVE MARKETPLACE" displays as "KAYAD MARKETPLACE · VERIFIED VEHICLES", and a subheadline equal to the old seed text displays the newer default. Typing those exact legacy strings cannot override that. Remove the rewrite if you prefer pure pass-through.
- The metrics strip above the hero ("Marketplace at a glance") is a marketplace header, not hero config, and has no admin toggle.
- NOT VISUALLY VERIFIED (no browser/device); admin panel UI was type-checked and built but not clicked through. Not deployed; Vercel not certified.
