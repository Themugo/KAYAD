# KAYAD Public Auction Page — Business, API, UX and Hardening Audit

**Date:** 29 October 2026  
**Mode:** Read-only audit; no product source code changed  
**Target surface:** Public Auction discovery page shown in the supplied mobile screenshot  
**Canonical frontend:** `src/features/AuctionsView.tsx`  
**Route selection:** `src/App.tsx` maps `activeNav === 'auctions'` and legacy `activeNav === 'discovery'` to `AuctionsView`; `/auction/:id` opens `src/pages/AuctionLivePage.jsx` for one specific auction room. `/auction` and `/auctions` redirect to `/?nav=discovery`.

## Executive verdict

**Source architecture is well documented and several auction-specific source validators pass, but the public Auction page is not operationally certified.** The supplied screenshot shows the three auction lists reported as unavailable. The source copy has distinct error states and intentionally avoids inventing empty auction lists. A read-only request to the production API could not be completed from this environment because DNS resolution for `api.kayad.space` failed; this is a connectivity limitation of this audit environment, not proof that production DNS is down for end users.

The screenshot's exact copy — “We could not retrieve the auction lists. This does not mean there are no auctions” — corresponds to `AuctionsView.tsx`'s branch where live, scheduled, and completed requests are all marked rejected. In this source version, a missing/unreadable `auction_setups` relation by itself would normally break only the scheduled (`status=draft`) request, not all three requests. Therefore, do **not** assume the historic `auction_setups` migration issue is the current root cause. The actual deployed request statuses, request IDs, and backend logs must be correlated before deciding on a repair.

## Authoritative foundation and safety

- Foundation: `KAYAD-SHOWROOM-KENYA-ONLY-PREMIUM-REFINEMENT-20261029.zip`
- Expected foundation SHA-256 from its checksum: `abf6ca462f1551f2e46dbbbeb3582607af5a7ddf483e4efa5d802ebb833596ee`
- ZIP integrity: PASS before extraction
- Working copy: separate extraction under `/mnt/data/kayad_auction_readonly_audit/KAYAD`
- `node_modules`: absent
- Node runtime: `v22.16.0`; root package engine requires `>=22.22.2`
- No production mutations, schema changes, migrations, commits, pushes, or deployments were performed.
- This audit checkpoint adds reports only; application source was not modified.

## Canonical surface and responsibility map

| Surface | Canonical source | Business responsibility |
|---|---|---|
| Public vehicle marketplace / showroom | `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx` | Catalogue-wide vehicle discovery, search and filters |
| Public auction discovery | `src/features/AuctionsView.tsx` | Lists live, scheduled, completed and saved auctions; sends the user to the correct auction room |
| Single auction room | `src/pages/AuctionLivePage.jsx` | Single-auction details, bid eligibility, real-time activity and bid submission |
| Dealer auction setup | `src/pages/dealer/DealerAuctionSetupWizard.jsx` and setup services | Configure, validate and publish an auction |
| Dealer auction operations | `src/pages/dealer/DealerAuctionOperations.jsx` | Operate and manage the dealer's auction lifecycle |
| Admin auction control | `src/pages/admin/AdminAuctions.jsx` | Authorized operational actions: start, end, extend and set winner |
| Bid management | `src/pages/admin/AdminBids.jsx` | Authorized bid review and winner action |
| Escrow operations | `src/pages/admin/AdminEscrows.jsx` and escrow services | Escrow custody, reconciliation and permitted settlement operations |
| Post-win payment/fulfilment | payment, outcome and fulfilment surfaces/services | Winner payment and post-auction completion |

The older `src/pages/AuctionDiscoveryNetwork.tsx` remains in the source tree for compatibility but is not the canonical active public discovery page. It must not be edited as a substitute for `AuctionsView.tsx`.

## Public data flow traced

1. `src/App.tsx` renders `AuctionsView` for the public auction navigation surface.
2. `AuctionsView` calls `src/services/auctionService.ts::fetchList`.
3. The canonical service uses `src/api/httpRequest.ts`, which delegates to the shared Axios transport and normalizes an optional `/api` prefix.
4. `backend/server.js` mounts `auctionRoutes` at `/api/auctions`.
5. `backend/routes/auctionRoutes.js` maps `GET /` to `auctionController.listAuctions`; `/active`, `/my`, `/:id/bids`, and `/:id` are separate routes.
6. `backend/controllers/auctionController.js` derives public auction records from the canonical `cars` lifecycle record; the project intentionally does not use a separate authoritative `auctions` table.
7. Live and completed lists read the `cars` lifecycle; the scheduled list reads published rows from `auction_setups`, then joins the matching car rows and applies the private-seller eligibility gate.
8. `gateOpenAuctions` fails closed if the eligibility gate cannot be evaluated. The controller returns a sanitized service error rather than showing unverified auctions.
9. Cards navigate to `/auction/:carId`; the live room and bid/payment flows are separate surfaces.

