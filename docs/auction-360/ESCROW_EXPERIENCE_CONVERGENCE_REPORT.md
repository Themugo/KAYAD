# KAYAD Escrow — Experience Convergence Report (2026-10-09)

Companion to `ESCROW_PRODUCT_DISCOVERY.md` (written before any implementation). Evidence is in `evidence/escrow/`.

## 1. Executive summary and verdict

**Verdict: CONVERGED in code and tests; NOT certified for live money.** The escrow engine was not rebuilt. Discovery found a working state machine, ledger, RLS and permission model, but a product on top of it that did not match it: the bank-funding path could never succeed, the delivered auto-release cron never ran, ordinary participants could read the counterparty's full user row, the UI ran on a different (mock) model, and public pages made regulatory and insurance claims the repository cannot support.

What changed:
- **Six proven backend defects fixed** (custody binding, cron column, counterparty data leak, request-release guard + global broadcast, retired `held` status, seller-capability gate on the auction path) plus **purchase eligibility frozen at initiation**.
- **A viewer-specific projection** (`escrowViewModel.js`): the server tells each viewer their role, the actions they may take, and only the fields they may see. The frontend renders that; it does not re-derive policy.
- **Three audiences, three surfaces**: public explainer (with a new public `GET /api/escrow/program`), a participant desk (buyer/seller), and a staff operations desk.
- **Unsupported claims removed** (CBK licence, "100% protection", money-back guarantee, insured transport, multi-signature, "bank vault") and a static test now forbids them.
- Tests: backend 771→**937** (62 suites), frontend 480→**508**, validators **164/10 = baseline**, tsc 0, build 0, browser journey 33/33 (mocked HTTP).

Not done and not claimed: live Supabase/RLS, Redis, M-Pesa, webhook runs (ENVIRONMENT-BLOCKED); any business decision (section 17).

## 2. Architecture and verified lifecycle
States: `pending → funded → vehicle_confirmed → delivered → released → closed`; branch `disputed → refunded | released`; `released → disputed` admin only; system auto-release from `funded`/`vehicle_confirmed` after `autoReleaseEligibleAt`; `refunded`/`closed` terminal. All transitions go through `kayad_transition_escrow_atomic` (SECURITY DEFINER, row lock, `lastActionKey` idempotency, role matrix).
Money: release posts seller settlement + commission ledger entries; refund approval only reclassifies the ledger and queues a refund; money leaves via `kayad_complete_escrow_refund_atomic` with an external reference; payout is a separate staff B2C action; **`closed` proves neither**. The UI wording reflects this ("released for settlement", never "paid").
Two funding models exist (bank transfer via `verify-funding`; M-Pesa purchase settlement creating a `funded` escrow directly). Which is the real custody model is a business decision (section 17).

## 3. Design decisions
1. **Server is the authority; UI offers.** `availableActions` (party) and `staffActions` (staff) come from the same `validateTransition` the RPC uses, so a button exists only if the server would accept it. Staff capability flags mirror the middleware (`escrowStaffCapabilities`, with a test that compares it to the real middleware predicates).
2. **Truthful money language.** "Recorded as held by KAYAD", never "vault/locked/secured". Funding is "verified by KAYAD", not "received" on payment start. Released ≠ paid. Closed ≠ settled.
3. **No fake numbers.** Loading → skeleton; error → alert with retry; empty → explanation. No "KES 0" for any of those. Participant totals are labelled as covering only your deals; platform totals appear only to staff and are labelled platform-wide.
4. **Conflicts are handled, not hidden.** A 409 shows "this deal changed" and refetches.
5. **Dialogs, not instant clicks**, for every consequential action; dispute and refund/close require ≥10-character reasons.
6. **No client idempotency header.** The server derives deterministic per-escrow keys, and CORS does not allow a custom header; sending one would break requests.

## 4. Public experience (visitors)
Data: only `GET /api/escrow/program` → `{enabled, fundingMethods, releaseDays, minimumAmount, maximumAmount, currency}`, cached 60 s, no deal/balance/account data.
Shows: whether escrow is on/paused/unknown (an outage says "we can't tell", not "off"), the honest step list, and a **"what escrow does not promise"** section (not insurance, not an automatic refund, no inspection implied, no ownership transfer, no licence claim). Component: `PublicEscrowExplainer`, `HowDealsStart`. No auth request is made.

## 5. Buyer experience
`ParticipantEscrowDesk` (tab "My escrow deals"). Scoped summary (deals, held in *your* deals, awaiting funding, need your action), filters, deal list with "needs your action", detail with a role-aware story (`storyFor`), timeline, facts, on-demand funding instructions with copy-able reference, server-listed actions (accept vehicle, ask for release, dispute), dispute panel with evidence list and upload. Deep link `?escrowId=` kept; an unknown id shows a notice and does **not** fall back to another deal.

## 6. Private seller experience
Same desk, seller role: sees commission and net amount (hidden from buyers), "confirm delivery" only when the server lists it, and the released/paid distinction ("payout is processed separately"). Seller *eligibility* is untouched (section 11).

