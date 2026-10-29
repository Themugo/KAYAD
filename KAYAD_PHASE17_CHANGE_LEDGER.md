# KAYAD KE — Phase 17 Change Ledger (mobile-first landing page polish)

Foundation: `KAYAD-PHASE16D-HOSTED-RECOVERY-PREP-ADMIN-CONVERGENCE-20261027.zip`, sha256 `b30759c07db90faa6132bc2d184c373396754332c351786954d09f4188d36b40` (verified, integrity OK, manifest 0 mismatches, unchanged after this phase).
Scope: presentation + public-inventory failure honesty only. No backend, payment, M-Pesa, auction, owner-auth/MFA, dealer-RBAC or financial files were touched. No migrations, env, hosted or Git operations.

## Source files changed (8)

| # | File | Change | Workstream |
|---|------|--------|-----------|
| 1 | `src/services/vehicleApi.ts` | `VehicleApiError` now also carries `code`, `maintenance`, `scope` read from the response body (previously discarded). Constructor stays backward compatible (4th arg optional). | F |
| 2 | `src/features/VehicleMarketplace/utils/inventoryAvailability.ts` (new) | Pure `classifyInventoryFailure()` -> `maintenance / restricted / timeout / network / unavailable` with pill text, panel title/body, HTTP status. Names a cause only when the response carries it. | F |
| 3 | `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx` | (a) status strip: single-line label, non-wrapping pill, pill is a retry button on failure, "Loading inventory" while loading, tightened top padding; (b) both status badges and the error panel use the classified failure (also honours the app-level `loadError`, which the header pill ignored before); (c) genuine-empty state "No vehicles are listed right now" vs filtered "No vehicles match your filters"; (d) mobile eyebrow wraps instead of ellipsis (smaller tracking <430px); (e) `text-balance` headline; (f) showcase pair: equal-height cards, labels/names wrap (2-line clamp) instead of truncating; (g) failed featured image -> neutral placeholder + accessible label; (h) hero CTAs `min-h-[44px]`; (i) a11y: low-contrast `#94A3B8` text -> `#64748B` (28 text usages; icons untouched), `bg-emerald-600` badge -> `-700`, "Reach interested buyers" copy -> `#58717B`, `role="group"` on the "Inventory view" div, card/empty-state `h4` -> `h3` (heading order under the `h2`). | A,B,D,F,G,H |
| 4 | `src/index.css` | Phone header: bar `min-height` 68->58; brand now flexes into the free space (was fixed 42%) so the descriptor is 2 readable 8px lines (was 4 lines at 7px); logo `clamp(64px,19vw,92px)`/max 44px; `.kayad-cta` 44px min height; bottom-nav label colour `#71858A`->`#58717B` (3.87:1 -> >5:1). | A,E,H |
| 5 | `src/styles/kayad-navigation.css` | <=380px: Sell Vehicle min-height 38->44px; hamburger 38x40 -> 42x44. | A |
| 6 | `scripts/validate-mobile-navigation-polish-20261012.mjs` | Two pinned strings updated to the new intended values (logo clamp, CTA 44px). Validator otherwise unchanged (36/36). | I |
| 7 | `src/__tests__/components/VehicleMarketplace.test.tsx` | Empty-state test updated to the truthful genuine-empty copy; +3 tests (maintenance + pill retry, genuine empty, failed featured image). | I |
| 8 | `src/__tests__/features/InventoryFailureStates.test.ts` (new) | 9 unit cases for the classifier. | I |

## Tooling / evidence added (not shipped application code)
`runbooks/phase17-mobile-landing-20261027/` — browser scripts (`ui/browser_*.cjs`), a static SPA test server, `ui/LOCAL_TEST_FIXTURES_ONLY_seed_vehicles.sql` (three vehicles titled `[LOCAL TEST] …`, for the disposable local DB only), and `evidence/` (screenshots + JSON metrics). Plus the `KAYAD_PHASE17_*` documents at the repo root.

## Deliberately NOT changed (audited, no confirmed defect)
- Skyline/background image, overlays and gradients (coherent at all 8 widths; the apparent "empty area" only occurs when a featured image is missing, now handled by the placeholder).
- Hero copy, CTA labels and destinations, nav destinations/routes, desktop hero composition (1280/1440 pixel diff 0.14–0.23%, vehicle-image transition noise only).
- Bottom navigation component and clearance (body padding `84px + safe-area` already clears the footer; verified).
- Featured-vehicle data binding (verified correct, see test evidence).
- Ticker/marquee (clipped by its own container; page `scrollWidth == clientWidth`).
- Browser history behaviour of the bottom nav (pre-existing `replaceState`; see known gaps).
