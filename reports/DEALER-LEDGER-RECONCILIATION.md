# Dealer ledger reconciliation

Executed locally on the disposable database (`ci/db-journeys/19_dealer_ledger_reconciliation.mjs`, **21/21 checks pass**, evidence `ci/db-journeys/out/dealer-ledger-reconciliation.json`). Status: **VERIFIED locally; production NOT TESTED.** No financial logic was changed. No ledger row was written by hand.

## Method (why this is not the earlier fixture approach)
| Step | How it was produced | Real or simulated |
|---|---|---|
| Purchase payment | A `payments` row stored exactly as `/api/payments/initiate` stores it (pending, checkout id, `escrowEligible`), then confirmed by the **real `handleMpesaCallback`** (claim, `kayad_settle_purchase_payment_atomic`, `recordPurchasePayment`) | Provider confirmation **simulated**; everything else production code |
| Escrow creation and funding | Created by the settle function | Production |
| Vehicle confirmation, delivery, release | Production API (`/api/escrow/:id/confirm-vehicle`, `/confirm-delivery`, `/release`) with buyer, dealer and admin sessions | Production |
| Payout | Rows created by a **fixture** performing the same INSERT as `kayad_prepare_dealer_payout_atomic` (that function is broken, finding D1). `processing` → `paid`/`failed` by the real `kayad_mark_dealer_payout_atomic`; ledger by the real `recordDealerPayout` (steps mirrored from `b2cCallback`) | Provider result simulated; prepare step fixtured |
| Dispute, refund queue, refund completion | Production API (`/dispute`, `/refund`, `/refund/:id/complete` with a provider reference) | Bank reference simulated |
| Dashboard figures | `GET /api/dealer-platform/command-centre` as the dealer | Production |

Flows: A 1,234,567 (released, payout paid), B 2,000,000 (released, payout failed), C 800,000 (dispute → refund → refund completed), D 600,000 (still held), E 450,000 (direct mode, no escrow), F 500,000 (rate-change probe, released).

## Results
Accounts after the run (KES): cash 1000 = 3,611,728.35; escrow payable 2000 = 1,050,000; refund payable 2100 = 0; disbursement payable 5000 = 2,360,000; commission revenue 4000 = 201,728.35. Trial balance (Σ debits − Σ credits) = 0.

| Identity | Dashboard | Records | Ledger | Result |
|---|---|---|---|---|
| Released sales revenue | 3,532,838.65 | Σ released `sellerAmount` 3,532,838.65 | Σ `escrow_release` 3,532,838.65 | ✅ equal |
| Platform fees | 201,728.35 | Σ released `commission` 201,728.35 | account 4000 = 201,728.35 | ✅ |
| Gross sales | 3,734,567 | released net + commission | n/a | ✅ |
| Held escrow (gross) | 600,000 | held escrows 600,000 | 2000 = 1,050,000 = 600,000 held + 450,000 direct-mode | ✅ with D4 explained |
| Pending payouts | 2,360,000 (not requested 460,000; failed 1,900,000; in progress 0) | released − paid | 5000 = 2,360,000 | ✅ |
| Completed payouts | 1,172,838.65 | Σ paid payouts 1,172,838.65 | Σ `dealer_payout` 1,172,838.65 | ✅ |
| Refunds | 800,000 completed, 0 open | refund row completed | 2100 = 0 after settlement | ✅ |
| Cash | n/a | collected 5,584,567 − paid 1,172,838.65 − refunded 800,000 | 3,611,728.35 | ✅ |

The command-centre figures equal the underlying records and the ledger for every flow exercised. **Not exercised (NOT TESTED):** auction-win payments, accepted-offer settlement payments, bank-transfer escrow funding (`kayad_verify_escrow_funding_atomic`), `closed` escrows, partial/dispute-split resolutions.

## Discrepancies and proposals (stop condition: nothing below was implemented)

