# Phase 7 — Differing function body inventory (22)

Source: hosted = dump supplied by owner (replica `kayad_test_replica`); repo = DB built from repo migrations (`kayad_test_reporef`). Bodies in `fnbodies/hosted|repo|*.diff`. **Nothing replaced or normalised.** Behavioural notes are from static comparison of the two definitions (Inferred) — not executed against money data.

| # | Function | Domain | Class | hosted/repo lines | row locks (FOR UPDATE) h/r | ledger ref h/r | idempotency ref h/r | tables only in hosted | tables only in repo | Callers (backend) | Suggested owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `kayad_apply_dealer_verification_atomic` | Dealer verification | non-money | 81/23 | 4/0 | N/N | N/N | admin_control_state, audit_logs | — | services/dealerApproval.service.js services/dealerOnboardingReadiness.service.js | Compliance / Dealer-ops owner |
| 2 | `kayad_auto_bid_atomic` | Auction bidding | MONEY (bid commitment) | 109/69 | 1/1 | N/N | N/N | — | auction_setups | utils/atomicTransactions.js | Financial owner + Auction owner |
| 3 | `kayad_confirm_bid_payment_atomic` | Bid payment confirmation | MONEY | 80/24 | 2/1 | N/N | N/N | bids, cars | payments | utils/atomicTransactions.js | Financial owner |
| 4 | `kayad_extend_auction_atomic` | Auction timing (anti-sniping) | auction (indirect money) | 38/27 | 1/1 | N/N | N/N | — | auction_setups | utils/atomicTransactions.js | Auction owner |
| 5 | `kayad_generate_inspection_settlement_atomic` | Inspection settlement | MONEY | 29/94 | 2/2 | N/N | Y/Y | — | — | inspection/services/settlementService.js | Financial owner |
| 6 | `kayad_inspection_report_immutability_guard` | Inspection report integrity trigger | integrity (settlement-adjacent) | 7/20 | 0/0 | N/N | N/N | — | — | — | Financial owner + Security |
| 7 | `kayad_mark_dealer_payout_atomic` | Dealer payout | MONEY (payout) | 60/32 | 1/1 | Y/N | Y/Y | — | — | controllers/paymentController.js services/mpesaB2C.service.js | Financial owner |
| 8 | `kayad_mark_inspection_settlement_paid_atomic` | Inspection settlement paid | MONEY | 7/70 | 1/1 | Y/Y | Y/Y | — | — | inspection/services/settlementService.js | Financial owner |
| 9 | `kayad_place_bid_atomic` | Auction bidding | MONEY (bid commitment) | 103/91 | 1/1 | N/N | N/N | — | auction_setups | utils/atomicTransactions.js | Financial owner + Auction owner |
| 10 | `kayad_post_ledger_entry_atomic` | Ledger posting | MONEY (ledger) | 59/88 | 3/5 | Y/Y | Y/Y | — | cannot | services/auctionSettlement.service.js services/ledgerService.js | Financial owner |
| 11 | `kayad_process_inspection_payment_atomic` | Inspection payment | MONEY | 40/138 | 3/3 | Y/Y | Y/Y | — | — | services/paymentCallback.service.js inspection/controllers/legacyCompatibilityController.js inspection/services/settlementService.js | Financial owner |
| 12 | `kayad_process_inspection_refund_atomic` | Inspection refund | MONEY (refund) | 37/41 | 2/2 | Y/Y | N/N | — | — | — | Financial owner |
| 13 | `kayad_rebuild_ledger_balances` | Ledger rebuild | MONEY (ledger) | 29/30 | 0/0 | Y/Y | N/N | — | running | — | Financial owner |
| 14 | `kayad_register_identity_atomic` | Registration | non-money (identity) | 21/56 | 0/0 | N/N | N/N | — | private_seller_capabilities, system_settings, user_auth, use | controllers/authController.js services/dealerOnboardingReadiness.service.js | Platform/Identity owner — FIXED by restore migration, rehearsed |
| 15 | `kayad_resolve_dispute_atomic` | Dispute resolution | MONEY (escrow release/refund) | 40/115 | 1/1 | Y/Y | Y/Y | users | cars | controllers/disputeController.js utils/atomicTransactions.js | Financial owner |
| 16 | `kayad_settle_bid_payment_atomic` | Bid settlement | MONEY | 36/62 | 3/3 | Y/Y | N/N | — | auction_platform_policies, auction_setups | utils/atomicTransactions.js | Financial owner |
| 17 | `kayad_settle_purchase_payment_atomic` | Purchase settlement | MONEY | 76/110 | 3/4 | N/N | Y/Y | — | computeeffectiveescrowenabled, purchase_outcomes | services/paymentService.js utils/atomicTransactions.js | Financial owner |
| 18 | `kayad_start_auction_atomic` | Auction start | auction (indirect money) | 58/36 | 1/1 | N/N | N/N | — | — | utils/atomicTransactions.js | Auction owner |
| 19 | `kayad_transition_dispute_atomic` | Dispute state machine | MONEY-adjacent | 36/19 | 1/1 | N/N | N/N | — | — | controllers/disputeController.js | Financial owner |
| 20 | `kayad_transition_escrow_atomic` | Escrow state machine | MONEY (escrow) | 146/42 | 2/2 | N/Y | Y/Y | — | — | utils/escrowAccess.js utils/atomicTransactions.js | Financial owner |
| 21 | `kayad_verify_escrow_funding_atomic` | Escrow funding verification | MONEY (escrow) | 27/59 | 1/2 | N/Y | N/Y | — | — | services/escrowConfiguration.service.js utils/atomicTransactions.js | Financial owner |
| 22 | `rls_auto_enable` | Event trigger enabling RLS on new tables | security | 30/5 | 0/0 | N/N | N/N | pg_event_trigger_ddl_commands | — | — | Security owner |

