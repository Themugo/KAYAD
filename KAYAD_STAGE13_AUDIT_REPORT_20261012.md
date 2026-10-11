# KAYAD Stage 13 — Public Auction Discovery & Auction Room Audit

**Date:** 2026-10-12  
**Foundation:** `KAYAD-STAGE12-RUNTIME-DATABASE-FINANCIAL-CONVERGENCE-20261011.zip`  
**Input SHA-256:** `e8a10f3bdc49c37f5eff84f080d3f9a6e33884cb05dee969000be8f63753e34f`  
**Scope:** Public auction discovery (`AuctionsView`), individual auction room (`AuctionLivePage`), canonical public auction list/detail/bid-history endpoints, visible error states, accessibility, and targeted regression coverage.

## Executive summary

Stage 13 made focused source-level corrections without replacing the existing marketplace or auction architecture. The page no longer exposes raw generic server-error text, selected-tab headings now match the section the visitor is viewing, failed refreshes preserve the last successful records, and a detail-page 5xx/network failure is no longer mislabeled as “Auction not found.”

The backend review also found a public-data consistency gap: the canonical `/api/auctions?status=live` discovery path did not enforce the live time window or exclude rejected listings, even though the separate `/api/auctions/active` path already did. The canonical list filter is now aligned with those guards. Published future setups can also be opened before the corresponding `cars.auction_status` mirror is populated, provided the setup is published and its start time is still in the future. The public bid-history endpoint now rejects deleted and rejected vehicles.

**Important:** the user's visible `Starting soon` 500 has not been proven repaired at the hosted-runtime level. Stage 12 migration-diff evidence includes migration version `20261002190000` in the local-only list; that migration creates `public.auction_setups`. This makes hosted schema drift a concrete lead, not proof that the hosted relation is absent. The exact Supabase project and deployed backend still need read-only verification.

## Confirmed findings and changes

### 1. Discovery-page error presentation

**Finding:** The page copied `reason.message` or a server response message directly into the public UI. This exposed generic internal error text such as `Internal server error`, while the headline and supporting copy already described the failed section, producing duplicate and confusing diagnostics.

**Change:** Removed raw exception text from customer-facing rendering. The selected section's headline and concise supporting message now explain whether its list failed and whether other lists responded. A failed list is never described as an empty list.

### 2. Selected-tab truth and loading state

**Finding:** A failed scheduled request could change the headline to “Starting-soon auctions are temporarily unavailable” even when the selected Live tab had responded successfully with zero live auctions. The initial render could also briefly show a quiet-floor headline before requests completed.

**Change:** Headline state now follows the selected tab. Errors in other sections are reported in supporting copy. Initial loading has an explicit loading headline and status copy.

### 3. Refresh resilience

**Finding:** Every refresh assigned an empty array to failed sections, discarding the previous successful snapshot.

**Change:** Each list updates only when its own request succeeds. Failed refreshes preserve the last successful records and mark the section unavailable instead of converting it to zero. A newly loaded page still shows no fabricated records.

### 4. Watchlist guest state and accessibility

**Finding:** A signed-out visitor could see `0` under Saved for you and an empty-watchlist message that implied they could save items without signing in. Tab controls also lacked a linked results panel.

**Change:** Signed-out watchlist count is shown as unavailable (`—`), and the empty state offers Sign in and Explore live auctions actions. Tab controls now connect to an accessible `tabpanel` with `aria-controls`, `aria-labelledby`, keyboard-focusable results, and loading state.

The favorites request is also cancelled on account identity changes/unmount so a late response from a previous account cannot repopulate the current watchlist.

### 5. Individual auction room load failures

**Finding:** Any failure fetching the auction detail set `car` to null and rendered “Auction not found.” That conflated a true HTTP 404 with a server error, timeout, or network outage, and there was no retry action.

**Change:** The page distinguishes 404/invalid-link states from temporary service/network failures. Temporary failures have a Try again action; both states offer Back to auctions. The loading indicator has an accessible status label.

### 6. Duplicate initial bid-history request

**Finding:** The live room requested `fetchAuction(id)` and `fetchAuctionBids(id)` in parallel, although the canonical detail response already contains the sanitized, pseudonymous public bid list. This caused duplicate initial network work.

**Change:** The room now consumes `auctionData.bids` from the canonical detail response. The existing bid-history endpoint remains available; source validators were updated to verify the actual canonical response contract instead of requiring a redundant request.

### 7. Canonical public live-auction filtering

**Finding:** `listAuctions` (the endpoint used by public discovery) filtered `status=live` only by `auctionStatus='live'`. It did not enforce `auctionStartTime <= now`, `auctionEnd > now`, or exclude rejected listings. The separate `getActiveAuctions` endpoint already enforced time bounds and excluded rejected listings, so the two public surfaces could disagree.

**Change:** The canonical list filter now excludes `status='rejected'` and applies the live start/end time bounds for live requests. The same filter is used for rows and total counts. Scheduled-list car lookup also excludes rejected listings.

### 8. Scheduled setup vs lifecycle-row timing

**Finding:** Scheduled discovery uses a published `auction_setups` row and can return a future auction before `cars.auction_status` is mirrored to `draft`. The detail endpoint checked the car lifecycle status before checking the published setup, so a valid scheduled card could open as 404.

