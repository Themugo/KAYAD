# KAYAD ESCROW — PRODUCT DISCOVERY (backend-first)

Date: 2026-10-09 · Method: read the real source, built the schema from all migrations into PostgreSQL 16 (`auto_chain`) and executed the financial functions. Historical reports were treated as claims to verify, not as evidence.

Classification key: **PASS** verified working · **PARTIAL** works with a stated limit · **GAP** missing/defective · **DUPLICATE** two sources of truth · **ENV-BLOCKED** needs live infrastructure (Supabase/RLS, Redis, M-Pesa, webhooks) that this environment does not have.

---

## 1. Verified architecture and sources of truth

| Concern | Source of truth | Verdict |
|---|---|---|
| Escrow state | `escrows.status` + CHECK `escrows_status_check`; transitions only through RPC `kayad_transition_escrow_atomic` (row lock `FOR UPDATE`, idempotency key `lastActionKey`, terminal-state refusal, role matrix, buyer/seller identity check, auto-release window check, ledger posting on release/refund) | PASS |
| JS state machine `services/escrowStateMachine.js` | Pre-check only. It is **not** called by `escrow.service.js` release/refund/dispute paths (they call the RPC directly); only `closeEscrow` and the unit tests use `validateTransition` | DUPLICATE (tolerable: DB is stricter; JS guard `deliveryConfirmed` is not enforced by the DB) |
| Money movement | `ledger_entries` via `kayad_post_ledger_entry_atomic` (idempotent by external reference); `payments`, `refunds`, `dealer_payouts` | PASS (live Postgres only; see §11) |
| Seller eligibility | `computeEffectiveEscrowEnabled({platformEscrowEnabled, sellerCapabilityStatus, carEscrowEnabled})` in `escrowCapability.service.js`; admin writes via `setSellerEscrowCapability` (revoke/suspend cascades `cars.escrow_enabled=false`); migration `20261008120000_escrow_seller_capability_authority.sql` | PASS as a function; **not applied at the live purchase or auction-escrow creation points** (§7) |
| Platform kill-switch | `platform_config.escrow_rules.enabled` (`getEscrowRules`) | PASS as data; GAP in enforcement (§7) |
| Custody accounts | `escrow_accounts` (admin-configured bank accounts) | PARTIAL — never bound to an escrow (§4) |
| Client "live mode" | `localStorage` key `kayad_escrow_rules_config_v1` (`escrowRulesConfig.ts`) | **DUPLICATE and non-authoritative**: per-browser, default `liveMode:false`; the backend never sees it. It governs only the "(Preview)" suffix on vehicle badges |
| Purchase/ownership companion | `purchase_outcomes` (+ `auction_outcomes` for auctions) fulfilment machine; ownership via `ownershipService.addVehicleToGarage` | PARTIAL (§5) |

Mount: `server.js` → `app.use("/api/escrow", idempotencyCheck, csrfProtection, escrowRoutes)`; every route except the 404 fallback uses `protect`.

## 2. Routes, services, tables, constraints, transitions

Routes (`backend/routes/escrowRoutes.js`, verified line by line):

| Route | Gate | Notes |
|---|---|---|
| `GET /my` | `protect` | party filter `buyer OR seller = user` |
| `GET /` | `escrowViewOnly` | admin queue, safe projection |
| `GET /:id`, `GET /:id/state` | `protect` + `canViewEscrow` (party or staff) | `/:id` returns raw populated rows (§9) |
| `POST /:id/confirm-vehicle` | `protect` + controller: buyer or `canActAsEscrowAdmin` | RPC role `buyer` |
| `POST /:id/confirm-delivery` | seller or admin | RPC role `seller` |
| `POST /:id/request-release` | buyer or admin | **no state guard**, history append only (§9) |
| `POST /:id/dispute` | party or `canViewAnyEscrow` | staff mapped to role `admin` |
| `POST /:id/release` | `escrowAdminOnly` + `escrowReleaseOnly` + limiter | RPC role `admin` |
| `POST /:id/refund` | `escrowAdminOnly` + `escrowRefundOnly` | reason ≥10 chars |
| `POST /:id/refund/:refundId/complete` | `escrowAdminOnly` + `escrowSettlementOnly` | `kayad_complete_escrow_refund_atomic`, external reference required |
| `POST /:id/close` | `escrowAdminOnly` + `emergency_escrow_control` | reason ≥10 chars |
| `GET /:id/funding-instructions` | party or staff | shows the *current primary* account, not a bound one |
| `POST /:id/verify-funding` | `escrowReconcileOnly` | `kayad_verify_escrow_funding_atomic` |
| `/operations/dashboard`, `/operations/case/:id` | `escrowViewOnly` | global queues + counts; **no frontend consumer** |
| `/operations/reconcile`, `/anomaly-scan`, `/case/:id/payout` | reconcile / operate / settlement permissions | B2C payout via `kayad_prepare_dealer_payout_atomic` + `disburseB2C` |

