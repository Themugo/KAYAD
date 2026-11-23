# Dealer financial definitions (authoritative for the command centre)
Revision 2 (hardening phase). Revision 1 was written before any financial card was built; this revision adds the collected / held / released / realised vocabulary, the ledger mapping that is now **tested against real payment flows** (`ci/db-journeys/19_dealer_ledger_reconciliation.mjs`, see `DEALER-LEDGER-RECONCILIATION.md`), net-amount rules, the discrepancies found, and **corrects the classification of the legacy `/earnings` and `/summary` figures** (revision 1 said they over-count held escrow; the executed evidence shows they under-report, see `LEGACY-EARNINGS-ENDPOINT-AUDIT.md`).

## Vocabulary (one word, one meaning)
| Term | Meaning | Authoritative record |
|---|---|---|
| **Collected funds** | Money the platform actually received for the dealer's sales: purchase payments that reached `success` (and later `released` or `refunded`). Includes direct-mode purchases, which never create an escrow. | `payments` (type `purchase`), ledger account 1000 debits / 1200 bank funding |
| **Held escrow** | Collected funds sitting in an escrow that is `funded`, `vehicle_confirmed` or `delivered`. Owed to the dealer only if the deal completes. **Never revenue.** | `escrows` (status), ledger 2000 *Escrow Payable* credits not yet consumed |
| **Released escrow** | An escrow whose release transaction committed (`released`, then `closed`). The dealer's net amount moves to *Disbursement Payable* (5000) and the commission to *Commission Revenue* (4000). | `escrows` + ledger `escrow_release` and `commission` postings |
| **Realised revenue (dealer)** | The dealer's net of released escrows = **Released sales revenue** (#2). Not collected funds, not held funds. | `escrows.sellerAmount` of released/closed escrows (= ledger `escrow_release`) |
| **Realised revenue (platform)** | The commission on released escrows = **Platform fees** (#8). Shown to the dealer as a fee, never as dealer revenue. | `escrows.commission` of released/closed (= ledger account 4000) |
| **Pending payout** | Released but not yet paid to the dealer (#5). | `escrows` + `dealer_payouts` (= ledger 5000 balance) |
| **Completed payout** | A payout the provider confirmed (#6). | `dealer_payouts.status='paid'` (= ledger `dealer_payout` postings) |
| **Refunds** | Money returned to the buyer: completed refunds (#7), with open refunds shown separately. | `refunds` (= ledger 2100 settled to cash) |
| **Fees** | See platform realised revenue. Subscription, listing and inspection fees are not dealer sale figures and are out of scope. | n/a |
| **Net amounts** | `amount = sellerAmount + commission`. Net is rounded to cents at release (see D2); `sellerAmount` before release is an estimate. | `escrows` |

## Ledger map (observed in the executed journey, not assumed)
| Event (production code path) | Ledger posting | Account effect |
|---|---|---|
| Purchase payment confirmed (`handleMpesaCallback` → `recordPurchasePayment`) | `purchase_payment` | Dr 1000 Cash, Cr 2000 Escrow Payable (booked for **escrow and direct-mode** alike) |
| Bank-transfer escrow funding verified (`kayad_verify_escrow_funding_atomic`) | `escrow_deposit` | Dr 1200 Bank, Cr 2000 |
| Escrow released (`kayad_transition_escrow_atomic`) | `escrow_release` + `commission` | Dr 2000, Cr 5000 (dealer net); Dr 2000, Cr 4000 (commission) |
| Payout confirmed (`b2cCallback` → `recordDealerPayout`) | `dealer_payout` | Dr 5000, Cr 1000 |
| Dispute refund queued (`kayad_transition_escrow_atomic` → refunded) | `refund` | Dr 2000, Cr 2100 Refund Payable |
| Refund completed (`kayad_complete_escrow_refund_atomic`) | `refund_settlement` | Dr 2100, Cr 1000 (or 1200) |

Tested identities (all hold on the executed data; trial balance Σ debits − Σ credits = 0):
* Released revenue (dashboard) = Σ released/closed `sellerAmount` = Σ ledger `escrow_release`.
* Platform fees (dashboard) = ledger account 4000.
* Pending payouts (dashboard) = ledger account 5000 balance.
* Completed payouts (dashboard) = Σ paid `dealer_payouts` = Σ ledger `dealer_payout`.
* Held escrow gross (dashboard) = Σ amounts of held escrows; ledger 2000 balance = held escrows **+ direct-mode funds collected and not yet transferred** (D4).
* Refund payable 2100 = open refunds; zero after settlement; the dashboard shows the completed refund.
* Cash 1000 = collected − paid payouts − settled refunds.

## Discrepancies found (documented; no financial logic was changed)
| # | Finding | Effect on the dashboard | Proposed correction (needs approval) |
|---|---|---|---|
| D1 | `kayad_prepare_dealer_payout_atomic` fails for every call: `v.sellerAmount` is unquoted, so PostgreSQL looks for `selleramount`. Same defect confirmed on the hosted database by a read-only `pg_get_functiondef` (position of the unquoted reference found, quoted form absent; `dealer_payouts` has 0 rows ever). | **No payout can be created**: both callers of the function (`POST /api/dealer/payouts/:escrowId/initiate` and the admin `POST /api/escrow/operations/case/:id/payout`) are blocked. Pending payout can never move to completed through the product. The dashboard is correct but the flow behind it is blocked. | Forward migration: `CREATE OR REPLACE` the function with `v."sellerAmount"`. Test: journey 19 without the fixture. See `DEALER-LEDGER-RECONCILIATION.md`. |
| D2 | Commission is fixed on the escrow row at funding (`ROUND(amount*rate)`), but release recomputes it from the **current** `platform_config.dealer_commission` with 2 decimals and overwrites the row. | Held-escrow net (`sellerAmount`) is an estimate; the released figure can differ by rounding (0.35 KES on 1,234,567) or by a rate change (500,000 funded at 5% released at 8%: commission 40,000 instead of 25,000). Released figures are correct and equal the ledger. | Decide the policy: freeze the rate at funding (store rate on the escrow) or disclose that the rate applies at release. |
| D3 | `POST /api/escrow/:id/release` returns 400 (`Invalid purchase outcome transition ready_for_collection -> ready_for_collection`) **after** the release transaction committed. | None on money (escrow released, ledger posted, figures correct). Admin sees a failure for a successful release; a retry is refused. | Make the outcome sync idempotent for an unchanged state. |
| D4 | Direct-mode purchases (`escrowEligible=false`) are collected by the platform and booked to 2000, but create no escrow and no payout path in the dashboard sources. | Not counted in gross sales, revenue, held funds or receivables. The vehicle shows as sold. | Product decision: expose `purchase_outcomes` (`direct`, `transfer_status`) as "collected, transfer pending". The table is absent on the hosted database today. |
| D5 | Legacy `/earnings` and `/summary` total 0 for released sales (below). | Not used by the command centre. | See `LEGACY-EARNINGS-ENDPOINT-AUDIT.md`. |
| D6 | Hosted database lacks 5 tables the repository code reads (`auction_outcomes`, `auction_setups`, `dealer_listing_lifecycle_events`, `marketplace_offers`, `marketplace_offer_settlements`) plus `purchase_outcomes`. All columns the command centre reads on the tables that do exist are present. | The endpoint now degrades per source: affected figures are hidden and reported in `unavailable`, never shown as zero. A missing core table (escrows) still fails loudly. | Apply the pending migrations through the owner's release process (not done here). |

## Escrow state map (from `escrowStateMachine.js` and the DB check)
`pending` (not funded) → `funded` → `vehicle_confirmed` → `delivered` → **`released`** → `closed` (admin/system closure of a released escrow; only reachable from `released`). `disputed` can interrupt any pre-release state (and reopen a released one). `refunded` is terminal (money returned to buyer).

| # | Figure | Authoritative definition | Source | Excludes |
|---|---|---|---|---|
| 1 | **Gross sales** | Σ `escrows.amount` where status ∈ {`released`,`closed`}; count of those escrows | `escrows` | held, disputed, refunded, pending escrows; listing prices; offers; bids |
| 2 | **Released sales revenue** | Σ `escrows.sellerAmount` (dealer's net after commission) where status ∈ {`released`,`closed`}. Rows with empty `sellerAmount` use `amount − commission`. | `escrows` | everything in #1's exclusions |
| 3 | **Escrow-held funds** | Σ dealer net (`sellerAmount`, else `amount − commission`) where status ∈ {`funded`,`vehicle_confirmed`,`delivered`}; plus separately **held in dispute** (`disputed`). Gross held shown alongside. | `escrows` | `pending` (never funded) — **never counted as revenue** |
| 4 | **Pending settlement** | Deals agreed but **not yet paid by the buyer**: accepted-offer settlements `awaiting_payment` and not past `expires_at` (Σ `agreed_amount`, count) + auction outcomes `payment_due` / `escrow_pending_funding` (Σ `winning_amount`, count). The dealer has received nothing yet. | `marketplace_offer_settlements`, `auction_outcomes` | enquiries, open/pending offers |
| 5 | **Pending payout** | Released escrows (status exactly `released`, the only state `kayad_prepare_dealer_payout_atomic` accepts) with **no `paid` payout**: Σ net (`dealer_payouts.net_amount` when a row exists, else escrow dealer net). Sub-split: not yet requested (no payout row) · in progress (`pending`,`processing`) · failed/cancelled (needs attention). | `escrows` + `dealer_payouts` | `paid` payouts; `closed` escrows |
| 6 | **Completed payout** | Σ `dealer_payouts.net_amount` where status = `paid` (count; latest `completed_at`) | `dealer_payouts` | pending/processing/failed/cancelled |
| 7 | **Refunds** | Σ `refunds.amount` where status = `completed` and `escrow_id` belongs to this dealership's escrows; count of `pending`/`processing` refunds shown separately. Escrows with status `refunded` are counted as refunded deals. | `refunds` → `escrows` | refunds not linked to an escrow (inspection/subscription refunds) — not supported here |
| 8 | **Platform fees** | Σ `escrows.commission` where status ∈ {`released`,`closed`} (identity: `amount = sellerAmount + commission`) | `escrows` | fees on refunded/held escrows (not yet earned) |
| 9 | **Outstanding receivables** | Money the platform holds or owes **to** the dealer from funded deals: #3 (held, excluding disputed) + #5 (pending payout). Derived, no extra source. Pending settlement (#4) is **not** included because the buyer has not paid. | derived | #4, disputed funds |
| 10 | **Transaction volume** | Count and gross Σ `escrows.amount` of every escrow that was ever funded (`fundedAt` not null), any current status, with a per-status breakdown. | `escrows` | unfunded `pending` escrows |

### Reconciliation identities (asserted by tests against the underlying rows)
1. Gross = Revenue + Fees (per escrow and in total, for released/closed).
2. Every `released`/`closed` escrow falls in exactly one bucket: paid out (`paid` payout) · pending payout (`released`, no paid payout) · **closed without a recorded payout** (reported as a count/amount note, not in headline money).
3. Revenue = Completed payout + Pending payout + closed-without-payout, restricted to released/closed escrows (payout rows are 1:1 with escrow: unique index `dealer_payouts_escrow_uq`).
4. Held + Disputed + Released/Closed + Refunded + Pending(unfunded) = all dealer escrows (count identity).
5. No figure reads `cars.price`, `leads.estimated_value`, `marketplace_offers.amount` or `bids.amount`.

### Legacy figures (not changed; classified from executed evidence)
| Figure | Where | Classification |
|---|---|---|
| `/dealer-platform/dashboard` `revenue.total` | old overview | = #2 for `released` only (omits `closed`) → superseded on the overview by the command centre |
| `/dealer-platform/analytics` `totalRevenue` | Analytics | `released` only; falls back to gross `amount` if `sellerAmount` is empty |
| `/api/dealer/earnings`, `/api/dealer/summary` `totalRevenue` | no mounted screen consumes them | Σ `payments.dealer_amount` of `status='success'` payments. `dealer_amount` is written only at release, when the payment status becomes `released`, so the sum is **0** for escrow sales while the list/count shows held and direct-mode payments. **Not** released revenue; labelled with an additive `basis` notice, numbers unchanged |
| `/dealer-platform/auctions` `stats.totalRevenue` | auction inventory API | Σ winning/current bid values — a bid is not revenue; not displayed |

### Visibility (no widening of the role matrix)
Business counts follow the permission that already unlocks the same data through an existing route. **Released revenue (#1, #2) → `canViewEarnings`** (already exposed by `/dashboard`). **Escrow, payout, refund, fee, receivable and settlement figures (#3–#10) → dealership owner only**, because every existing route for them (`/api/dealer/escrows`, `/payouts`, `/earnings`, `/settlement`) is owner-only.

### Limitations
* Ledger equality is now **VERIFIED locally** on real flows for purchase (escrow mode), release, payout, dispute refund, refund settlement and the rate-change probe. The provider confirmation (M-Pesa STK result, B2C result, bank refund reference) is **simulated**; auction-win, offer-settlement and bank-transfer funding flows were not driven through the ledger (NOT TESTED).
* Payout rows in the journey come from a fixture that performs the same INSERT as the failing production function (finding D1); everything after that is production code.
* Refunds outside escrows are not included. No production data was written; hosted access was read-only SELECT of schema metadata.
