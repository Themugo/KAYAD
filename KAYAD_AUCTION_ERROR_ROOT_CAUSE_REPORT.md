# Auction "Internal server error" — root-cause report (Gate 4, 2026-10-09)

## 1. What the user sees and where it comes from
`AuctionsView.tsx` loaded three lists with one `Promise.all` — `fetchList({status:'live'})`, `'draft'` (Starting soon) and `'ended'` — via `auctionService.fetchList` → `GET /api/auctions` → `auctionController.listAuctions`. Any rejection set one page-level error and **all three lists stayed empty**.
The literal text is not written by the page: `backend/middleware/errorHandler.js` replaces the message of **every 5xx outside `development`/`test`** with `"Internal server error"`. So the banner means "one of the three requests returned a 5xx"; the sanitised body carries no cause by design.

## 2. Reproduction (local; real backend process, real migrated PostgreSQL 16 schema behind a PostgREST emulator)
The backend (`bootstrap.js`) was started with `SUPABASE_URL` pointing at a small PostgREST emulator that executes the generated queries against the migration-built schema (unknown columns/relations fail exactly as PostgREST would).

| Scenario | live | draft (scheduled) | ended |
|---|---|---|---|
| Healthy schema, seeded live / scheduled / ended rows | 200 | 200 | 200 |
| `auction_setups` relation unavailable (e.g. migration `20261002190000_auction_setup_publication_contract` not applied, or table not readable) | 200 | **500** `relation "auction_setups" does not exist` | 200 |
| Backend started with no Supabase configured (`initSupabase` never ran) | 500 | 500 | 500 (`Supabase not initialized`) |

Backend log line for the failing request (dev mode shows the cause; production replaces it with `Internal server error`):
`PG ERROR auction_setups ERROR: relation "auction_setups" does not exist <= /rest/v1/auction_setups?select=*&publication_status=eq.published&limit=1000` → `GET /api/auctions?page=1&limit=100&status=draft` → **500**.

## 3. Root cause
* **Failing request:** `status=draft` ("Starting soon"). It is the only list that depends on a second data source (`auction_setups`, the published auction-setup contract). Live and Completed read only `cars`.
* **Propagation defect (confirmed, fixed):** `Promise.all` turned one failing request into a page with no data and no per-section signal, so a fault in the scheduled source took the whole auction floor down.
* **What could not be established:** which condition made the *deployed* `draft` request return 5xx. No deployed logs or Supabase access exist in this environment. The reproduced trigger is a missing/unreadable `auction_setups`; the checks to run on the deployed project are: `select to_regclass('public.auction_setups');`, `select count(*) from auction_setups where publication_status='published';` and the backend log line for `requestId` from the failing response. **The cause in the deployed environment is therefore NOT claimed as proven.**
* The page-level failure was **not** a schema/column mismatch in `cars` queries, a serializer exception (`toAuctionResponse` tolerates missing fields), or a limit/validation error (limit 100 is accepted).

## 4. Repairs
1. `AuctionsView.tsx`: `Promise.allSettled`; each list is independent. A failed list shows **"—"** (never 0), the banner names the failed section and the server message, headline/subcopy stop claiming the floor is quiet, the empty-state card is suppressed for a failed tab, and Refresh retries. Request URLs and layout are unchanged (the existing `validate-auction-bid-surface` contract check still passes).
2. Backend: the failure is **not hidden** — a throwing scheduled source still returns the sanitised 5xx (asserted by test).

## 5. Second defect found during the trace (fixed)
The Mongo-style filter `deletedAt: null` is **silently dropped** by the Supabase adapter (`buildWhere` skips `null`). `listAuctions`, the scheduled branch, `getActiveAuctions` and `getMyAuctions` therefore returned **soft-deleted vehicles as public auctions**, and `pagination.total` counted them (reproduced: a soft-deleted live car was listed). The auction detail endpoint also served deleted vehicles.
Severity note: no application code in this repository currently writes `cars.deleted_at` (searched controllers/services), so exposure exists only for rows soft-deleted by SQL/operations tooling; the fix is preventive and it is not the cause of the 5xx.
Fix (additive, no behaviour change for other callers): adapter operator `{ $exists:false }` ⇒ `IS NULL` (`{ $exists:true }` ⇒ `IS NOT NULL`); the four auction queries use it; detail returns 404 for a deleted vehicle. Verified against the real schema: live 2→1, total corrected, detail of the deleted car 404.
*Not changed (out of scope, listed for a separate deliberately scoped change):* ten other files still pass `deletedAt: null` and are affected by the same adapter behaviour — `commandCenterController`, `vehicleAnalyticsController`, and the services `auctionIntegrity`, `dealerHealthScore`, `dealerSubscription`, `ecp`, `marketplaceHealth`, `reminderAutomation`, `sitemap`, `vehicleAnalytics` (mostly counts/analytics, but `sitemapService` could list deleted vehicles).

## 6. Regression tests
* `backend/tests/auction/auctionListIntegrity.test.js` — adapter: bare null skipped (documented), `$exists:false` ⇒ `.is(col,null)`, `$exists:true` ⇒ `.not(col,'is',null)`.
* `backend/tests/auction/auctionListSoftDelete.test.js` — list/count/scheduled/active use the guard; deleted detail 404; a throwing scheduled source rejects (no empty-list masking).
* `src/__tests__/features/auctionsViewLoadFailure.test.tsx` — partial failure keeps live data, shows "—", no false empty claim; total failure shows the error; healthy empty backend still says "quiet". **Revert-proof:** with the old `AuctionsView` 2 of these 3 fail.
* `e2e/auction-journey/auction_load_failure_journey.cjs` — mocked-HTTP browser journey, desktop + mobile, incl. Refresh recovery: 14/14.

Authority unchanged: no bidding, settlement, escrow or financial code touched.
