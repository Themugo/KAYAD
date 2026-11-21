# KAYARD KE - Post-Alignment Implementation and Verification Report

Date: 2026-11-21 · Base: `main` @ 6eb7c98 (working tree `/home/claude/align/remote`, **uncommitted, unpushed, not deployed**)

**Release readiness: NOT CLAIMED.** Critical issues remain open (section 9). Nothing was committed, pushed, deployed or applied to a hosted database. No hosted write or production migration was made; the hosted project was read with catalog `SELECT`s only.

Status vocabulary: **VERIFIED** (executed, evidence cited) · **FAILED** (executed, still failing) · **BLOCKED** (cannot be executed here; reason stated) · **NOT TESTED** (not executed).

## 1. Result at a glance

| # | Mandate item | Result |
|---|---|---|
| 1 | Unified personal account | **VERIFIED** locally (API, DB, capabilities, legacy preservation); browser dashboard flows covered by component tests only |
| 2 | Registration idempotency | **VERIFIED**: 14 backend tests, 21/21 real-API checks incl. 8-way concurrency, 3 frontend retry tests, browser lost-response journey |
| 3 | Test and validator reconciliation | **VERIFIED** for 111 of 114 baseline failures; **3 validators BLOCKED/FAILED** (environment/tooling). Individual register delivered |
| 4 | Mobile hero clipping | **VERIFIED** at 7 viewport sizes; regression test added |
| 5 | Hosted DB (assessment only) | **BLOCKED** from readiness: report delivered; 42 absent / 11 partial / 15 present / 11 unknowable of 79 |
| 6 | Critical journeys | Executed on a migrated local stack. **1 real defect fixed (offers), 2 real defects found and left open (escrow dashboard 500, accepted offer not bound to payment)**; escrow funding, settlement and inspection completion **NOT TESTED / BLOCKED** |
| 7 | Engineering restrictions | Honoured (section 8) |
| 8 | This report | Delivered |

## 2. Files changed (all traceable, all uncommitted)

**Registration idempotency (item 2)**
* `backend/controllers/authController.js` - idempotency helpers, replay context/response, race (23505) fallback, extracted message/payload builders
* `backend/server.js` - CORS `allowedHeaders` includes `Idempotency-Key`
* `backend/tests/registrationFlow.e2e.test.js` - 14 tests (6 new idempotency tests)
* `src/services/authApi.ts`, `src/context/AuthContext.tsx`, `src/components/OnboardingFlow.tsx` - key generated once per form attempt and reused on retry; honest "we could not confirm" copy
* `src/__tests__/onboarding/OnboardingFlow.test.tsx` - 3 retry tests replace the old test that falsely claimed the first request reached the server

**Hero clipping (item 4)**
* `src/components/home/premium-hero.css` - `height: auto` on the mobile `:has(.kk-hero__shortcuts) .kk-hero__inner` rule
* `src/__tests__/home/PremiumHeroMobileLayout.test.ts` (new)

**Defects fixed (items 3, 6)**
* `supabase/migrations/20261121090000_offer_action_replay_lookup_fix.sql` (new) and `scripts/validate-offer-action-function-columns.mjs` (new)
* `src/pages/admin/AdManager.jsx`, `src/pages/admin/AdminPrivateSellerApplications.tsx` - nested `<main>` removed (AdminLayout already provides it)
* `docs/production/DISASTER_RECOVERY.md`, `docs/handover/API_VALIDATION_GAP_REGISTER_20261109.csv` - restored from `84c7cb3^` (deleted by the consolidation commit)
* `backend/jest.config.js` - ignore `tests/node/` (those are `node:test` files that `npm run test:node` already runs)

**Tests reconciled** - frontend: `DashboardHub{DealershipEntry,PersonalOverview,Staff,UnifiedAccount}`, `Phase13iPersonalAccountStates`, `PageJourneyNavigationPersonal`, `VehicleMarketplace`, `BuyerNegotiationsPanel` (one test added), `AdminPrivateSellerApplications`; backend: `personalListingPhotoRemoval`, `auctionEngagement`, `dealerCompanyNameRule`, `healthRouteComposition`.

