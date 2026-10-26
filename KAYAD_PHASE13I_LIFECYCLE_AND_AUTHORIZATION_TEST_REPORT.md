# KAYAD Phase 13I — Lifecycle and Authorization Test Report

Tier: **local, real stack** (real Express → PostgREST → PostgreSQL with all 188 migrations; real Chromium). Not staging or production evidence.

## Lifecycle covered end to end
registration/login → email verification gate → apply → pending persistence → approve → reject → reapply → suspend → revoke → reinstate → create / edit / unpublish own listing → public search and detail visibility → related read APIs, aggregates and caches → buyer access throughout → logout, expiry, tamper, ban, unauthorized.

| area | evidence (final frozen tree) | result |
|---|---|---|
| Personal account HTTP matrix | `phase13i_personal_account_matrix.mjs` | 77 pass, 0 fail, 1 OPEN protected |
| Browser journeys (1280px and 390px) | `phase13i_ui_journeys.mjs` | 118 pass, 0 fail |
| 13F lifecycle matrix (re-run) | `phase13f_http_lifecycle_matrix.mjs` | 103 pass |
| DB lifecycle drivers | `validate-phase13g-db.sh` (+13F driver) | 17 + 28 pass (43-assertion lifecycle, re-apply, rollback, concurrency) |
| Component tests (mocked API) | `Phase13iPersonalAccountStates.test.jsx` (17), `Phase13iAdminStaleDecision.test.tsx` (1), existing dashboard/admin tests | pass |

## Key behaviours proven
- **Identity**: one `users.id`; applying never changes role/status; no dealer record is created for any personal seller (UI DL4); `dealer_approved_at` is never stamped by the seller workflow (HTTP L1c/L2c).
- **State machine**: transitions as in the state matrix; invalid transitions → 409 with state unchanged (HTTP C2, C6, C7); duplicates: five simultaneous applications → one 201 + four 409, one row (HTTP C3); concurrent approve vs reject → exactly one winner (HTTP C1); three simultaneous approvals → one 200 and one audit entry (HTTP C4/C4b); stale decision after a state change → 409 (HTTP C2).
- **UI is never authorization**: component test where the client user object *claims* approval while the server says `none` → no workspace; direct navigation to `/sell` and its aliases is decided by the API (UI B6, S6, X4, LG5, N2–N4); a suspended seller's stale session is refused on writes (UI S7; HTTP L1f/L2f).
- **Legacy `approve-dealer` endpoint**: default policy owner_only → 403 `DECISION_AUTHORITY_REQUIRED` (HTTP L0); with admin delegation, a suspended or revoked private seller is **refused 409 `SELLER_CAPABILITY_RESTRICTED`** — no approval timestamp, no `users.status` change, no "approved" communication, listing stays hidden, writes stay blocked (HTTP L1a–f, L2a–f); alternate dealer-verification path cannot approve a revoked seller (HTTP L8/L8b); a pending legacy seller is still approved normally (HTTP L3); reinstatement through the review workflow still works (HTTP L4).
- **Partial failures**: a refused administrator decision no longer leaves stale buttons (reload after refusal); cache-invalidation failure is reported truthfully (existing 13F behaviour; component test); fail-closed lock in the saved-search job.
- **Sessions**: expired/tampered/foreign-secret/unknown-user tokens → 401 (HTTP S1–S4); no credentials → 401 on every personal endpoint (HTTP S5); banned account refused, unbanned works immediately (HTTP S6/S7); logout revokes the bearer token (HTTP S8/S9, UI N5).
- **Admin boundary**: buyer cannot open the review page or call the decision API (UI U1/U2, HTTP X5), anonymous cannot (N4), marketing/HR staff cannot use the legacy endpoint (HTTP L7), admin shell protected.
- **Dashboard convergence**: no duplicate dashboard or route; aliases `/sell`, `/sell-car`, `/sell-vehicle`, `/?nav=seller-platform` resolve to the same Seller Studio and are API-gated; full refresh shows server state in every state (RF-*); 390px layouts have no horizontal overflow in every state (P-*); Dealer Hub unchanged (DL1–DL3).

## Defects found and fixed in 13I (non-protected, with regression evidence)
1. Legacy `approve-dealer` could approve a suspended/revoked private seller (stale/alternate path) — fixed, tests L1/L2.
2. Rejected **legacy** `individual_seller` was shown an application form the server refuses — fixed in the panel (message + support route).
3. A refused (stale/concurrent) admin decision left stale actions on screen — page reloads the real state.
4. Public/by-id endpoints answered for hidden/pending/draft/deleted listings or aggregated them — see the listing-visibility report.
5. Saved-search job could never send and had no gate — redesigned (see its report).
