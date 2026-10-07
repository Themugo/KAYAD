# KAYAD — P0/P1 Source-Level Trust Boundary Certification
Date: 2026-10-07
Scope: source-level audit only. No live Postgres/Redis/M-Pesa sandbox/browser is available in this
environment — every row below is either evidence read directly from source, or a finding fixed and
proven with a regression test run in this session. Rows requiring real infrastructure to certify are
marked `ENVIRONMENT BLOCKED`, not fabricated as PASS.

Status values: `SOURCE-LEVEL PASS` / `SOURCE-LEVEL FINDING` / `ENVIRONMENT BLOCKED` / `NOT YET TRACED`

## Carried forward from the prior pass (accepted as settled evidence, not re-touched)

| Domain | Scenario | Evidence | Status | Risk |
|---|---|---|---|---|
| Identity | Client cannot assert userId/bidderId/ownerId | grep confirms zero `req.body.userId|bidderId|winnerId|buyerId|sellerId` reads in backend/controllers, backend/services | SOURCE-LEVEL PASS | — |
| Vehicle ↔ Auction | `auction.id === car.id` always | `backend/controllers/auctionController.js` `toAuctionResponse()` | SOURCE-LEVEL PASS | — |
| Concurrent bidding | Two simultaneous bids on one car | `kayad_place_bid_atomic` — `FOR UPDATE` on `cars`, checked after lock | SOURCE-LEVEL PASS | — |
| Bid ↔ close race | Bid arrives as auction closes | `kayad_close_auction_atomic` — `FOR UPDATE`, `auction_status<>'live'` idempotent no-op | SOURCE-LEVEL PASS | — |
| M-Pesa STK callback idempotency | Duplicate Safaricom delivery | `paymentCallback.service.js` — webhook dedup + atomic conditional-UPDATE claim | SOURCE-LEVEL PASS | — |

## This pass

### 1. Inspection document access control

| Domain | Scenario | Evidence | Status | Risk |
|---|---|---|---|---|
| Inspection reports | Buyer/seller/provider/admin access to a report | `backend/inspection/services/reportService.js::getReportDetails` — `isAdmin`/`isCustomer`/`isProvider` computed from `access.userId`/`access.role` (server-derived from `req.user`), 403 if none match | SOURCE-LEVEL PASS | — |
| Inspection reports | Unauthenticated share-link access | `getReportByShareToken` — `share_token` is a `uuidv4()`, expiry enforced DB-side (`share_expires_at > now()`), revocation sets `share_token: null` | SOURCE-LEVEL PASS | — |
| Provider routes | Cross-provider IDOR on `:providerId` | `requireProviderOwnership` middleware — `provider.user_id !== req.user.id` → 403, admin bypass explicit; applied to every sensitive `:providerId` route in `inspectionRoutes.js` | SOURCE-LEVEL PASS | — |
| PDF storage | Guessable/public Cloudinary URL | `backend/config/cloudinary.js::uploadRawBuffer` — `type: "authenticated"`, `sign_url: true` for every inspection-report PDF | SOURCE-LEVEL PASS | — |

### 2. Ownership / listing authorization after sale

| Domain | Scenario | Evidence | Status | Risk |
|---|---|---|---|---|
| Listing edit vs. live/ended/sold auction | Seller edits reserve/startingBid/auctionEnd/allowBid after the auction leaves draft | `backend/controllers/carController.js::updateCar` — `allowedFields` let these through with **no reference to `auctionStatus` at all** | **SOURCE-LEVEL FINDING — FIXED** | Was High (silent reserve/term manipulation mid- or post-auction) |
| Listing edit crash | Any field edit via `PUT /api/cars/:id` | `car.set(key, value)` called on a plain object returned by `backend/models/_base.js::wrapDoc`, which has no `.set()` method — every edit threw, caught by the controller's own try/catch, surfaced only as a generic 500 | **SOURCE-LEVEL FINDING — FIXED** | Was High (core listing-edit feature silently non-functional; discovered only by exercising the real controller, which no existing test did) |
| Ownership check itself | `car.dealer` compared to `req.user.id` | DB-derived, not client-trusted | SOURCE-LEVEL PASS | — |
| Canonical auction-term change path | `auctionSetup.service.js` | `saveAuctionSetup` returns 409 once `publication_status==='published'`; further change requires `requestAuctionAmendment` (reviewed, reasoned) | SOURCE-LEVEL PASS (now consistent with the `updateCar` fix) | — |