**Validators reconciled (35 modified, 1 added)** - see `FAILURE-REGISTER-20261121.md` for each one and its reason.

`src/components/DashboardHub.tsx` is **unchanged** relative to `main` (an interim edit was reverted, section 7).

Evidence and scripts: `evidence/journeys/*` (API journeys), `evidence/browser/*` (hero sizes, registration journeys, screenshots), `evidence/final-run/*` (final suite logs), `evidence/mig-status.tsv`, `evidence/recon-*.txt`.

## 3. Decisions and how they were implemented

### 3.1 Unified personal account (item 1)
* New personal registrations are stored with role `user`; buying and selling are capabilities of that one account. `GET /api/account/capabilities` returns `personal.buying.granted` and `personal.selling.granted` for a plain `user`, with the old `buyer` and `privateSeller` blocks marked `deprecated` and `replacedBy` the personal ones.
* A legacy self-registration request for `individual_seller` is stored as `user` and answered with a deprecation header and a compatibility note. **No new `individual_seller` rows are created** (checked in the database).
* **Legacy records are preserved**: a user row with role `individual_seller` still logs in, still resolves via `/auth/me` with its stored role, maps onto the unified capabilities, and can still publish a listing. The database `users_role_check` and the register RPC still accept the legacy value, deliberately.
* Dealer registration stays separate: role `dealer`, business identity, status pending. No second personal auth system was created.
* Evidence: `j1`, `j7`, `j9`, `j10`. Unit/component coverage by the reconciled dashboard tests.

### 3.2 Registration idempotency (item 2)
* The canonical endpoint `POST /api/v1/auth/register` is kept. The client creates a random `Idempotency-Key` per form attempt and **reuses it for every retry of that attempt**; it is not generated per request and it is never persisted beyond the form.
* The server derives the registration verification token as `HMAC(JWT_SECRET, "kayad-registration-v1" + key + email + role + password)` and stores only its hash. A retry with the same key and same data returns `200 {replayed:true}` with the same user and creates nothing; any other attempt for an existing email returns 409; a unique-violation race falls back to the same replay lookup. Replay never applies to a verified account. This is a secure replacement for the Oct-27 mechanism, not a restoration of it.
* The UI no longer claims the first request reached the server. After a lost response it says "We couldn't confirm that went through", keeps the form, and retries with the same key.
* Evidence (all VERIFIED): `registrationFlow.e2e.test.js` 14/14; `j1_registration_idempotency.mjs` **21/21** against a real backend and database (replay, case-insensitive email, different key 409, different password 409, malformed key ignored, verified-account no-replay, **8 concurrent same-key requests -> 1 user**, 6 concurrent different keys -> exactly 1 created, role-escalation attempts rejected, owner email reserved, no secrets in the response, stored token is a 64-hex hash, no-CSRF 403); browser journey: lost response then retry used the **same key twice**, **1 user** (`evidence/browser/browser-register-journeys.json`).
* Test harness note: the owner-email check needs `WEBHOIST_EMAIL` set; without it the owner list is empty and the check cannot fire. This is configuration, not a defect (re-run with it set: pass).
* Not covered: browser scenario 4 (CSRF bootstrap unreachable) was **INCONCLUSIVE** because the cookie was already set; it is **NOT TESTED**.

### 3.3 Hero clipping (item 4)
* Root cause: in the mobile composition (`max-width: 1023.98px`, `:has(.kk-hero__shortcuts)`) the hero inner grid carried a fixed height from the layered legacy hero rules in `premium-hero.css`, so content taller than that height was clipped. Fix: `height: auto` in that one rule. No markup, copy, carousel, shortcut, category or branding change.
* Evidence (VERIFIED, fresh production build): at 360, 390, 430, 600, 820, 1024 and 1440 px the stage is not clipped (`stageClipped: false`), the caption is fully visible, there is no horizontal overflow, and the category chips start immediately under the hero. The 390 px screenshot shows the headline, four-shortcut rail, vehicle, "illustrative" caption, carousel controls and category strip intact (`evidence/browser/home-390.png`). A regression test pins the CSS rule.
* Observation, not changed: against the approved reference, the mobile build shows a search row and Filters button under the category strip where the reference shows "View all vehicles", and the teal accent bar under the headline is not visible at 390 px. These pre-date this phase and are outside "fix the clipping without redesign"; flagged for design review (NOT TESTED against owner intent). The top notice bar text is truncated by its "Pause notices" control; also pre-existing.