Companion routes: `disputeRoutes.js` (canonical dispute workflow on the escrow row, evidence via Cloudinary + `kayad_append_dispute_evidence_atomic`), `auctionSettlementRoutes.js`, `marketplaceFulfilmentRoutes.js`, `ledgerRoutes.js`, `reconciliationRoutes.js`.

Schema (executed, not assumed): `escrows` has 8-state CHECK, `amount>0`, `commission+sellerAmount<=amount`, unique partial index on `payment`, unique `funding_reference`, FKs to users/cars/payments/escrow_accounts. Triggers: refund-payable record on `refunded`, dispute refund settlement record, purchase-outcome reconciliation on status change, `updatedAt`.

## 3. The actual lifecycle (from the RPC, not invented)

```
pending ──funded(system|verify-funding)──▶ funded ──buyer──▶ vehicle_confirmed ──seller|admin──▶ delivered ──admin|system──▶ released ──admin|system──▶ closed
   │dispute                                   │dispute                │dispute                      │dispute                    │dispute (admin only)
   ▼                                          ▼                       ▼                             ▼                           ▼
 disputed ──admin──▶ refunded (terminal)  /  released
funded|vehicle_confirmed ──system (auto-release window elapsed)──▶ released
```

- Terminal: `refunded`, `closed`. `released` is *not* terminal and is not "paid out".
- Release posts two ledger entries (seller settlement, commission) inside the same transaction; commission rate comes from `platform_config.dealer_commission` (default 5 %). `cars` is flipped to sold; `payments` marked `released`.
- Refund transition only **reclassifies** the ledger (escrow → buyer payable) and queues a `refunds` row; money actually leaves only when staff run `…/refund/:id/complete` with an external reference.
- Payout to the seller is a separate staff action (`/operations/case/:id/payout`, M-Pesa B2C) after release.
- `closed` requires only `released` — the RPC does **not** check that the payout is paid or the refund completed. "Closed" therefore proves a recorded administrative closure, not that every money movement finished.

Read-model states the UI may show are exactly these eight plus the derived facts: funding verified (`funding_verified_at`), auto-release eligibility (`autoReleaseEligibleAt`), payout status (`dealer_payouts`), refund status (`refunds`), dispute workflow (`disputeWorkflowStatus`).

## 4. Funding and custody — what is and is not proven

Two funding mechanisms exist and they are different custody models:

1. **Bank-transfer custody** (`verify-funding`): staff with reconcile permission enter a bank reference; ledger `1200→2000`; `fundedAt`, `autoReleaseEligibleAt = now + releaseDays`. Requires `escrows.custodian_account`.
   **GAP (proven):** nothing in the application or any trigger ever sets `custodian_account`. Executing the RPC against an escrow created by the application's own insert shape raises `Escrow has no configured custodian account` (`evidence/escrow/g1_proof.sql`). Bank-transfer funding can never be verified as the code stands.
2. **M-Pesa purchase settlement** (`kayad_settle_purchase_payment_atomic`, called by the callback for `type=purchase`): when `cars.escrow_enabled` is true it inserts an escrow directly in `funded` state (`autoReleaseEligibleAt = now + 3 days`, hard-coded) and a `purchase_outcomes` row, and `recordPurchasePayment` posts ledger `1000→2000`. This contradicts the stated rule "vehicle escrow is not an M-Pesa rail" (the guard in `paymentController.initiate` only refuses `type=escrow`; the block that would create a `pending` escrow after it is **dead code**). It does not bind a custodian account, funding method or reference.

Webhook controls (PASS, code-verified): IP allow-list middleware, payload validation, webhook-event replay detection, claim-by-`processed` update so concurrent duplicates exit, amount verification against the payment, idempotent ledger references. **ENV-BLOCKED:** actual Daraja signature/IP behaviour, B2C result callbacks and live retries.

Nothing in the repository proves where M-Pesa-received funds are held, or that any account is a regulated trust account.

## 5. Release, dispute, refund, settlement and ownership dependencies

