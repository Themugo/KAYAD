# KAYAD Stage 5F.10 — Execution report
Admin governance + private-seller + buyer convergence + auction verification / custody integration

Date: 2026-10-20 (Africa/Nairobi) · Node 22.22.2 · Environment treated as UNKNOWN / production-sensitive.

## FINAL STATUS: PARTIAL — DEFECTS REMAIN

What that means, precisely:

* **Verified locally and passing:** the database gate and every start/bid/settlement path (227 SQL checks including two-session races), the proposal/custody/admin API (46 HTTP checks), the seller and admin UI (23 browser checks), the merged 5F.5 admin governance (88 API + 27 browser checks), and the full regression of both inputs' suites (frontend 716, backend jest 2,460, 0 failures).
* **Why not "FULLY VERIFIED LOCALLY":** a few completeness gaps remain that I did not close (list below, L-2, L-4, L-5, L-10). None of them can let an ineligible vehicle be started or bid on — that is enforced in PostgreSQL — but the seller cannot yet start the inspection-fee payment or upload evidence files from the new section, and a few secondary list pages are not individually gated.
* **Not verified at all:** anything hosted (Supabase/Render/Vercel), live M-Pesa/SMS/e-mail providers, real devices. The migration is a **candidate, not applied anywhere**.

## 1. Inputs
Both ZIPs matched their SHA-256 and were left untouched (see `KAYAD_STAGE5F10_INPUT_VERIFICATION.md`).
* 5F.9 `4aa39fb76bbf598a266953b47f8c08eb7cd99ff41fb6bac7aa9e82d16bfd737d`
* 5F.5 `a6796fa6fd0fa12419358ebf2baa9a36764c5666c9ca7b54e2a2d36eb4427d1b`

## 2. What was merged and what was retained
A three-way comparison against the 5F.4 base found **no file changed on both sides**, so the merge is lossless: the 5F.9 tree plus the 5F.5 admin-governance changes (9 modified files, 16 added). All 5F.5 fixes D-1…D-17 and the open owner decisions OD-1…OD-7 are retained untouched. Nothing was removed — no feature, report, migration or test. Duplicate report names were kept side by side (`reports/stage5f5-claude-admin-governance/`). Details: `KAYAD_STAGE5F10_SOURCE_DIFF_AND_MERGE_LEDGER.md`.

## 3. What was built

**Database** (`20261020170000_private_seller_auction_gate_enforcement.sql`, with a non-destructive rollback)
* One eligibility definition, `kayad_private_seller_gate`, evaluated inside `kayad_place_bid_atomic`, `kayad_auto_bid_atomic`, `kayad_start_auction_atomic`, `kayad_start_scheduled_auction_atomic` and `kayad_settle_bid_payment_atomic`, after the car row lock, with the proposal and custody-capability rows locked `FOR SHARE`; backstop triggers on `cars` (live / bid-state / owner changes) and `auction_setups` (publication).
* Only three writers of case state (`kayad_psap_create`, `kayad_psap_apply_event`, `kayad_vcc_apply`): actor capacity is verified in the database, every call is idempotent by key, audit rows are append-only, direct writes (even by `service_role`) are refused. RLS gives sellers and assigned partners read-only access to their own rows.
* Constraints: one open proposal per car; `in_custody`, `approved` and `passed` each require their evidence columns.

**Backend**
* Eligibility service now asks the database (fail-closed: 503 when it cannot be evaluated; never "eligible by default").
* The gate's refusal is mapped to HTTP 409 on every atomic path; the bid pre-check runs **before** payment is initiated.
* Public exposure filtered: auction list / active / scheduled / detail / bid history / room, marketplace list and detail, sitemap, lead creation, ending-soon reminders.
* New API `/api/private-seller-auctions` (seller / provider / admin), capacity fixed by endpoint and re-verified by the database, mandatory `Idempotency-Key`, audit-logged.

**Frontend** (no second dashboard)
* "Auction verification" section inside the existing `PrivateSellerPlatform`: every state comes from the API; payment is shown as confirmed only if the server recorded it; failed/inconclusive/expired/rejected cases offer correction, reinspection and appeal.
* "Auctions" tab in the existing admin shell: queue, gate verdict with reasons, decisions (reason required for anything but approval), holds, custody assignment, capability approve/suspend/revoke.
* Buyer bid form states why bidding is paused (and that nothing was taken) instead of a generic failure.