### 3.4 Test and validator reconciliation (item 3)
See `FAILURE-REGISTER-20261121.md` (114 rows). Summary of classifications: 2 real product defects, 2 tooling defects, 1 derived, 2 environment limitations (tests), 3 validators environment-blocked, remainder stale/obsolete assertions reconciled to current approved behaviour. Assertions were replaced by equal or stronger checks, never deleted.

## 4. Tests before and after

| Suite | Before (baseline `main`) | After (this working tree) | Status |
|---|---|---|---|
| TypeScript `tsc --noEmit` | not recorded as failing | exit 0 | VERIFIED |
| Production build | not recorded as failing | exit 0 | VERIFIED |
| Frontend vitest | 1753 tests, **69 failed**, 24 failing files | 1753 tests, **0 failed**, 1752 passed, 1 skipped; 590 suites, 0 failed | VERIFIED |
| Backend jest | 4133 tests, **5 failed**, 4 suites failed (incl. 1 that cannot run) | 4140 tests, **0 failed**, 4119 passed, 21 skipped; 245 suites passed, 1 skipped | VERIFIED |
| Backend vitest | 61 tests, **1 failed** | 61 passed, 11 files | VERIFIED |
| Backend `node:test` | not separately recorded at baseline (jest tried to collect one of the files and failed) | 13 pass, 0 fail | VERIFIED |
| Validators | 353 validators, **38 failed** | 354 validators (one new), **351 pass, 3 fail** | 3 FAILED/BLOCKED |
| Registration API checks | n/a | 21/21 | VERIFIED |

The three remaining validator failures: `live-runtime` (needs `SUPABASE_URL` and a service key - BLOCKED), `communications-provider-certification` (needs real email/SMS provider credentials - BLOCKED), `local-supabase` (**FAILED**: the installed Supabase CLI 3.2.0 rejects `[inbucket]` in `supabase/config.toml` - "Use local_smtp instead"; the repo does not pin a CLI version; Docker is also unavailable here). `local-supabase` is a genuine tooling defect that is **not fixed**: renaming the section would break older CLIs, so the right fix is a pinned CLI version, which needs a team decision.