## How to read this inventory
- **Static comparison only (Inferred).** Nothing here was executed against money data, and no function was changed.
- **Drift is bidirectional.** Hosted is *longer* (more logic) than the repo for apply_dealer_verification, auto_bid, confirm_bid_payment, mark_dealer_payout, place_bid, start_auction, transition_dispute, transition_escrow (146 vs 42 lines), rls_auto_enable. The repo is longer for generate_inspection_settlement, mark_inspection_settlement_paid (7 vs 70), post_ledger_entry, process_inspection_payment (40 vs 138), resolve_dispute, settle_bid/purchase_payment, verify_escrow_funding, register_identity (placeholder). A blanket "make hosted match repo" would therefore **remove** hosted logic in some functions and add repo logic in others. Which side is intended is NOT ESTABLISHED for any of them.
- **Dependency signal:** the repo versions of auto_bid, place_bid, extend_auction, settle_bid_payment reference `auction_setups` / `auction_platform_policies`; settle_purchase_payment references `purchase_outcomes`. None of these tables exist on hosted, so those repo bodies cannot run on hosted as-is.
- **Counting note:** this classification finds 15 functions that move or record money (auto_bid, confirm_bid_payment, generate_inspection_settlement, mark_dealer_payout, mark_inspection_settlement_paid, place_bid, post_ledger_entry, process_inspection_payment, process_inspection_refund, rebuild_ledger_balances, resolve_dispute, settle_bid_payment, settle_purchase_payment, transition_escrow, verify_escrow_funding), plus 4 money-adjacent (transition_dispute, start_auction, extend_auction, inspection_report_immutability_guard). The earlier audit's "12 financial functions" is not reproduced exactly; the financial owner should review the whole list, not a subset.
- Not financial: register_identity (fixed by the rehearsed restore migration), apply_dealer_verification, rls_auto_enable.
- Triggers: `kayad_inspection_report_immutability_guard` is a trigger function. Hosted has 38 triggers vs repo 79; trigger-level differences were not enumerated per function (NOT ESTABLISHED).
- Full definitions and unified diffs: `evidence/function-bodies/hosted|repo|*.diff`.