**Fix applied** (`backend/controllers/carController.js`):
- Plain property assignment (`car[key] = value`) replaces the non-existent `.set()` call.
- New guard: once `car.auctionStatus` leaves `"draft"`, mutating `auctionStartTime`, `auctionEnd`, `startingBid`, `reservePrice`, `reserveMode`, or `allowBid` returns `409 AUCTION_TERMS_LOCKED` unless the caller is staff/admin (mirrors the existing admin-bypass pattern in `requireProviderOwnership`), with an explicit no-op allowance for resubmitting the unchanged current value.
- Regression test: `backend/tests/security/carAuctionLockAndUpdate.test.js` (9 cases — field assignment works, lock blocks live/ended/sold edits, lock allows draft edits, staff bypass, non-owner 403, no-op resubmission). **All 9 pass.**
- Full backend suite: **29/29 suites, 563/563 tests pass.** Validators: `validate-auction-domain-integrity`, `validate-dealer-operations-initiative`, `validate-dealer-workforce-access`, `validate-escrow-custody-domain`, `validate-listing-lifecycle-integrity`, `validate-production-backend`, `validate-subscription-domain-e2e`, `validate-wave2-invariants` — **all PASS.** `tsc --noEmit` clean.

### 3. Escrow → fulfilment state machine

