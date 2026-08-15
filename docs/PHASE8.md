# PHASE8.md
**KAYAD - Phase 8: Transaction Safety Investigation**

Scoped as the direct follow-up to Phase 7's headline finding (the fake-transaction layer in utils/supabaseSession.js). What this phase actually found changed its own plan significantly partway through - documented here in the order it was discovered, not reorganized to look tidier than the investigation actually was.

---

## 0. Headline Finding: KAYAD Has Two Separate, Parallel Escrow Systems - Only One Has a Real Table

The original Phase 8 plan was to build real Postgres transaction safety (via RPC functions) for escrowVaultController.js, the controller Phase 7 identified as relying on the fake transaction layer. Before writing any SQL, this phase checked whether escrow_vaults (the table EscrowVault.js and escrowVaultController.js expect) actually exists in the real, authoritative schema.

**It does not.** Searched supabase/migrations/ (all files) exhaustively: zero CREATE TABLE for escrow_vaults anywhere. It exists only in backend/db/schema_clean.sql - the same stale, superseded schema source that caused two previously-corrected bugs this program already found and fixed (docs/fusion/phase-05-schema-correction.md, phase-06-field-alias-fix.md).

**This means an earlier report in this program's own history was wrong**: docs/DATABASE_SOURCE_OF_TRUTH.md (Phase 1) listed escrow_vaults among the "core, verified" tables. That was very likely written against the same stale schema_clean.sql file, not caught at the time. Corrected here, not silently.

**What this actually reveals**: `/api/escrow` (escrowRoutes.js, backed by the real `escrows` table, confirmed working end-to-end in Phase 6 via paymentCallback.service.js's idempotent claim-and-verify flow) and `/api/escrow-vault` (escrowVaultRoutes.js, backed by EscrowVault.js, which has no real table) are both mounted and reachable - two complete, substantial, independently-built escrow implementations. `escrowVaultController.js` is 538 lines with a genuinely sophisticated feature set (OTP-confirmed buyer release, admin manual fund confirmation, webhook-driven bank confirmation, admin refund) - this is not stub or placeholder code. It simply cannot write to a database, because its table was never created in the schema that's actually authoritative.

**Why this changes Phase 8's plan**: building atomic RPC functions for escrow_vaults, as originally planned, would have meant carefully engineering transaction safety for a system that cannot function at all today regardless of atomicity. That's not a useful fix. The real question this raises - should escrow_vaults be created as a real table (making escrowVaultController.js the primary escrow system), or should its callers be migrated to the already-working escrows table (consolidating to one system) - is a product-level architecture decision, not something to resolve unilaterally inside a transaction-safety phase. **Not decided here.** Flagged as the clear next decision point, with both options' tradeoffs named in Section 3.

---

## 1. A Real Fix Applied: Bid Confirmation Race Condition (Production M-Pesa Path)

While reading bidController.js to understand what a real transaction-safety fix looks like in this codebase, found that a prior session had already identified and fixed this exact class of problem - but only in one of two places it existed.

**Already fixed (found, not new this phase)**: controllers/bidController.js's placeBid(), mock-payment branch. A detailed existing comment in that file explains the exact same finding this program made independently in Phase 7 (utils/supabaseSession.js provides no real atomicity) and documents the fix actually used: optimistic concurrency - the car update is conditioned on `current_bid` still matching the value read (`.eq("current_bid", previousBidValue)`), so a concurrent bid that already changed the value causes the update to affect zero rows, detected and rejected with a clear "BID_CONFLICT" error rather than silently overwriting a legitimately higher bid.

**Not fixed until this phase**: services/paymentCallback.service.js's real M-Pesa callback handler (the path that actually runs bid confirmation in production, as opposed to bidController.js's mock-mode branch) had the identical unprotected pattern - `update("cars", car.id, { currentBid: bid.amount, highestBidder: bid.user })`, unconditional, no concurrency check. Two concurrent M-Pesa payment confirmations for two different bids on the same car could result in the lower bid's callback executing last and overwriting the car's recorded highest bid - both bids would show `status: "paid"`, but only one (not necessarily the higher one) would end up reflected as the car's actual winning bid.

