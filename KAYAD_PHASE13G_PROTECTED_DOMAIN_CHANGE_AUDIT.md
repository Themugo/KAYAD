# KAYAD Phase 13G — Protected-Domain Change Audit

Method: `diff -rq` of the 13G tree against the verified 13F tree (excluding node_modules, dist, validation-logs, evidence). Result: 13 modified, 6+ added files (`KAYAD_PHASE13G_FILE_CHANGE_LEDGER.csv`), 0 deleted, 0 renamed.

| protected area | files changed | verdict |
|---|---|---|
| payments, M-Pesa, escrow, ledger, bid activation, settlement, refund, forfeiture, reconciliation, webhooks, payouts, idempotency, concurrency | none under `backend/services`, `backend/controllers`, `backend/routes`, `backend/jobs` | unchanged |
| Super Admin authentication / auth middleware / CSRF / RLS policies / audit | none | unchanged |
| public pages, dealer workflows | only CSS/class-level accessibility edits in `DealerDashboard.tsx`, `DashboardHub.tsx`, `AuctionExperienceRail.tsx`, `PrivateSellerPlatform.tsx`, `AdminPrivateSellerApplications.tsx`, `auction-experience-2.css`; no workflow logic | cosmetic only; dealer HTTP isolation (13F matrix 103/103) and browser dealer-hub check pass |
| identities / ownership | none | no merge or reassignment |

## Shared data-layer files that changed (disclosed because every domain passes through them)
`backend/db/index.js`, `backend/models/_base.js`, `backend/utils/fieldMap.js`.
- `applyFilters`: new `$or`/`$ilike` branch only; existing branches untouched.
- `_base.js`: `$text` and `$or`-regex string building (quoting/sanitising), `$meta` sort key skipped, and `Model.updateMany` accepts the operator-less shorthand. Callers audited: `Model.updateMany` is used by `BidLog.updateMany` and `Car.updateMany` (both with `$set`/`$inc`, unaffected) and `AdminAlert.updateMany` ×2 (the only shorthand users, previously silent no-ops). The standalone `updateMany(table, …)` helper used by escrow/auction code lives in `db/index.js` and its update path was not modified.
- `fieldMap.js`: only a new `chats` entry. The escrow `warningSent` alias was deliberately left absent (FIN-1).
- Full jest suites that cover the financial domains (157 suites / 2799 tests) and the financial validators (`financial-audit-rls-hardening`, `payment-escrow-domain`, `financial-ledger-reconciliation-domain`, `high-risk-boundaries`, `database-contract-alignment`) pass.

## Protected items found and left unchanged (documented, not fixed)
`bids.is_suspicious`, `bids.bid_count`, `escrows.warning_sent`, `escrow_issues → issue_details` embed, `transactions`, `escrow_anomalies`. These need owner-approved changes in the protected financial/bid domains.

## Data touched
`admin_alerts` is the reconciliation writer's target table (new, empty). No financial row, no real transaction, no staging or production system was contacted.