## 7. Dealer / organisation experience
Dealers use the same participant desk keyed to their own user id. **GAP (not fixed): dealer team members cannot see or act on escrows** — access is a user-id comparison only. The empty state says so. Dealer dashboard stats now count real held statuses (the `held` status fix). Org-level views need a business decision on who in a team may act on money.

## 8. Admin / staff experience
`EscrowOperationsDesk` (tab "Operations", offered only to admin/superadmin/escrow_officer/accounts; the API enforces regardless). Queues from `/operations/dashboard` plus the pending queue; platform totals labelled; case view with history and `staffActions`: verify funding (reference), release, approve refund (reason), record refund paid (provider reference + cash account), start payout, close (reason); reconciliation and anomaly scan gated by `operator.can`. The legacy mock admin screens (`AdminPage` contracts) are still mock — see section 17.

## 9. Exact data and actions per audience
| Audience | Data returned | Actions | Enforced by |
|---|---|---|---|
| Public | programme flags and limits | none | route has no auth; response is a fixed object |
| Buyer | own deals; counterparty = `{id,name}`; no commission; evidence without urls | view funding instructions, accept vehicle, ask for release, dispute | party check + `validateTransition` + RPC role matrix |
| Seller | own deals; buyer `{id,name}`; commission + net | confirm delivery, dispute | same |
| Staff | queues, case, `staffActions`, platform totals | per `operator.can` | `escrow*Only` middleware + RPC |
Shared: the model/timeline/story components. Separate: data shape, actions, metrics.

## 10. Metrics and sources
- Participant `summary` (`scope:"participant"`) — `summarizeForViewer(rows)` over the viewer's own rows.
- Staff `totals` (`scope:"platform"`) — aggregate over funded/vehicle_confirmed/delivered/disputed.
- All numbers say what they are and where they come from ("KAYAD's escrow records. Not a bank balance."). No global totals reach ordinary users.

## 11. Seller eligibility
Authority unchanged: `computeEffectiveEscrowEnabled` / `getEffectiveEscrowForCar` and migration `20261008120000`. No policy was copied into the frontend. Two narrow, evidenced fixes were made *to call that authority where it was bypassed*: the auction path (`createOptionalEscrowForOutcome` now returns 409 `ESCROW_NOT_ELIGIBLE` unless eligible) and purchase initiation (decision frozen into `payments.metadata.escrowEligible`, honoured by the settlement RPC; legacy payments without the key keep the legacy behaviour). Both tested and revert-proved.

## 12. Files changed (vs the previous delivered ZIP; list in `evidence/escrow/changed_files.txt`)
Backend: `escrowController`, `escrowOperationsController`, `operationsController`, `escrowRoutes` (+`/program`), `adminRoutes`, `dealerRoutes`, `auctionSettlement.service`, `escrow.service`, `escrowConfiguration.service`, `escrowCron`, `paymentService`, `reconciliationService`, `utils/escrowAccess`, new `utils/escrowViewModel`, `openapi.yaml`; migration `20261009130000_escrow_custody_binding_and_purchase_eligibility.sql`.
Frontend: rewritten `services/escrowApi.ts`, `features/EscrowView.tsx`; new `features/escrow/{escrowModel,ActionDialog,PublicEscrowExplainer,ParticipantEscrowDesk,EscrowOperationsDesk}`; `App.tsx` (operations tab + `onNavigate`); claim fixes in 13 files; removed orphan `components/escrow/EscrowPage.tsx`; validator `validate-dispute-canonical-lifecycle.mjs` repointed at the new surface.
Tests: 7 new backend files, `escrowClaims.test.ts`, rewritten `EscrowView.test.tsx` and `escrowDeepLink.test.tsx`.

## 13. Backend / DB / API / RLS / financial changes
- **Custody binding (G1).** `kayad_verify_escrow_funding_atomic` bound `custodian_account` from nothing → always failed "Escrow has no configured custodian account". Now binds the active primary account if unset; creation also binds via `resolveEscrowCustody` (enforcing admin `escrow_rules` min/max, which were never enforced).
- **Purchase decision.** `kayad_settle_purchase_payment_atomic` honours `metadata.escrowEligible` when present.
- **Cron.** Filtered on non-existent `deliveryConfirmedAt` → delivered auto-release/warnings never ran; now `deliveredAt`. Global `escrowReleased` broadcast replaced by per-party rooms.
- **Privacy.** `/my` and `/:id` returned the counterparty's whole `users` row; now restricted populates + projection.
- **request-release.** No state guard and a global socket broadcast; now 409 unless delivered-or-accepted state, alert to the `admins` room.
- **`held` status.** Not a real status, yet counted in admin stats, operations stats, dealer dashboard and reconciliation `detectUnreleasedEscrows`; fixed in all but `compareEscrowBalances` (deferred).
- **API additions:** `GET /api/escrow/program` (public); dashboard `totals`/`operator.can`; case `staffActions`; `/my` returns `summary`. No RLS policy changed; RLS and admin-authz tests untouched and passing.
- **Ledger/money logic untouched.**