## Business truth and authorization boundaries

- Raw lifecycle on the car record is `auctionStatus` (`live`, `draft`, `ended`, etc.); capability flags such as `allowBid` are not a substitute for lifecycle.
- Public response status is derived server-side as `active`, `draft`, or `ended`. The discovery UI uses the server-derived `status === 'active'` to decide whether an auction is live.
- Current bid must represent confirmed/paid bid activity; pending bids are not authoritative market movement.
- Public bid history must not expose bidder PII; current source validators check sanitized bid responses.
- The exact reserve price and highest-bidder identity are not meant to be exposed by public discovery.
- Bidder registration, commitment/payment requirements, winner payment and escrow authority remain server-side. The public page's visibility controls are UX only.
- Published auction setup is treated as the scheduled-auction authority before the car lifecycle row is mirrored; the migration `20261002190000_auction_setup_publication_contract.sql` is present in the source package.
- Kenya-only showroom changes are present in the foundation, but the auction business lifecycle is not modified by this audit.

## Screenshot findings — visual and interaction quality

| Priority | Finding | Evidence / impact | Recommendation for next refinement |
|---|---|---|---|
| P1 | All auction lists appear unavailable | Screenshot copy matches the all-three-failed branch in `AuctionsView`. Users cannot distinguish a platform/API outage from auction availability without working requests. | First establish per-endpoint HTTP status and backend request IDs; do not change UI copy to imply the backend is healthy. |
| P1 | Status pulse still looks “live” while data is unavailable | The `auction-live-pulse` indicator animates independently of the data state. It can suggest a healthy/live feed while the heading reports an outage. | Make the indicator state-aware: live/healthy, loading, partial failure, total failure. Disable live pulse on failure and honor reduced-motion preferences. |
| P2 | Segment rail clips the third/fourth cards on a phone | Current mobile CSS intentionally switches the four segment cards to a horizontal scroll rail. The screenshot shows a partial third card and a visible scrollbar. | Keep all four destinations discoverable; use a compact 2x2 grid on mobile or a better scroll-snap rail with a clear affordance and no clipped labels. Test 320–430px widths. |
| P2 | Search placeholder is clipped | The screenshot shows the search placeholder cut at “locati…”. | Add `min-width:0`, full-width input sizing, and an accessible persistent label or concise placeholder; ensure refresh remains a distinct full-width action. |
| P2 | Bottom navigation overlaps lower page/footer content | White footer text is visible behind the fixed bottom dock. | Add route-aware bottom safe-area/content padding and verify the last content block can scroll completely above the dock. |
| P2 | Failure state has a large empty viewport | The unavailable header is tall while no results render. | Create a compact, explicit service-status panel with retry guidance and useful next steps, while preserving a truthful error state and avoiding fake listings. |
| P3 | Mobile trust chips consume space | “Verified listings” and “Published settlement rules” wrap into pills before the main heading. | Retain legitimate trust signals but make them more compact and ensure the wording is backed by the actual policy/configuration. |
| P3 | Counts use em-dash for failure, correctly, but the status context could be clearer | Source shows `—` for a failed section. | Keep the em-dash; expose per-section unavailable labels for screen readers and provide retry results without implying zero. |

## Source-level findings requiring careful handling

1. **The page is already designed to fail truthfully.** `Promise.allSettled` preserves successful sections when one endpoint fails; failed sections do not become zero counts, and failed refreshes preserve the last successful snapshot.
2. **Runtime response validation is incomplete.** `AuctionsView` trusts `result.value.auctions || []`. A fulfilled but malformed response envelope (for example `{}` or an unexpected `auctions` type) can be treated as a successful empty list. The next hardening pass should validate `{ auctions: Array }` before applying state and treat malformed envelopes as a failed section.
3. **Saved-auction retrieval failure is currently silent.** The favorites effect catches `getFavorites` failure and resets favorites to an empty set. The Saved tab may then present the “first favourite” empty state even though the saved-favorites service failed. Add a distinct favorites loading/error state; never convert an unavailable watchlist into a verified empty watchlist.
4. **Refresh has no last-successful-refresh timestamp.** The screenshot only offers a Refresh button. A timestamp and clear per-section success/failure feedback would help users understand whether displayed data is fresh.
5. **The API list serializer expects dealer trust details but the list query does not populate the dealer relation.** `listAuctions` uses `Car.find(...).lean()` while `toAuctionResponse` checks nested `car.dealer` fields. Depending on the actual model/adapter return shape, `dealer.verified` may not be available on list records and the verified-organizer badge may never render. Confirm with a fixture matching the real populated/unpopulated record shape before changing the serializer or query.
6. **Scheduled query scaling needs a documented threshold.** The controller loads up to 1,000 published setup rows and filters future starts in application memory. This is not proof of a current failure, but it can undercount/omit scheduled records if the table grows beyond that cap. Consider a query-level range/filter and correct total count only as a separately tested backend change.
7. **Potentially related cross-surface trust gap is documented, not silently changed.** Historical `AUCTION_SURFACE_CONVERGENCE_EXECUTION_REPORT_20261008.md` flags winner/highest-bidder exposure in `GET /api/cars/:id` while the canonical public auction response strips those fields. The current discovery surface does not consume that endpoint for auction cards. Treat this as a separate security review item rather than altering unrelated marketplace behavior during visual polish.