- Release (admin): allowed from `delivered` (no buyer-confirmation check in the DB), and from `disputed` (admin). Auto-release (system) from `funded`/`vehicle_confirmed` only after `autoReleaseEligibleAt`; from `delivered` unconditionally by role.
- **GAP (proven):** `escrowCron.js` filters delivered escrows by `deliveryConfirmedAt`, a column that does not exist (`ERROR: column "deliveryConfirmedAt" does not exist`). `findAll` throws on a PostgREST error, so `runDisputeWarnings` throws before sending anything and `runAutoRelease` is never reached: **scheduled auto-release and pre-release warnings never run**.
- Cron also broadcasts `escrowReleased` (with amount) to every connected socket.
- Disputes: two entry points. `POST /api/escrow/:id/dispute` (reason only; used by the UI) and `POST /api/disputes` (canonical workflow: title, category, evidence, mediation, appeal). Both operate on the same escrow row.
- Ownership transfer is **not** a condition of release. It is a separate seller-driven step on `purchase_outcomes` (`markCollection` then `markTransfer`, which writes `owner_vehicles`). Escrows created through the auction path have **no** `purchase_outcomes` row (they use `auction_outcomes` fulfilment).
- Reconciliation: `reconciliationCron`, `/operations/reconcile`, anomaly scan — present (PASS in code; ENV-BLOCKED for live data).

**GAP (proven by code path analysis):** auction escrow creation is unreachable. `createOptionalEscrowForOutcome` requires `paymentStatus === "paid"`, but for an escrow-mode auction `payment_status` starts `pending`, `POST /:id/outcome/payment` refuses non-direct modes (409), `paymentController` refuses `auction_win` for escrow-mode auctions (409), and `markAuctionEscrowFunded` (the only thing that sets `paid` for this mode) requires the escrow to exist. This is a business-flow decision (§12), not changed here.

## 6. Permissions

| Actor | Can | Cannot |
|---|---|---|
| Buyer (party) | read own deal, confirm vehicle (funded), request release, dispute, see funding instructions (pending) | release, refund, close, verify funding, confirm delivery |
| Seller (private seller or dealer owner user) | read own deal, confirm delivery (vehicle_confirmed), dispute | confirm vehicle, release, anything money-moving |
| Dealer team member / organization | **nothing** — party tests compare user ids only; no organization membership is consulted | (see §12) |
| Staff `escrow_officer` (view/operate/reconcile perms) | view queues/cases, reconcile, anomaly scan, verify funding | release/refund/close (`canActAsEscrowAdmin` = admin, superadmin, webhoist only) |
| `admin` / `superadmin` | all money-moving transitions subject to the permission middleware | — |
| `moderator` | may view any escrow and open a dispute (sent to the RPC as role `admin`) | release/refund/close — but the **UI treats moderator as administrator** and would show buttons the backend rejects |

## 7. Eligibility controls and enforcement

- Seller capability authority: PASS (function, admin endpoint, cascade, audit, migration, tests).
- Where it is *applied*: vehicle read paths (`getCar`, `getAuction`) — PASS. Purchase: the only code that called it (`paymentController` pending-escrow block) is dead. The live path decides by `cars.escrow_enabled` **inside** the settlement RPC: platform kill-switch and current seller capability are not consulted at settlement. **GAP.** Auction escrow creation does not consult capability or platform switch. **GAP.**
- Admin `escrow_rules` (min/max amount, enabled) are displayed in funding instructions but `validatePrivateSellerEscrow` — the function that enforces them — has no caller. **GAP.**

## 8. Current experiences

- Public: an `EscrowTrustBanner`, `EscrowWorkflowSection`, `TrustMetricsBar`, `WhyKayadComparison`, `GlobalSearchSection`, `SellPage`, `VehicleDetailPage`, `DealerProfileModal`, `UnifiedCommunicationHub` and an unmounted `EscrowPage` assert "CBK-regulated/licensed", "100 % protection", "Buyer Money-Back Guarantee", "Insured Transport", "multi-signature vault". Nothing in the repository supports any of these; `utils/escrow.ts` and `escrowRulesConfig.ts` state the opposite ("not yet CBK-certified"). **GAP (claims).**
- Escrow Control Center (`features/EscrowView.tsx`, nav `escrow`): one screen for every audience. Data: `GET /my` only. Metrics are computed in the browser from the viewer's own deals but labelled "Total Locked Vault Volume", shown as `Ksh 0` while loading, on error and when logged out. Admin perspective comes from role strings (`admin|superadmin|moderator`) but `/my` returns only deals where the admin is a party, so an administrator sees no queue. Party detection compares e-mail addresses delivered by the leak in §9.
- Orphans: `PaymentModal`, `SecureEscrowHub`, `EscrowTimeline`, `EscrowPage` (mock contracts) are never rendered. `AdminPage` shows `escrowContracts` from a mock context. `AdminView` "Open Escrows" counts `status: "held"` — not a status — so it is always 0 (**GAP**).
- The backend operations dashboard and case APIs exist (`escrowAPI.operationsDashboard/Case`) and have no UI.