### D1 — payout preparation is broken (highest priority)
* **Cause.** `kayad_prepare_dealer_payout_atomic` (migration `20260909091703_dealer_commercial_payout_lifecycle.sql`) reads `v.sellerAmount`. The column is the quoted mixed-case `"sellerAmount"`, so PostgreSQL resolves the unquoted name to `selleramount` and raises `record "v" has no field "selleramount"`. Confirmed on the **hosted** database by read-only `pg_get_functiondef` (unquoted reference present, quoted absent) and `dealer_payouts` has 0 rows.
* **Effect.** Neither `POST /api/dealer/payouts/:escrowId/initiate` nor the admin `POST /api/escrow/operations/case/:id/payout` can create a payout. Released money can never be paid out through the product.
* **Exact proposed change** (forward-only migration, not written, not applied): `CREATE OR REPLACE FUNCTION public.kayad_prepare_dealer_payout_atomic(p_escrow uuid, p_dealer uuid, p_phone text)` identical to the current body except `v_net := greatest(0, coalesce(v."sellerAmount", v.amount - v_commission));`.
* **Risk.** Low for the change itself (one identifier). Behavioural risk: payouts become possible, so the B2C provider path is exercised for the first time in production; confirm provider credentials and amounts on a staging account first.
* **Test plan.** Remove the fixture branch in journey 19 so the production function creates the rows; assert one payout per released escrow, `net_amount = sellerAmount`, idempotent second call, refusal for a non-released escrow and for another dealer's escrow, then the existing paid/failed flow and ledger identity.

### D2 — commission basis changes between funding and release
Funding stores `commission = ROUND(amount × rate)` (25,000 for 500,000 at 5%); release recomputes with the **current** `platform_config.dealer_commission` to 2 decimals and overwrites the escrow row (40,000.00 at 8%; 61,728.35 instead of 61,728 for 1,234,567 at 5%). The ledger and the released figures agree with each other and with the row after release, so the dashboard is consistent; the held-escrow **net** shown before release is only an estimate. *Proposal:* decide the policy (store the rate on the escrow at funding and release with it, or disclose that the release-time rate applies). Financial-logic change; needs approval and a migration; test with a rate change between funding and release.

### D3 — release API reports failure after committing
`POST /api/escrow/:id/release` returned 400 `Invalid purchase outcome transition ready_for_collection -> ready_for_collection` although the escrow was released and the ledger posted (the DB release and the application-side outcome sync are separate steps; the sync rejects a no-op transition). No money is wrong; the operator sees a false failure and a retry is refused. *Proposal:* treat an unchanged outcome status as success in `syncPurchaseOutcomeFromEscrow`. Test: confirm-delivery then release returns 200.

### D4 — direct-mode sales are invisible to the dealer financials
Direct-mode purchases are collected, booked to 2000, and marked `direct:payment_received:ready:pending` in `purchase_outcomes`; no escrow row exists, so no figure (gross, revenue, receivable) includes them although the vehicle is marked sold. *Proposal:* show "collected, transfer pending" from `purchase_outcomes`; requires the table (missing on the hosted database today, D6) and a definition for how and when the platform transfers direct-mode money.

### D5 — legacy endpoints report 0
See `LEGACY-EARNINGS-ENDPOINT-AUDIT.md`.

### D6 — hosted schema is behind the repository
Read-only check against the hosted project: tables missing: `auction_outcomes`, `auction_setups`, `dealer_listing_lifecycle_events`, `marketplace_offers`, `marketplace_offer_settlements`, `purchase_outcomes`. Present: `escrows`, `payments`, `dealer_payouts`, `refunds`, `ledger_entries`, `ledger_accounts`, `leads`, `dealer_teams`, `bids`, `cars`. All columns used by the command centre exist on the present tables. The endpoint now reports missing optional sources in `unavailable` and hides their figures; a missing core table still fails loudly. Applying migrations is the owner's release step and was not done.

## Limitations
Single-dealership data set; amounts are whole shillings except the deliberate fractional probe; no concurrency or retry stress on the payout/refund path; simulated provider results. Hosted data was not read beyond schema metadata and the existence/definition checks above.