**Change:** Detail and public bid-history handlers now require a published setup and allow the pre-start lifecycle-mirror gap only when the status is absent/draft and the configured start is still in the future. For pre-start states, the published setup's configured start time takes precedence over a stale car-row start time. This does not bypass the published-setup check.

### 9. Public bid-history access

**Finding:** `getPublicAuctionBids` did not apply the same deleted/rejected vehicle guard as auction detail.

**Change:** Public bid history now returns 404 for soft-deleted or rejected vehicles, and continues to require a published setup and a valid lifecycle/scheduled state.

## Files changed

- `src/features/AuctionsView.tsx` — sanitized errors, selected-tab truth, loading copy, refresh preservation, signed-out watchlist state, request cancellation, accessible tabs/results panel.
- `src/pages/AuctionLivePage.jsx` — distinguish 404 from service/network failures, retry/back actions, accessible loading state, use sanitized bid list already in canonical detail response.
- `backend/controllers/auctionController.js` — live time bounds and rejected-listing exclusion, scheduled-list visibility guard, setup-authoritative pre-start detail/bid-history handling, deleted/rejected bid-history guard.
- `src/__tests__/features/auctionsViewLoadFailure.test.tsx` — updated sanitized-error assertions and added refresh-preservation coverage.
- `src/__tests__/pages/AuctionLivePage.test.jsx` — added 404, 503, and retry-recovery cases.
- `backend/tests/auction/auctionListSoftDelete.test.js` — added live time/rejected filtering, scheduled lifecycle-mirror, and public bid-history visibility tests.
- `scripts/validate-auction-public-error-states.mjs` — new 14-check source contract validator.
- `scripts/validate-auction-bid-surface.mjs` — updated to validate sanitized bids in the canonical detail response.
- `scripts/validate-auction-360-hardening-20261007.mjs` — updated the bid-list contract assertion to match the canonical detail response.
- `package.json` — added `validate:auction-public-error-states` script.
- `docs/runbooks/auction-page-500.md` — recorded the migration-parity evidence and safe diagnostic steps.
- `KAYAD_STAGE13_AUDIT_REPORT_20261012.md`, `KAYAD_STAGE13_CHANGE_LEDGER_20261012.md`, `KAYAD_STAGE13_VALIDATION_MATRIX_20261012.tsv`, `KAYAD_STAGE13_EXECUTION_LOG_20261012.md`, `KAYAD_STAGE13_VALIDATION_LOG_20261012.txt`, and `KAYAD_STAGE13_SHA256_MANIFEST_20261012.txt` — new audit artifacts.

No auction schema migration was added or applied. No financial, escrow, ledger, ownership, payment, or settlement behavior was changed.

## Validation evidence

### Executed successfully

- JavaScript/MJS syntax: **1,225/1,225 files passed** with `node --check`.
- Frontend TypeScript/TSX/JSX syntax transpilation: **657/657 files parsed with zero syntax diagnostics** using the globally available TypeScript transpiler. This is a syntax check, not a typecheck.
- `validate:auction-public-error-states`: **14/14 PASS**.
- `validate:auction-bid-surface`: **6/6 PASS**.
- `validate:auction-360-hardening-20261007`: **28/28 PASS**.
- `validate:auction-domain-integrity`: **24/24 PASS**.
- `validate:auction-phase7`: **8/8 PASS**.
- `validate:auction-phase8`: **14/14 PASS**.
- `validate:auction-phase9`: **21/21 PASS**.
- `validate:auction-phase10`: **32/32 PASS**.
- `validate:frontend-runtime-contracts`: PASS.
- `validate:runtime-integrity`: **7/7 PASS**.
- `validate:navigation-convergence`: **43/43 PASS**.

### Blocked / not run

- `npm ci --engine-strict=false --no-audit --no-fund` was attempted but the package registry requests failed with `EAI_AGAIN`; the install was stopped and its partial `node_modules` directory removed.
- Node in this environment is `v22.16.0`; the project requires `>=22.22.2`.
- Frontend Vitest, backend Jest, full `tsc --noEmit`, Vite production build, browser/Playwright E2E, and live API verification were **not run** in this pass.
- New unit-test cases were authored but could not be executed because dependencies could not be installed. Static validator results do not replace those runtime tests.
- Hosted Supabase relation existence, deployed API response, backend request logs, and deployment commit were not verified in this pass.

## Starting-soon 500: remaining investigation

The included Stage 12 evidence lists migration version `20261002190000` as local-only. Its local SQL file is `supabase/migrations/20261002190000_auction_setup_publication_contract.sql`, which creates `public.auction_setups`.

The most important next diagnostic is read-only verification against the **exact Supabase project configured in the deployed backend**:

```sql
select to_regclass('public.auction_setups') as auction_setups_relation;
select count(*) as published_setup_count
from public.auction_setups
where publication_status = 'published';
```

If the relation is missing, reconcile migration history through the approved staging workflow; do not blindly push every local-only migration. If it exists, capture the sanitized status/body and request ID from `/api/auctions?status=draft`, correlate backend logs, and verify the deployed backend's Supabase URL/project without exposing secrets. This source release makes the page's response to the error cleaner but does **not** claim to repair the hosted database failure.

## Release boundary

This is a **source-validated release candidate**, not a runtime-certified, staging-certified, or production-certified release. No commit, push, deployment, production migration, real payment, real message, or provider transaction occurred. The existing architecture and Stage 12 financial foundation were preserved.