**Fixed this phase**, applying the same proven pattern already validated in bidController.js, adapted for this context: the update is conditioned on `current_bid <= bid.amount` (not exact-match, since callback-time confirmations can arrive in any order and the goal here is "never let the recorded highest bid move backwards," not "reject if anything changed since I last read"). If the conditional update affects zero rows (a higher bid was already recorded), the bid's payment is still correctly marked "paid" - the buyer isn't charged incorrectly - but the car's current-bid state can never regress below an already-confirmed higher bid.

---

## 2. A Related Finding, Flagged Not Fixed: `auctions` Table Reference

While fixing the race condition above, found the same code block queries `findOne("auctions", { carId, status: "pending_payment" })`. Per Phase 5's already-established finding, no `auctions` table exists in the real schema - auction state is denormalized directly onto `cars`. This means the subsequent `update("auctions", ...)` branch is presently unreachable against a real database. Not fixed this phase - it's the same category of schema-reconciliation issue already tracked in this program's documentation (`phase-05-schema-correction.md`, `phase-06-field-alias-fix.md`), and fixing it in isolation here (rather than as part of a systematic pass) risked missing related instances of the same pattern elsewhere in the codebase.

---

## 3. The Open Decision: `escrow_vaults` - Create the Table, or Consolidate?

Not decided this phase. Both options, named honestly:

**Option A - create `escrow_vaults` as a real table.** Preserves escrowVaultController.js's more sophisticated feature set (OTP-confirmed release, distinct webhook/admin/inspection flows) as the system going forward. Requires: a new migration; reconciling how this relates to the already-working `escrows` table (do both stay, serving different purposes? does `escrows` become legacy?); and - given this phase's own headline finding about fake transactions - real atomicity work for its multi-step operations, which was the original point of this phase and remains undone either way.

**Option B - consolidate `escrowVaultRoutes`/`escrowVaultController.js` onto the existing `escrows` table**, treating `EscrowVault` as the superseded system. Lower schema risk (no new table), but discards real, working feature logic (OTP release flow specifically has no equivalent in the simpler `escrows`-based flow) unless that logic is ported over first - itself a substantial piece of work, and higher-risk than it sounds given the same fake-transaction pattern would need addressing in whichever controller ends up authoritative.

**Recommendation, not a decision**: Option B is likely the smaller, safer path given this program's consistent preference for consolidation over parallel systems - but the OTP release flow is real, valuable functionality that would need to be ported deliberately, not silently dropped. This needs a decision from whoever owns the product direction, not an inference from code alone.

---

## 4. What This Phase Deliberately Did Not Do

- Did not create the `escrow_vaults` table or attempt to consolidate the two escrow systems - a product decision, not a technical one this phase should make unilaterally (Section 3).
- Did not build RPC-based real transactions for `bidController.js`, `reviewController.js`, or `favoriteController.js`'s remaining fake-transaction usage - the one confirmed, concrete, financially-relevant race condition (bid confirmation) was fixed with a smaller, targeted optimistic-concurrency approach instead, matching the pattern this codebase already uses successfully elsewhere. `reviewController.js`/`favoriteController.js` were not reached this phase - lower financial stakes than bids/escrow, not yet investigated for their own specific risk profile.
- Did not fix the `auctions` table reference found in Section 2 - flagged for the broader schema-reconciliation work already tracked elsewhere.
- Did not attempt any live verification - no reachable database anywhere in this program's environment, the standing constraint restated at every phase.

---

## 5. Verification Run This Phase

| Check | Result |
|---|---|
| Backend syntax validation (node --check, all files) | 0 errors |
| Backend unit test suite (npm test, Jest) | 216/216 passing - confirms no regression |
| Frontend | Untouched this phase - not re-run, no changes to verify |
| Live verification | Not possible - standing constraint |

PHASE 8 STATUS: PARTIAL, WITH A CHANGED SCOPE. The original goal (real transaction safety for escrow) could not be pursued as planned once the underlying table was found not to exist - documenting that finding accurately is this phase's most important output. One real, concrete race-condition bug (in the actual production M-Pesa bid-confirmation path, not just the mock path a prior session already covered) was found and fixed using a proven, low-risk pattern already validated elsewhere in this codebase.