## 5. Database readiness (item 5)
Full report: `HOSTED-DATABASE-MIGRATION-RECONCILIATION-20261121.md`. Headlines: hosted history ends at 20260922060457; 79 migrations follow (80 with this phase's corrective one); by object presence **42 ABSENT, 11 PARTIAL, 15 PRESENT, 11 NO-OBJECTS (unknowable)**; some later migrations are present while earlier ones are absent (out-of-band application); 17 functions are redefined by several migrations so presence does not prove the right revision. Locally, the repo chain applied from empty with 0 failures and all 79 re-applied twice cleanly. **Database readiness: BLOCKED** until a staging copy is diffed at definition level, data pre-checks run, rollback rehearsed and written authorisation given. Nothing was applied to hosted.

## 6. Critical journeys (item 6) - local migrated stack, real HTTP, real database

Environment: PostgreSQL 16 with the full migration chain plus the corrective migration, PostgREST, Redis, the real backend. The M-Pesa, email, SMS and Cloudinary providers are not reachable, so anything beyond them is BLOCKED.

| Journey | What was exercised | Result |
|---|---|---|
| Personal buyer/seller | register, verify, login, `/auth/me`, capabilities | **VERIFIED** (j1, j9) |
| Legacy personal seller | login, me, capabilities, publish | **VERIFIED** (j10) |
| Personal listing | create (multipart, 1 image) by a `user`; owner stored as that user; role unchanged | **VERIFIED** (j3) |
| Listing publication and moderation | personal listings publish immediately (matches product copy "no administrator approval"); public list shows them; non-staff and the listing owner cannot moderate (403) | **VERIFIED**. Note: an `admin` cannot approve/hide - `DECISION_AUTHORITY_REQUIRED` because decisions are owner-only under the local default policy (by design; hosted value **NOT READ**; whether another staff takedown path exists is **NOT TESTED**) |
| Enquiry | buyer starts a chat on the listing (creates the lead); seller cannot chat with self | **VERIFIED** (j3) |
| Offers and negotiation | unrelated user 403; negative amount 400; submit; retry with same key creates no second offer; seller sees it; buyer cannot accept own offer; seller counters; seller cannot accept own counter; outsider 403; buyer accepts; accept retry idempotent; re-accept does not double-apply | **VERIFIED after fix (14/14)**. **Before the fix every submit failed with HTTP 400 `column "actor_id" does not exist`** (section 7) |
| Accepted offer -> payment | accepted a 2,700,000 counter on a 2,800,000 listing, then initiated purchase at 2,700,000 | **FAILED (real gap GAP-OFFER-TXN)**: payment initiation answers 400 "Amount does not match the server-determined amount for this vehicle". No code outside the offer service reads `marketplace_offers`; accepting an offer changes nothing the payment or escrow path uses (no escrow row exists afterwards) |
| Payment boundaries | anonymous 401; own listing 403; failed initiate creates no escrow; M-Pesa callback rejected for non-Safaricom source when `MPESA_ENV=production` (200 + `ResultCode 1 Rejected`); under the local sandbox allowlist 127.0.0.1 is accepted (environment) | **VERIFIED** (j5, j6) |
| Escrow boundaries | buyer 403 on staff escrow list and operations; buyer cannot release or reconcile; buyer reads own escrows | **VERIFIED** (j5) |
| Escrow funding, vehicle confirmation, release, refund, payout | needs a funded escrow (M-Pesa) | **BLOCKED** |
| Transaction lifecycle / settlement / auction settlement | needs funded escrow or auction fixtures and provider | **NOT TESTED** here (unit/regression suites pass: see section 4) |
| Escrow operations dashboard (staff) | `escrow_officer` and `accounts` request `/api/escrow/operations/dashboard` | **FAILED (real defect GAP-ESC-OPS)**: HTTP 500 `'issue_details' is not an embedded resource` |
| Inspection | public provider search; anonymous booking 401; booking with a bad provider is a clean 400; list own bookings; non-owner blocked from provider dashboard | **VERIFIED** for these boundaries. Booking creation with a real provider, slots, payment and completion/report: **NOT TESTED** (needs provider fixtures and payment) |
| Dealer registration | register `dealer` + business fields -> 201, role dealer, status pending; personal user blocked from dealer dashboard; pending dealer with no documents is told "Dealer verification required" (matches the copy: publishing follows document submission) | **VERIFIED**. Document submission, approval and dealer workspace/inventory: **NOT TESTED** |
| Admin and staff permissions | personal user and anonymous blocked from admin dashboard, users, staff, maintenance, analytics; `moderator`, `technical_support`, `marketing` have no escrow operations; no staff role reaches maintenance or staff governance | **VERIFIED** (j5, j7) |

## 7. Defects and corrections

**Fixed**
* **Offer workflow unusable at database level.** `kayad_offer_action` filtered `marketplace_offers` by `actor_id`, a column that table lacks (`sender_id` is the actor column). Every submit/counter/accept/reject/withdraw failed. No automated test touched this function, which is why it escaped. Forward-only corrective migration, byte-identical except that line, privileges re-asserted; static guard added; end-to-end journey passes. Not applied to hosted.
* Nested `<main>` landmarks in two admin pages; deleted disaster-recovery runbook and write-route coverage register restored; jest collecting `node:test` files.

**Corrections to my own work in this phase (honest record)**
1. I first classified the Buying "Enquiries & offers you sent" section as a regression removed in the Nov-19 consolidation and **restored it**. That was wrong: Buying already renders `BuyerNegotiationsPanel` from the same `myNegotiations` data, and validator `personal-dashboard-coherence-03c` ("not rendered twice or fetched twice") records the deliberate de-duplication. Restoring it created a duplicate render and a duplicate fetch. **Reverted**; `DashboardHub.tsx` is unchanged from `main`; the obsolete test was replaced by the Phase 3C contract and the failed-source check moved to `BuyerNegotiationsPanel.test.jsx`.
2. Removing the nested `<main>` in `AdminPrivateSellerApplications.tsx` broke its own page test, which had asserted the defective `main`; the test now asserts a labelled region and no nested `main`. This surfaced only in the final full run; an earlier "0 failures" frontend run pre-dated that edit.
3. Earlier I ran `git stash` by mistake while checking baselines and restored with `git stash pop` immediately (told to you at the time; nothing lost). I then avoided state-changing git commands.
4. I started a frontend test run while jest was running; jest was killed (exit 137, out of memory) and was re-run alone to a clean pass.

**Open (not fixed - need a decision or a review)**
* **GAP-ESC-OPS (real defect, FAILED).** `escrowOperationsController` (lines 45, 56), `financeController` (91, 240) and `reconciliationController` (52-68) filter `ReconciliationReport` on `"issueDetails.resolved"`. The table stores `issues` (jsonb, items carry `resolved`); the filter is translated to a PostgREST embedded resource and errors. Authorised escrow staff get 500 on the operations dashboard. Fix needs a JSONB containment filter and finance review because it feeds financial reporting; no reconciliation test covers it.
* **GAP-OFFER-TXN (real gap, FAILED).** An accepted negotiated price is not bound to payment or escrow. Needs a product/financial decision (how an agreed price is bound, expiry, who may change it). Not implemented to avoid altering financial controls without authorisation.
* **GAP-HERO-CTA.** Super Admin hero CTA labels are no longer rendered in the approved shortcut composition; the admin control is now inert for those labels. Design decision needed.
* **GAP-CLI.** `local-supabase` as above.
* **GAP-ORPHAN.** `DealerBusinessView` is not referenced by any route (found in the earlier audit; unchanged).
* **GAP-WRITE-ROUTE.** Validation coverage beyond the 76 registered write routes is **NOT TESTED**.
* **GAP-DBTEST.** There is no CI job that runs the migrated schema against HTTP journeys; the offer defect shows the cost. The journey scripts in `evidence/journeys` are the starting point.
* **GAP-GOV.** No `CLAUDE.md` / repository agent guidance.

## 8. Engineering restrictions
Current `main` architecture preserved; no older ZIP used; no newer approved work discarded; no duplicate implementation introduced (the one I introduced was reverted); no security or financial control weakened - tests were re-targeted, not relaxed, and the one financial-adjacent code path (offers) was only corrected; no force-push or reset; no deploy; no production migration; no hosted write; no commit or push. The only new migration is forward-only and local-verified.

## 9. Remaining blockers for any release claim
1. Hosted database: definition-level reconciliation on staging, constraint pre-checks, rollback rehearsal, written authorisation (section 5).
2. GAP-ESC-OPS (500 on escrow operations) and GAP-OFFER-TXN (negotiated price cannot be paid).
3. Provider-dependent journeys never executed: M-Pesa funding to release/refund/payout, auction settlement, inspection booking to completion, dealer document approval and workspace.
4. `live-runtime`, `communications-provider-certification` and `local-supabase` validators.
5. Hosted values for onboarding/decision-authority settings not read.

## 10. Recommended next phase
1. **Fix GAP-ESC-OPS** with a JSONB containment filter and a DB-backed test; finance review.
2. **Decide and implement the accepted-offer-to-payment binding** (GAP-OFFER-TXN) with explicit financial-controls sign-off.
3. **Stand up a staging project from a hosted backup** and execute the section 8 gate of the migration report; wire `evidence/journeys` into a CI job on a disposable Postgres.
4. Provision sandbox M-Pesa/email/SMS credentials on staging and run the blocked journeys and validators.
5. Pin the Supabase CLI version and fix `config.toml`; resolve GAP-HERO-CTA and the mobile design observations with the owner.
6. Commit the reviewed working tree only after explicit authorisation.
