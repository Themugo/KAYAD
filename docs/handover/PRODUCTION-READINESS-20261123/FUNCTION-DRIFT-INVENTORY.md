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
- **Direction of drift (corrected in revision 2):** the earlier note that hosted is "longer" for some functions was a **formatting artefact** (the repo bodies are dense one-liners; the hosted bodies are expanded). Line counts must not be used to judge completeness. See "Revision 2 — lineage" below, which compares normalised bodies against every repo migration.
- **Dependency signal:** the repo versions of auto_bid, place_bid, extend_auction, settle_bid_payment reference `auction_setups` / `auction_platform_policies`; settle_purchase_payment references `purchase_outcomes`. None of these tables exist on hosted, so those repo bodies cannot run on hosted as-is.
- **Counting note:** this classification finds 15 functions that move or record money (auto_bid, confirm_bid_payment, generate_inspection_settlement, mark_dealer_payout, mark_inspection_settlement_paid, place_bid, post_ledger_entry, process_inspection_payment, process_inspection_refund, rebuild_ledger_balances, resolve_dispute, settle_bid_payment, settle_purchase_payment, transition_escrow, verify_escrow_funding), plus 4 money-adjacent (transition_dispute, start_auction, extend_auction, inspection_report_immutability_guard). The earlier audit's "12 financial functions" is not reproduced exactly; the financial owner should review the whole list, not a subset.
- Not financial: register_identity (fixed by the rehearsed restore migration), apply_dealer_verification, rls_auto_enable.
- Triggers: `kayad_inspection_report_immutability_guard` is a trigger function. Hosted has 38 triggers vs repo 79; trigger-level differences were not enumerated per function (NOT ESTABLISHED).
- Full definitions and unified diffs: `evidence/function-bodies/hosted|repo|*.diff`.


---
# Revision 2 (2026-11-23, after the full read of the hosted and repo definitions)
Method (Confirmed, reproducible with `evidence/`): every `CREATE [OR REPLACE] FUNCTION` body in all 211 repo migrations was whitespace-normalised and compared with the hosted body. Raw output: `evidence/function-lineage-exact-match.txt` and `evidence/function-lineage-nearest.txt`.

## Lineage: hosted is mostly an OLDER point in the repo's own history
| Group | Functions | Evidence | Reading |
|---|---|---|---|
| **A. Hosted body == an older repo migration, byte-for-byte after normalisation (10)** | auto_bid (=20260905060000), confirm_bid_payment (=20260901210000), extend_auction (=20260907140000), inspection_report_immutability_guard (=20260920220000), mark_inspection_settlement_paid (=20260920220000), post_ledger_entry (=20260902090000), rebuild_ledger_balances (=20260902090000), settle_bid_payment (=20260918100000), settle_purchase_payment (=20260902090000), start_auction (=20260907140000) | similarity 1.00 to an older version; 0.07–0.95 to the latest | The repo contains **later versions** of these; hosted never received them (migration history stops at 20260922060457). Confirmed lineage; "repo is better" is Inferred until tested. |
| **B. Hosted is a near-variant of an older repo version (8)** | generate_inspection_settlement (0.89 to 20260918144230), process_inspection_payment (0.73 to 20261110130000), process_inspection_refund (0.95 to 20260907190200), resolve_dispute (0.60 to 20261002150000), transition_dispute (0.60 to 20260909084443), transition_escrow (0.85 to 20260905050000; latest repo 0.64), verify_escrow_funding (0.91 to 20260909080841; latest 0.26), place_bid (0.67 to 20260901210000; latest 0.36) | no exact match | Either edited by hand on hosted or produced by a migration not in the repo. Origin **NOT ESTABLISHED**. Needs line-level review. |
| **C. Hosted logic that the repo does not have (2)** | apply_dealer_verification (0.11: hosted writes `audit_logs` and `admin_control_state`; repo version is 23 lines), mark_dealer_payout (0.35: hosted references the ledger, the repo version does not) | very low similarity to every repo version | Hosted-only behaviour. **Do not overwrite.** Business decision required. |
| D. Identity | register_identity | hosted is the placeholder; restore migration rehearsed | Fix path exists (Stage 1). |
| E. Platform | rls_auto_enable (event trigger `ensure_rls`) | no repo definition | Supabase platform object. Keep; never replace. |

## Money-function review (E2) — static findings (Inferred; not executed against money data)
| Function | Hosted | Repo (latest) | Safeguard comparison |
|---|---|---|---|
| `transition_escrow` | state machine + role matrix + FOR UPDATE + idempotency key; release sets `commission = ROUND(amount*rate)` (integer), **no ledger posting**, swallows `undefined_column` on `platform_config` | same machine/roles; release/refund **post ledger entries** via `kayad_post_ledger_entry_atomic` with idempotent keys (`escrow-release:<id>`, `escrow-commission:<id>`, `escrow-refund:<id>`); 2-dp rounding; "amounts do not balance" guard; no silent fallback | Repo has the stronger ledger/rounding/idempotency safeguards. Hosted escrow releases would not appear in the ledger. |
| `post_ledger_entry` | 3 row locks (`FOR UPDATE`) | 5 row locks | Repo takes more locks; whether that is stronger needs a concurrency test (Unverified). |
| `rebuild_ledger_balances` | older version | later version (different body, 29 vs 30 lines) | needs test |
| `settle_purchase_payment` | no `purchase_outcomes` | writes `purchase_outcomes` and checks effective escrow | Repo version needs table missing on hosted → **dependency-blocked** |
| `place_bid`, `auto_bid`, `extend_auction`, `settle_bid_payment`, `start_auction` | pre-auction-setup logic | use `auction_setups` / `auction_platform_policies` | **dependency-blocked** (tables missing) |
| `process_inspection_payment` | 40 lines; references ledger and idempotency | 138 lines; also references ledger and idempotency, more branches | Large behavioural change; direction of safeguards not established without a line-level review |
| `process_inspection_refund` | single-version near match | same family | review diff |
| `resolve_dispute`, `transition_dispute` | near-variants | later hardening (locks, ledger) | review diff |
| `mark_dealer_payout` | references the ledger | different shape | **hosted has behaviour the repo lacks → block** |
| `verify_escrow_funding` | older | adds ledger posting + second lock | repo stronger (Inferred) |
Not assessed for lack of runnable harness on the hosted-shaped database: concurrency under real traffic, replay of provider callbacks, refund limits end-to-end. These need the E4 tests on the replica (see `TEST-RESULTS.md` for what actually ran).

## Decision matrix for the financial owner (nothing selected; nothing applied)
| Option | Applies to | Precondition |
|---|---|---|
| Preserve hosted | C (apply_dealer_verification, mark_dealer_payout), E | none |
| Adopt repository version | Group A (10) | dependency tables present (auction_setups, auction_platform_policies, purchase_outcomes) + E4 regression evidence + financial-owner sign-off |
| Merge specific behaviours | Group B (8) | line-level diff review (`evidence/function-bodies/*.diff`) |
| Require additional tests | all 15 money-moving | synthetic replica tests |
| Block pending business decision | C | owner clarifies intended payout/verification rules |

## Material context for risk
Hosted holds **0 bids, 0 escrows, 0 payments, 0 refunds, 0 ledger entries and 0 leads** (read-only counts, 2026-11-23). No existing financial record can be altered by a function change today; the risk is to *future* money flows and to the integrity of the design, not to historical data. This does not remove the need for owner sign-off.
