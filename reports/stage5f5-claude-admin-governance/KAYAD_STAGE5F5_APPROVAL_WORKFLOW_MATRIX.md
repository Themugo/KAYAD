# KAYAD Stage 5F.5 — Approval Workflow Matrix

Only workflows that already exist in source were audited. No new approval policy was invented; separation of duties was added nowhere because no existing policy requires it (OD-6).

| Workflow | Request | Decision authority | Guard (source) | Idempotency / audit | Tested |
|---|---|---|---|---|---|
| Dealer approval / verification | Dealer registers → `status=pending` | admin-class staff | `requireDecisionAuthority("dealer")`, `manage_users` | audit row with before/after; verification email via Brevo only after state change | jest + real stack (role_api_e/h/i) |
| Listing moderation | Seller submits → `pending` | staff with `manage_cars`/moderation | `requireDecisionAuthority("listing")` | audit; bulk moderate bounded | jest + real stack (role_api_g) |
| Escrow release | Buyer `request-release` | `approve_escrow_release` | `escrowReleaseOnly` | idempotency key; audit | jest regression suites |
| Escrow refund | Request | `approve_escrow_refund` | `escrowRefundOnly` | idempotency key; audit | jest |
| Escrow settlement / payout | After release | `settle_escrow_payout` | `escrowSettlementOnly` | idempotency; audit | jest |
| Staff governance | Owner | **owner only** | `requireOwner` + `protectAccount` | `auditAfterCommit` before/after (D-15) | jest (stage5f5StaffGovernance) + real stack |
| Owner designation | Owner | owner only (DB mode: membership table) | owners.js | audit | jest + disposable PG (97/97 governance checks) |

Distinct permissions exist for release, refund and settlement, but the default `admin` role holds all three, so one admin can request→approve→settle (OD-2/OD-6). No live payment, refund or escrow operation was executed; all escrow tests ran against mocks or the disposable DB with stub providers.