## 14. Tests and results
- Backend Jest: **62 suites / 937 tests pass** (`evidence/escrow/backend_jest_summary.txt`).
- Frontend Vitest: **66 files / 508 pass, 1 skipped**; `tsc --noEmit` 0; `npm run build` 0.
- Validators: **164 pass / 10 fail** (`validators.log`).
- Browser (Playwright, **mocked HTTP**, desktop 1280 and mobile 390): **33/33** — visitor makes no deal/ops requests, no unsupported claims, no horizontal scroll; buyer accept-vehicle flow (dialog focus in, Escape returns focus, POST then refetch); error and empty states show no "KES 0"; staff totals labelled and only server actions offered; reduced-motion shows no infinite animation; arrow-key tab navigation.
- DB: schema-contract PostgreSQL (`auto_chain`) proofs: `g1_proof.sql` (fails pre-fix), `custody_fixed_proof.sql`, `purchase_eligibility_proof.sql`.

## 15. Baseline vs regressions
| | Before | After |
|---|---|---|
| Backend tests | 771 / 55 suites | 937 / 62 |
| Frontend tests | 480 + 1 skip | 508 + 1 skip |
| Validators | 164 / 10 | 164 / 10 |
| tsc / build | 0 / 0 | 0 / 0 |
Intermediate regressions caught and fixed: two validators (`wave3-convergence`, `release`) failed because the new `/program` route was undocumented in OpenAPI → documented; `dispute-canonical-lifecycle` pointed at the old screen → repointed (and evidence upload is now genuinely wired: the dispute id *is* the escrow id). The 10 remaining failures are pre-existing/environmental (Docker, Node ≥22.22.2, missing Supabase env/provider credentials, stale checks such as `validate-escrow-custody-domain` expecting a string removed by the earlier capability work, hero assets, lead-CRM wrappers, BID_CONFIRMED event). `docs/ADVANCED_ROUTE_SECURITY_MATRIX.json` is already stale vs the router (regenerating produced a 2,000-line unrelated diff) — left untouched.

## 16. Revert-proof (`evidence/escrow/revert_proof.txt`)
Each consequential change was reverted, the targeted tests failed, then it was restored and they passed: cron column (2 fail), request-release guard (6 fail), restricted populate (1 fail), auction capability gate (5 fail), purchase-eligibility freeze (5 fail), admins-only alert (2 fail); frontend: re-introduced CBK claim (2 fail), operations tab for non-staff (2 fail), silent deep-link fallback (1 fail), commission shown to buyer (1 fail). DB functions: old definitions reproduce the custodian error and wrong `frozen=false → escrow` decision; reapplied migration fixes both.

## 17. Gaps, business decisions, environment-blocked
**Business decisions, deliberately not made:** (1) real custody model — bank transfer vs the M-Pesa path that actually runs; nothing in the repo proves a regulated/trust account, so no such claim is made; (2) auction escrow creation is currently unreachable (`paymentStatus=paid` required while escrow payment paths are refused) — relax vs M-Pesa-first; (3) which auto-release clock governs (DB 3 days from funding, cron 7 days from creation, STK RPC hard-coded 3 days); (4) dealer team access; (5) counterparty contact visibility; (6) moderator/escrow_officer authority; (7) whether `closed` must require payout/refund completion; (8) release from `delivered` without buyer confirmation; (9) fee schedule (commission default 5%, from `platform_config`).
**ENVIRONMENT-BLOCKED / PARTIAL (not certified):** live Supabase/RLS execution, Redis, M-Pesa STK/B2C and callbacks/webhooks, real email/SMS; browser journeys used mocked HTTP.
**Known gaps:** the "Escrow Vault" product name remains in nav/footer/some labels (a naming decision; no claim attached); `AdminPage` escrow screens are mock data; `compareEscrowBalances` still counts `held`; `dealerRoutes` `PUT /settlement` shadows the imported `update` with a local const (out of scope, noted); no UI starts a purchase payment; orphan components `PaymentModal`, `SecureEscrowHub`, `EscrowTimeline` are unmounted; client-only `liveMode` flag in localStorage is non-authoritative; the DB trusts the `p_role` string (the app is the real gate).

## 18. Remaining work, ranked by financial risk
1. Decide and document the custody model; until then keep customer copy as it is now.
2. Run the escrow suite and RPC proofs against a real Supabase with RLS, and an M-Pesa sandbox end to end (funding, callback replay, refund completion, payout failure).
3. Unify the three auto-release clocks.
4. Resolve the auction escrow-creation reachability.
5. Make `closed` require verified payout/refund completion (or rename it).
6. Finish `compareEscrowBalances` and add reconciliation for payouts.
7. Dealer team authorisation.
8. Replace mock admin escrow screens; decide the "Vault" naming.