## 9. Security and financial controls

PASS: CSRF + idempotency middleware on the mount; per-route permission middleware; RPC row locks and idempotency keys; unique funding/refund references; amount verification; immutable audit (`kayad_escrow_audit_immutable`); admin projections exclude contact data.

GAPs found:
1. **Counterparty data exposure (proven by schema):** `GET /my` and `GET /:id` call `.populate("car buyer seller payment")` with no field list → the *other* party's full `users` row (e-mail, phone, `credits`, `commission_balance`, `referral_earnings`, `escrow_capability_reason`, `is_banned`…) is returned. (The `payment` populate does not leak: `runPopulates` resolves unknown relations against `users`, finds nothing and leaves the bare payment id.)
2. `request-release` accepts any state (even `pending`, `refunded`, `closed`), is not idempotent, and broadcasts `adminAlert` (amount, vehicle title) to **all** sockets (`getIO().emit`) instead of the `admins` room.
3. Cron global `escrowReleased` emit (above).
4. DB trusts the `p_role` string; the application is the real gate (documented in `escrowAccess.js`). Staff dispute is sent as role `admin`.
5. Release from `delivered` does not require buyer confirmation (JS guard not enforced).

## 10. Frontend/backend mismatches

- "Locked vault" wording vs. mixed custody models (§4).
- `Step n of 6` vs. 8 backend states.
- Moderator shown admin controls; escrow_officer (the operations role) shown none.
- `Ksh 0` presented as a balance when data is absent.
- "Resolve Dispute & Release Funds" etc. relies on role strings, not server-declared capabilities.
- Funding instructions show the current primary account; the DB function would require a bound account.

## 11. Test baselines and environment limits

Taken before any change on this tree: escrow-related backend Jest (`tests/escrow`, `tests/transactions`, `escrowIdempotencyKeys`) 231/231 in 12 suites; escrow-related frontend Vitest 24/24 in 5 files; full-suite baselines from the previous delivery (FE 480 pass/1 skip, BE Jest 771, validators 164/10 pre-existing failures, tsc 0, build 0). PostgreSQL 16 schema built from all migrations (functions executed directly).

ENV-BLOCKED: Supabase PostgREST/RLS behaviour, Redis, real M-Pesa STK/B2C and callbacks, Cloudinary evidence storage, live socket delivery. Anything below labelled "browser journey" runs against mocked HTTP.

## 12. Missing capabilities and unresolved business decisions (not decided here)

1. **Which custody model is the product?** Bank transfer verified by staff (needs the fix in this stage) vs. M-Pesa STK settlement (what actually runs). Public wording must follow the answer.
2. **How an auction in escrow mode starts** (create escrow at `payment_due` and let bank funding mark paid; or allow an M-Pesa first payment). Currently unreachable.
3. Whether any regulator licence/trust-account claim may be made publicly. Until stated, none is.
4. Fees/commission (5 % in the RPC; `commissionPct` in rules unused; JS `getCommissionRate` duplicates), who bears them, refund of commission.
5. Which clock governs auto-release: DB `releaseDays` from funding (3), cron `ESCROW_AUTO_RELEASE_DAYS` from creation (7), STK RPC hard-coded 3 days.
6. Whether release may precede buyer acceptance and ownership transfer; whether `closed` should require completed payout/refund.
7. Dealer organization membership on escrow access (team members cannot act today).
8. Whether counterparties may see each other's phone/e-mail after funding.
9. Dispute outcomes/appeals beyond admin resolution; cross-party report access.
10. Moderator/escrow_officer authority over money-moving transitions (DB, JS and permissions must change together).

---
## Addendum 2026-10-09 — status after implementation
G1 (custody never bound), cron `deliveredAt`, counterparty leak, request-release guard/broadcast, retired `held` status, auction capability gate and purchase-eligibility freeze are FIXED and tested (see `ESCROW_EXPERIENCE_CONVERGENCE_REPORT.md`). Still open: all business decisions in section 12, ENVIRONMENT-BLOCKED live checks, `compareEscrowBalances`, dealer team access.
