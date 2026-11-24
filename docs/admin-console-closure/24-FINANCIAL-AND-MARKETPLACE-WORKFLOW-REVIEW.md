# 24 — Financial and marketplace workflow review

Evidence level: LOCAL / DISPOSABLE-DB only. Fixtures were created in throw-away databases (`kayad_ci_*`). **No money was moved; no refund, escrow release, payout, settlement, auction launch, live NTSA submission or real communication was performed. No financial function or RPC was modified or replaced.** Only access-control middleware was added to three routes (below).

| Area | Authorisation | Validation | State transitions / idempotency | Replay / concurrency | Audit | Evidence |
|---|---|---|---|---|---|---|
| Escrows (list, dashboard, release/refund/close) | admin, superadmin, accounts, escrow_officer only; others 403, anon 401 | unknown escrow → 4xx | not executed (no live transition) | not executed | existing escrow audit; not re-proved | journey 31 E1–E4; jest `tests/escrow` (12 suites) |
| Transactions / payments list | admin, superadmin, accounts | read model | n/a | n/a | n/a | journey 31 E1 |
| Auction admin (end/extend/winner) | **`POST /api/bids/:id/end` now needs `manage_auctions`** (was any staff) | extend non-live and winner-without-bid → 4xx | end with none live is idempotent (200 `alreadyClosed`/4xx), vehicle unchanged | repeat end is a no-op | existing | journeys 31 E5–E9, 34 W16–W17 |
| Auction **platform policy** (`PUT /api/auctions/platform/policy`) | **now needs `manage_platform` (admin, superadmin)** — was any staff, including moderator and HR; no console page calls it | service unchanged | not executed with real data | n/a | `auction_platform_policy_updated` | journey 34 W17b–W17d |
| Bids admin feed | `manage_auctions` (read) | n/a | n/a | n/a | n/a | journey 32 T3 |
| Inspections / inspector applications | role allow-lists (doc 08) | n/a | decisions/provider dispatch NOT executed | — | — | journey 31 E10 |
| NTSA queue | `manage_inspections` + staff role (admin, superadmin, ghost_checker) | internal queue | **internal only; no live NTSA call** | — | — | journeys 27 D4–D7, 31 E10 |
| Featured campaigns | `manage_ads` | strict schema (`carId,startsAt,endsAt`); invalid → 400 | pause repeat-safe; end/delete require `confirm:true` | — | `featured_campaign_*` audit rows | journey 34 W7–W12 |
| Dealer payout-account review | **`POST /api/wallet/dealer-account/:id/review` now needs `manage_payments`** (was any staff); list already gated | invalid decision/unknown account → 4xx | not executed with a real account | — | existing | journey 34 W13–W15 |
| Dealer suspension / reinstatement | Admin requests, Super Admin decides (doc 21) | yes | compare-and-swap | 4 simultaneous decisions → exactly 1 wins | `dealer_*_request_*` | journey 33 |

## Hosted function drift (read-only check 2026-11-24, updated in the final closure)
The earlier wording "`transition_escrow` is absent" named the wrong object. Hosted `public` has no function called `transition_escrow`; the canonical function is `kayad_transition_escrow_atomic`, which **is present hosted (6 arguments; body not compared, financial logic frozen)**. `kayad_reconciliation_issue_rows` is absent hosted, as are `dealer_suspension_requests`, `reports`, `feedback` and `private_seller_capabilities` (evidence: `evidence/hosted-readonly/six-objects-20261124.txt`). **Noted; nothing replaced or created.**

## Residual finding — CLOSED in the final closure (doc 28)
The any-staff write routes listed here earlier (feature flags, hero, localization, organizations, regional config, queue/DLQ, notification retries, disputes, fraud, loans, dealer health score, auction integrity, reliability, metrics reset, cache flush and others) now require an **existing** permission. 63 routes that every staff role could pass became 9 (own-alert reads, idea board, automation task workflow = owner decision OD-5). One defect remains open because it touches the frozen auction flow: **UD-1** (anonymous `POST /api/bids/:id/bid` answers 200 "Processing" before authentication; no bid is placed).

## Not verified in this phase
Live provider callbacks (M-Pesa etc.), real payout/refund flows, escrow transitions against hosted, auction settlement with real bids, NTSA live integration.
