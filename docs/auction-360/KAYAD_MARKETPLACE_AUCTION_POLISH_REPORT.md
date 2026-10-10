# Marketplace + Auction polish and regression report (Gate 4, 2026-10-09)

Foundation: the integrated tree (identity/onboarding + support). **Scope control: no layout, hero, feature, inventory or authority change.**

## Surfaces audited (real rendering, desktop 1440 and mobile 390, mocked data)
Ticker · navbar and mega-menus · marketplace hero (typography/dimensions) · hero filter toolbar · inventory header controls (show/sort/columns/grid-list) · vehicle cards · auction journey rail · auction hero + tabs + search · spotlight and grid cards · badges · empty/loading/error states · mobile dock. Screenshots were reviewed before and after; hero composition, dimensions and vehicle positioning are identical (no hero file, hero CSS or hero asset was edited).

## Findings and changes (only where needed)
| # | Finding | Change | File |
|---|---|---|---|
| 1 | Auction "LIVE NOW" badges used the global alert rose (`bg-rose-600`), the only off-palette colour on the auction floor; deep-teal/navy + restrained-teal system elsewhere | Scoped override to the existing auction teal token (`--ap-teal #0f766e`, white text, contrast ≈5.5:1); pulse unchanged, disabled under `prefers-reduced-motion`. The global `Badge` variant is untouched, so other surfaces keep their meaning | `src/styles/auction-premium.css` |
| 2 | Misleading copy/state: a failed load showed "The auction floor is quiet right now", "Nothing live this moment" and `0` counts | Failed lists show "—", honest headline/sub-copy, no empty-state card; banner states which section failed | `src/features/AuctionsView.tsx` |
| 3 | Marketplace hero toolbar: the **"MAKE" caption stayed visible when its select was hidden** by the desktop sidebar, leaving an orphaned label | Label follows the select (`lg:invisible`, the grid cell is preserved so the toolbar layout does not move) | `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx` |
| 4 | Auction detail/lists exposed soft-deleted vehicles (see root-cause report §5) | `$exists:false` guard | `backend/controllers/auctionController.js`, `backend/models/_base.js` |

Checked and left unchanged (consistent with the system): ticker, navbar, hero typography, filter fields, card typography/borders, journey rail, tab segments, focus ring (global `*:focus-visible` in `accessibility.css` covers auction controls), pagination/empty states of the marketplace. The mint "active segment" fill is the established accent family and was kept.

Inherited, not touched: `validate-home-hero-premium` already fails on the unmodified foundation ("clean showcase assets are configured") — hero asset configuration is outside this scope and is recorded as a blocker for the hero owner, not "fixed" here.

## Regression results (final tree)
See `KAYAD_SUPPORT_TEST_MATRIX.md` (combined matrix, updated with the Gate 4 counts). Support and identity routes were re-checked after the shared-file changes (`ui/index.tsx` was not touched in Gate 4; `models/_base.js` additive only): support journey 56/56, identity suites inside the full frontend/backend runs.

## Verdict: **PASS (source + local browser)**; live-backend and deployed-environment visual/runtime certification **not run**.