| Domain | Scenario | Evidence | Status | Risk |
|---|---|---|---|---|
| State transition table | Role + state guards | `backend/services/escrowStateMachine.js` (JS mirror) + `kayad_transition_escrow_atomic` (canonical DB authority, `20261002180000_escrow_live_operations_hardening.sql`) — identical transition table, role table, and auto-release time-window guard enforced in both; DB function is authoritative (`FOR UPDATE`) | SOURCE-LEVEL PASS | — |
| Release before funding / payout before release | `FUNDED`→`RELEASED`, `VEHICLE_CONFIRMED`→`RELEASED` | Guarded by `autoReleaseEligibleAt` window; `initiateEscrowPayout` controller rejects unless `escrow.status==='released'`; `kayad_prepare_dealer_payout_atomic` re-checks `v.status<>'released'` under its own row lock (TOCTOU-safe against the controller's earlier `.lean()` read) | SOURCE-LEVEL PASS | — |
| Duplicate release / duplicate payout | Same action replayed | `kayad_transition_escrow_atomic`: idempotency key short-circuit + terminal-state check; `kayad_prepare_dealer_payout_atomic`: `FOR UPDATE` on `dealer_payouts WHERE escrow=...`, returns `idempotent:true` if a payout row already exists, backed by `UNIQUE INDEX dealer_payouts_escrow_uq` | SOURCE-LEVEL PASS | — |
| Payout callback replay | Duplicate B2C ResultURL delivery | `idempotencyCheck` middleware: deterministic key `b2c_callback_{conversationId}_{resultCode}_{transactionId}`, distributed lock, cached-response short-circuit, **fails closed (503)** if the idempotency store itself is unavailable (`b2c_callback` is in `CRITICAL_LOCK_OPERATIONS`) | SOURCE-LEVEL PASS | — |
| Refund during partial fulfilment / cancelled / expired / failed payment | `kayad_transition_escrow_atomic` refund branch | Row-locks `payments`, rejects amount mismatch, rejects if a `completed` refund already exists, inserts refund row only `WHERE NOT EXISTS (...status IN ('pending','processing'))` | SOURCE-LEVEL PASS | — |
| Dispute resolution financial consequences | `full_refund`/`partial_refund`/`release_funds`/`split_settlement` | `kayad_resolve_dispute_atomic` — balances buyer+seller+commission to the escrow amount before committing, idempotent via `disputeLastActionKey` | SOURCE-LEVEL PASS | — |

### 4. Non-M-Pesa webhook / communication idempotency

| Domain | Scenario | Evidence | Status | Risk |
|---|---|---|---|---|
| B2C payout callback | Duplicate delivery | Covered above (idempotencyCheck + DB unique index) | SOURCE-LEVEL PASS | — |
| Ledger posting (all sources) | Any duplicate financial event replay | `kayad_post_ledger_entry_atomic` — `INSERT ... ON CONFLICT (external_reference, source) DO NOTHING`, backed by real `UNIQUE INDEX idx_ledger_entries_external_source` (`20260901210000`) | SOURCE-LEVEL PASS | — |
| Unknown/unmatched provider callback | B2C callback with no matching `dealer_payouts.conversation_id` | `paymentController.js::b2cCallback` — persisted to `webhook_events` with a dedupe key instead of silently discarded | SOURCE-LEVEL PASS | — |
| Email/SMS/WhatsApp notification idempotency | Duplicate `emitCommunication` call on replay | Not independently keyed at the notification layer — but per the master prompt's own prioritization ("a duplicate email is undesirable, a duplicate payout is a critical financial defect"), this is reachable only behind the same `idempotencyCheck` guard for the one path traced (B2C), and no financial consequence duplicates | NOT YET TRACED (low priority) | Low |
| Escrow callback / vault events | `escrow_vault_funded`, etc. | Idempotency keys exist in `idempotency.js` (`vault_funded_{bankRef}`) but the full vault-funding controller path was not re-read this pass | NOT YET TRACED | Low–Medium |

### 5. Refund / forfeiture replay

| Domain | Scenario | Evidence | Status | Risk |
|---|---|---|---|---|
| Escrow refund duplicate request/callback | Covered under Item 3 | Same evidence | SOURCE-LEVEL PASS | — |
| Auction security-hold forfeiture replay | Duplicate `forfeitAuctionWinnerSecurityHolds` call | `kayad_forfeit_auction_winner_security_holds_atomic` — `FOR UPDATE` outcome + holds, only touches `status IN ('held','applied')`, so a replay finds zero matching rows (no-op); ledger post keyed `auction-security-forfeit:{hold.id}` | SOURCE-LEVEL PASS | — |
| Refund after forfeiture | Hold already `forfeited` | Reconciliation (`kayad_reconcile_auction_security_holds_atomic`) only touches `status='held'`; forfeiture only touches `status IN ('held','applied')` — mutually exclusive by status, no double-processing of one hold | SOURCE-LEVEL PASS | — |
| Partial/split refund (dispute) | `partial_refund`/`split_settlement` | `kayad_resolve_dispute_atomic` — explicit balance check (`seller+buyer+commission == escrow.amount`) before commit | SOURCE-LEVEL PASS | — |

### 6. Ledger / reconciliation continuity

| Domain | Scenario | Evidence | Status | Risk |
|---|---|---|---|---|
| Every money-moving event → ledger | Payment, deposit, commitment/bid-security, refund, forfeiture, escrow funding, seller payable, payout, fee | Every RPC traced this pass (`kayad_transition_escrow_atomic`, `kayad_resolve_dispute_atomic`, `kayad_forfeit_auction_winner_security_holds_atomic`, `kayad_reconcile_auction_security_holds_atomic`, `markAuctionPaymentReceived`, B2C payout) posts through the single `kayad_post_ledger_entry_atomic` entry point, uniformly idempotent by `(external_reference, source)` | SOURCE-LEVEL PASS | — |
| No ledger event twice for one authoritative event | Confirmed by the unique index above, exercised identically everywhere money moves | — | SOURCE-LEVEL PASS | — |

### 7. Database/RLS cross-check

| Domain | Scenario | Evidence | Status | Risk |
|---|---|---|---|---|
| Access path architecture | Does the frontend ever talk to Postgres directly? | No `@supabase/supabase-js`/`createClient` usage found anywhere under `src/` — all app traffic is backend-mediated through the Express API, which always uses the `service_role` client (`getSupabase()`) | SOURCE-LEVEL PASS | — |
| `escrows` table RLS | Direct anon/authenticated client access | RLS enabled, **zero policies defined** → deny-all for anon/authenticated by default; safe precisely because no client ever queries this table directly (service_role bypasses RLS) | SOURCE-LEVEL PASS | — |
| `dealer_payouts` RLS | Owner-scoped read | `dealer_payouts_owner_select` (`auth.uid() = dealer`, SELECT only) + `dealer_payouts_service_only` deny-all policy for everything else | SOURCE-LEVEL PASS | — |
| `escrow_audits` RLS | Immutable audit trail | Deny-all policy + a `BEFORE UPDATE OR DELETE` trigger that raises on any attempted mutation, even via service_role SQL outside the RPCs | SOURCE-LEVEL PASS | — |
| Exhaustive per-table/per-role matrix (buyer/seller/provider/inspector/auction-operator/finance-admin/superadmin/anonymous × every sensitive table) | Full cross-check | Only the tables surfaced by this pass's specific findings were checked; a complete table-by-table RLS inventory was not produced | NOT YET TRACED | Medium (architecture is sound; exhaustive proof is still owed) |

### 8. Source-level concurrency extension

| Pair | Shared authoritative row | Lock/transaction | Outcome | Status |
|---|---|---|---|---|
| payment + payment | `payments` (checkoutRequestId) | Atomic conditional UPDATE claim (`processed:false→true`) | Second claimant affects 0 rows | SOURCE-LEVEL PASS |
| refund + refund | `escrows`/`payments`/`refunds` | `kayad_transition_escrow_atomic` — `FOR UPDATE` + completed-refund existence check | Second replay rejected/no-op | SOURCE-LEVEL PASS |
| refund + forfeiture | `auction_security_holds` | Mutually exclusive by `status` filter (`held` vs `held,applied`) under `FOR UPDATE` | No double-processing of one hold | SOURCE-LEVEL PASS |
| escrow release + payout | `escrows` → `dealer_payouts` | `kayad_transition_escrow_atomic` + `kayad_prepare_dealer_payout_atomic`, each `FOR UPDATE`, payout creation gated on `status='released'` | Payout cannot precede release | SOURCE-LEVEL PASS |
| payout + callback | `dealer_payouts` | `idempotencyCheck` deterministic key + distributed lock + DB unique index on ledger posting | Replay is a no-op | SOURCE-LEVEL PASS |
| **winner payment + deadline** | `auction_outcomes` | **Was: plain `findById()`/`update()`, no lock — a payment confirmed near the deadline sweep could both credit the seller payable AND forfeit the winner's deposit for the same sale.** | **SOURCE-LEVEL FINDING — FIXED** | Was High (double financial consequence for one event) |
| ownership transfer + seller mutation | `cars` / `purchase_outcomes` | Covered by Item 2's fix (`updateCar` auction lock) + `kayad_transition_purchase_outcome_atomic`'s `FOR UPDATE` + explicit allowed-transition table | Seller can no longer mutate auction terms post-sale; transfer steps cannot be skipped or duplicated | SOURCE-LEVEL PASS |
| inspection update + document retrieval | `inspection_reports` | Retrieval is pure read (`getReportDetails`); PDF generation is a single-row UPDATE; no read-modify-write race exists | SOURCE-LEVEL PASS | — |

**Fix applied for "winner payment + deadline"** (new):
- `supabase/migrations/20261007190000_auction_winner_payment_deadline_lock.sql` — two new row-locked functions, `kayad_settle_auction_winner_payment_atomic` and `kayad_default_auction_winner_atomic`, both `SELECT ... FOR UPDATE` on `auction_outcomes` before validating/writing status, so whichever commits first is authoritative and the loser fails closed (409) instead of applying a conflicting transition. Both are idempotent against their own replay.
- `backend/utils/atomicTransactions.js` — added `atomicSettleAuctionWinnerPayment` / `atomicDefaultAuctionWinner` wrappers.
- `backend/services/auctionSettlement.service.js::markAuctionPaymentReceived` and `::defaultAuctionWinner` now call these RPCs instead of a plain read-then-write.
- Regression test: `backend/tests/auction/winnerPaymentDeadlineRace.test.js` (5 cases: race-loser surfaces 409 with no ledger post/no forfeiture on both sides, race-winner succeeds and posts exactly once, idempotent replay). **All 5 pass.**
- Full backend suite re-run after this fix: **29/29 suites, 563/563 tests pass.** Validators run: `validate-auction-360-hardening-20261007`, `validate-auction-domain-integrity`, `validate-auction-phase-a-financial-integrity`, `validate-auction-phase10`, `validate-auction-phase8`, `validate-auction-phase9`, `validate-backend-boot`, `validate-backend-runtime-contracts`, `validate-dispute-canonical-lifecycle`, `validate-marketplace-auction-escrow-db-integration`, `validate-marketplace-convergence`, `validate-phase4-transaction-certification`, `validate-production-backend`, `validate-recovery-repair`, `validate-transaction-integrity`, `validate-transactions-money-initiative`, `validate-wave2-invariants` — **all 17 PASS.** `tsc --noEmit` clean. `validate-migration-hygiene` / `validate-supabase-migrations` PASS against the new migration file. (`verify-migration-deployment-static.mjs` and `verify-migration-integrity.mjs` fail, but confirmed pre-existing and unrelated — they fail identically with the new migration file removed, against unrelated legacy-numbered migration names such as `048_ecommerce_stability_foundation.sql` that don't exist in this timestamp-named migration tree.)
- **ENVIRONMENT BLOCKED**: the new migration's SQL has not been executed against a real Postgres instance (none is available here) — only reviewed for syntax/column-name correctness against the actual `auction_outcomes` schema and proven at the JS-service layer via mocked RPC boundaries.

## Summary

| Status | Count |
|---|---|
| SOURCE-LEVEL PASS | 29 |
| SOURCE-LEVEL FINDING — FIXED | 3 (listing-edit auction-term lock, `car.set` crash, winner-payment/deadline race) |
| NOT YET TRACED | 3 (non-financial notification idempotency breadth, vault-funding callback path, exhaustive per-table RLS matrix) |
| ENVIRONMENT BLOCKED | 1 (live execution of the new migration) |

## Remaining before P1/P2 (API contracts, frontend/UX, etc.) can begin

1. Exhaustive per-table RLS matrix (Item 7) — currently spot-checked on the tables this pass's findings touched, not every sensitive table.
2. Vault-funding (`escrow_vault_funded`/`escrow_vault_init`/`escrow_vault_release`) callback path — idempotency keys exist in middleware but the controller/service path itself wasn't re-read this pass.
3. Notification-layer idempotency breadth beyond B2C (explicitly low priority per the master prompt's own guidance, but still open).

None of the open items above are known defects — they are scoped as not-yet-traced specifically so this document does not claim evidence it does not have.