## 4. Defects fixed (details in the register)
D-18 (5F.9 broke two bid suites) · D-19 (no proposal ⇒ eligible) · D-20 (gate not atomic, several paths ungated) · D-21 (unconstrained, mutable, unprotected tables) · D-22 (string-only validator) · D-23 (consumed booking re-usable after reinspection — found by the new tests) · D-24 (write-guard marker forgeable by `service_role` — found while hardening) · D-25 (**pre-existing:** every public auction detail returned 500; owner check in `getCar` always false) · D-26 (buyer saw generic bid failure) · D-27 (blocked auctions still public) · D-28 (paid bid could move a blocked auction's market) · D-29 (nav contrast).

## 5. Tests added
PG harness 227 · HTTP e2e 46 · browser 23 · jest 14 (eligibility service, proposal service) · vitest 9 (seller section 6, admin tab 3) · wiring validator 44. Six existing suites received a stub of the eligibility module; none of their assertions changed.

## 6. Exact results (final tree)
| Check | Exit | Result |
|---|---:|---|
| typecheck (= lint) | 0 | clean |
| build | 0 | ok |
| frontend vitest | 0 | 716 passed, 1 skipped (pre-existing), 0 failed |
| backend jest | 0 | 2,460 passed (148 suites), 0 failed |
| backend vitest / node:test | 0 / 0 | 36 / 1 passed |
| validators (11) | 0 | all pass |
| migration replay, empty disposable DB | 0 | 183 applied, 0 failed |
| 5F.10 PG / HTTP / UI | 0 / 0 / 0 | 227 / 46 / 23 passed, 0 failed |
| 5F.5 admin API / UI on merged tree | 0 / 0 | 88 / 27 passed, 0 failed |

Skipped: 1 (a pre-existing frontend test, also skipped in the baseline). Blocked: nothing hosted could be run. See `KAYAD_STAGE5F10_TEST_VERIFICATION_MATRIX.md` and `validation-logs/`.

One operational note: the first run of `test:node` hung when launched from a detached shell without redirected stdin; it passes in about a second when stdin is closed (`< /dev/null`) and in every other run. I could not reproduce the hang, so I treat it as a harness launch artefact, not a product result.

## 7. Is the atomic gate really enforced, and tested?
Yes, inside PostgreSQL, for manual bid, auto-bid, admin start, scheduled start, paid-bid settlement, setup publication and direct row writes. It is tested with two real database sessions in both orders (bid vs custody hold, vs capability suspension, vs verification invalidation): the later transaction waits for the row lock and is then rejected, or the earlier bid stands because it was legitimately accepted. A mutation check removed the locks and the trigger and the suite failed 11 checks, so the tests are not vacuous. Removing only the RPC-level locks still passes because the `cars` trigger takes the same lock — that redundancy is deliberate. Proven on a local disposable PostgreSQL 16 only; not on the hosted database.

## 8. Remaining gaps (not closed)
* **L-2** The seller section links a *paid* inspection booking; it does not start the fee payment or upload evidence files (it records document references).
* **L-4** List endpoints filter after paging (short pages; totals include hidden rows).
* **L-5** Admin tab takes partner/premises ids as text (no capability-list endpoint).
* **L-10** Recommendation / similar / favourites / saved-search / storefront lists are not individually gated (bids remain refused in the database).
* L-1, L-3, L-6, L-7, L-8, L-9 — see the register.

## 9. Decisions only the owner can make
OD-1…OD-7 (from 5F.5, unchanged and open) and OD-8…OD-16 (new): inspection pass criteria · inspection validity period · fee treatment after failed inspection / overturned appeal / refused custody (no refund rule was invented) · vehicle release conditions · what to do with an already-live auction that becomes blocked (currently: blocked and hidden, not cancelled) · who counts as a private seller (staff-, user- and unknown-owned are gated; dealers/brokers exempt) · whether anyone besides approved garages/dealers may hold vehicles · maker-checker for approvals · hosted migration window.

## 10. Safety statement
No commit, push, deploy, hosted migration, hosted database access, or live payment/e-mail/SMS provider call was made. All databases used were local disposable instances whose names end in `_disposable`; the harnesses refuse anything else.