## Read-only production reachability attempt

Requested:
- `GET https://api.kayad.space/api/auctions?page=1&limit=1&status=live`
- `GET https://api.kayad.space/api/auctions?page=1&limit=1&status=draft`
- `GET https://api.kayad.space/api/auctions?page=1&limit=1&status=ended`
- `GET https://api.kayad.space/health`

Result: all attempts were blocked before HTTP because the audit environment could not resolve `api.kayad.space` (`curl: (6) Could not resolve host`). Therefore no HTTP status, response envelope, live database state, or production root cause is claimed. This is an audit-environment limitation.

## Existing source validators executed successfully

- `scripts/validate-auction-public-error-states.mjs` — 14/14 PASS.
- `scripts/validate-auction-transport-convergence.mjs` — 5/5 PASS.
- `scripts/validate-auction-domain-integrity.mjs` — 24/24 PASS.
- `scripts/validate-auction-bid-surface.mjs` — 6/6 PASS.
- `scripts/validate-auction-360-hardening-20261007.mjs` — 28/28 PASS.
- `scripts/validate-auction-phase-a-financial-integrity.mjs` — 24/24 PASS.
- `scripts/validate-stage5f7-private-auction-contract.mjs` — 23 PASS, 0 FAIL.

Total: **124 source-level checks passed across seven validators.** These are source-contract validators, not proof that the production API, database, provider callbacks, or real browser journeys currently work.

## Runtime and production checks not completed

- Root `npm ci`, TypeScript check and Vite production build: not run; no `node_modules`, available Node is v22.16.0 vs required >=22.22.2.
- Vitest/Playwright: not run in this audit environment.
- Live endpoint status/response bodies: blocked by DNS resolution failure.
- Real Supabase relation/row counts, deployed environment identity and backend request logs: unavailable.
- M-Pesa callbacks, bid concurrency, settlement, escrow, refunds, and financial reconciliation: not executed; this audit was read-only.

## Recommended next execution order

**Gate 1 — Diagnose the live failure (do not restyle away the warning).**
1. From a network that can resolve the API, record status and sanitized body for each of the three list requests separately.
2. Correlate each failure to backend request IDs/logs.
3. Check the exact Supabase project used by the deployed backend; verify `public.auction_setups` exists and is queryable with the server-side runtime credentials. The historical runbook is `docs/runbooks/auction-page-500.md`.
4. If all three requests fail, investigate shared API/DNS/baseURL/auth/backend startup/connectivity before assuming a single missing migration. If only `status=draft` fails, inspect the scheduled setup relation and eligibility-gate query.
5. Do not manually create a duplicate table, seed mock auctions, apply migrations blindly, or expose server-side keys.

**Gate 2 — Business/data correctness hardening.**
- Validate list envelopes and `auctions` array types.
- Add an explicit favorites/watchlist loading/error state.
- Confirm list serializer/dealer trust data with realistic test fixtures.
- Add last successful refresh and per-section status feedback.
- Preserve status truth, no fake inventory, server-side eligibility, and safe bid/payment boundaries.

**Gate 3 — Mobile premium polish.**
- Make the status pulse reflect actual request health.
- Replace the clipped horizontal segment rail with a responsive, accessible pattern.
- Fix search input sizing/labeling.
- Add bottom dock safe-area clearance.
- Compact the error-state hero while retaining explicit retry and trustworthy messaging.
- Capture before/after screenshots at 320, 360, 390, 412, 768, and 1440 CSS pixels.

**Gate 4 — Certification.**
- Install with Node >=22.22.2 and lockfile-based `npm ci`.
- Run targeted AuctionsView tests, full typecheck/build, auction backend regression suite, and Playwright load-failure/recovery journeys.
- Verify live/scheduled/ended endpoints and saved-watchlist behavior against staging.
- Exercise bidding and settlement only in approved staging/sandbox; no production money-moving test.

## Final audit status

**AUDIT COMPLETE — IMPLEMENTATION NOT STARTED.** The current source and business responsibilities are understood well enough to scope the next stage. The highest priority is diagnosing the three failed public list requests before making the visual refinement, then hardening malformed response handling and the saved-auction failure state. No application source behavior was changed in this audit.
