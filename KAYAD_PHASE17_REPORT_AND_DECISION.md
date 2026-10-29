# KAYAD KE — Phase 17 Report and Decision
Mobile-first landing page polish, responsive convergence and homepage regression certification (local).

## Decision
**A — MOBILE LANDING PAGE POLISH COMPLETE; LOCAL REGRESSION CERTIFIED**, with the scope limits below stated explicitly. "Certified" means: the Phase 16D build was refined, rebuilt and re-verified on a real local stack in emulated Android/tablet/desktop Chromium. It does not mean verified on a physical Android device or on the hosted site.

## Acceptance criteria
| Criterion | Status | Evidence |
|---|---|---|
| Mobile header aligned, compact, readable | Met | 69–72 px -> 59 px; descriptor 4 lines of 7px -> 2 lines of 8px; logo and Sell Vehicle kept (44 px); no function hidden |
| Hero balanced, legible | Met | balanced headline, comfortable copy, CTAs distinct (primary teal / secondary white), 44 px targets, no overflow at 360 |
| Brand label not clipped | Met | eyebrow wraps instead of ellipsis; header descriptor fully shown |
| Skyline coherent | Met (no change needed) | all 8 widths reviewed; no stretching, abrupt seam or conflicting overlay found; image untouched |
| Featured vehicles keep correct data, balanced | Met | card -> record binding verified for real records; equal-height cards, names/labels no longer truncated; failed-image placeholder |
| Bottom nav does not obscure content | Met | body padding `84px + safe-area` clears the footer at page end (4 widths); labels now ≥5:1 contrast |
| No horizontal overflow | Met | 0 at 360/375/390/412/430/768/1280/1440 |
| Inventory states reflect the real API | Met (local) | six states reproduced on the real stack, 3 via labelled mocks (network/403/504) |
| Routes and navigation work | Met | dock destinations, direct links and auth gate identical before/after; validators green |
| No serious/critical a11y regression | Met | axe: 3 rules (2 serious) -> 0 on the default home at 4 widths; no new rule |
| Build and tests pass | Met | tsc 0; build 0; vitest 1008 passed/1 skipped; 141/143 validators (2 credential-only as at baseline) |
| Before/after screenshots + ledger | Met | 8 widths × first/full, in the ZIP |
| Final ZIP passes integrity/checksum/manifest | See the delivery message (checked after packaging) |

## Findings
1. **"Inventory unavailable" root cause (local, confirmed):** the vehicle API client dropped the response body, so a global-maintenance 503 was indistinguishable from an outage and was described as "usually brief". Fixed by carrying the body fields and classifying five failure causes; see `KAYAD_PHASE17_INVENTORY_STATE_INVESTIGATION.md`. The header pill also ignored the app-level `loadError` and showed a stale count while loading — fixed.
2. **Genuinely empty vs filtered-empty** were one message; now distinct.
3. **Accessibility defects found and fixed:** `#94A3B8` muted text at 2.56:1 on the discovery controls, a 3.65:1 white-on-green badge, 3.87:1 dock labels, an `aria-label` on a plain div, and `h4` card titles directly under an `h2`.
4. **Duplicate inventory request (not changed):** the app shell requests `/api/cars?limit=50` and the marketplace requests its own paginated query on every load. Merging them is a data-flow change outside a visual phase; recorded for a later pass. No measured performance improvement is claimed — this phase made no performance changes and took no Lighthouse/LCP measurements.

## Known gaps / not verified
- **No physical Android device**, and the user's Android screenshot was not received; the layout was reproduced in emulated Chromium and matches the described defects. A real-device pass (Chrome UI bar, dynamic viewport, keyboard) is recommended.
- **Hosted site not inspected.** The hosted cause of "Inventory unavailable" is *consistent with* the legacy/global maintenance flag found in earlier phases but is unconfirmed. Hosted Operation A (`OP-A-FLAG-OFF-20261027`) and Operation B (`OP-B-DEPLOY-20261027`) were not approved and were not touched; this phase prepares nothing hosted.
- **Back/Forward:** the bottom nav and `setActiveNav` use `history.replaceState`, so Back exits the app rather than returning to the prior tab. Pre-existing and identical before/after; changing it alters app-wide routing and scroll restoration, so it was left for an explicit decision.
- **Backend jest not re-run** (no backend file changed); baseline stands from Phase 16D.
- **Performance/LCP/CLS not measured**; layout stability was only observed (reserved image stage heights unchanged).
- Remaining controls under 44 px: tablet header utilities (40 px) and the 360 px menu button (42 px wide). All exceed WCAG 2.5.8 AA (24 px).
- Lint: 34 pre-existing warnings in `VehicleMarketplace.tsx` (see test evidence).
- axe covers the default (anonymous, healthy, wide-open) home only, not error states or the filter drawer.

## Rollback
Application: restore the Phase 16D tree (`KAYAD-PHASE16D-…-20261027.zip`, sha256 `b30759c0…36b40`, unchanged) or revert these 8 files to it: `src/services/vehicleApi.ts`, `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`, `src/index.css`, `src/styles/kayad-navigation.css`, `scripts/validate-mobile-navigation-polish-20261012.mjs`, `src/__tests__/components/VehicleMarketplace.test.tsx`, and delete `src/features/VehicleMarketplace/utils/inventoryAvailability.ts` and `src/__tests__/features/InventoryFailureStates.test.ts`. No data, schema, env or hosted change was made, so there is nothing else to undo. Nothing was committed, pushed or deployed.
