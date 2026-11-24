# 07 — Financial operations certification

> **Correction notice (2026-11-24).** This file was a 0-byte placeholder in the earlier ZIP and in the owner's commit `9488526be`; it certified nothing. It is rewritten here from real evidence. The fuller review is doc 24.

Scope of what the Admin Console can do with money: view escrows, transactions and payments; (for authorised finance staff) escrow actions; review dealer payout accounts. **No money was moved, refunded, released or paid out in any test.** Financial logic and RPCs were not modified.

| Check | Result | Evidence |
|---|---|---|
| Escrow list / operations dashboard / payments list readable only by admin, superadmin, accounts, escrow_officer (payments: admin, superadmin, accounts); every other actor refused; anonymous 401 | VERIFIED (disposable DB) | journey 31 E1 |
| Escrow release / refund / close refused for moderator, marketing, hr, personal, dealer; unknown escrow gives 4xx for the finance role, never 5xx or success | VERIFIED | journey 31 E2–E3 |
| No escrow, payment or wallet row created/changed by those calls | VERIFIED | journey 31 E4 |
| Dealer payout-account review (`POST /api/wallet/dealer-account/:id/review`) | **Fixed**: previously any staff role; now requires `manage_payments` (accounts, admin, superadmin). Refusals for moderator/hr/ad_manager/personal/anonymous; invalid decision or unknown account → 4xx | journey 34 W13–W15 |
| Escrow business rules, access, capability, payment safety, purchase decision, cron | VERIFIED (jest `tests/escrow`, 12 suites) | backend Jest batch `a` |
| Escrow state transitions executed against live providers | **NOT executed** | by rule |

Hosted drift: `transition_escrow` is not present in the hosted `public` schema (re-checked 2026-11-24). Noted; not replaced.
