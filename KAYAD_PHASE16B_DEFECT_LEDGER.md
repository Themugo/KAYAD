# KAYAD Phase 16B — Prioritized defect ledger

Machine-readable companion: `KAYAD_PHASE16B_HTTP_500_DEFECT_LEDGER.csv` (one row per exception: route, role used, baseline class and logged cause, status after 16B, severity, root cause, change, disposition).

## A. The "66" application exceptions
Re-running the Phase 16 probe on a correctly migrated disposable DB (with Redis up) found **69** application-exception rows, not 66 (the three extra are routes that previously failed as environment errors while Redis was down). Every row was re-called as an authorised admin while the backend log was tailed; the logged cause decided the class. **A 500 was never treated as evidence of authorization safety** — authorization was assessed separately by the 16-role matrix.

| Disposition | Rows | Meaning |
|---|---|---|
| FIXED (application defect → correct 2xx/4xx) | 18 | minimal code change, tests added |
| DEFERRED – missing schema / missing import in unprovisioned features | 43 | not defects of this code path; the tables or models do not exist in the migrated DB |
| DEFERRED – protected financial / auction / escrow domain | 8 | deliberately not modified (payment, escrow, settlement, ledger, auction ending) |

Whole-matrix effect: routes that return a 500 to at least one role fell 239 → 222 (19 routes cleared, 2 routes — `GET /api/admin/queue/metrics` and `/health` — now show their true cause, the same missing `JobFailure` import as `queue/statistics`, instead of the baseline's Redis `ERR`). Of the 19 cleared routes, 18 are in the ledger; `POST /api/cms/pages/:id/rollback` also cleared as a side-effect of the shared fixes and was not separately classified.

## B. Prioritized ledger
| # | Sev | Defect | Root cause | Affected workflows | State |
|---|---|---|---|---|---|
| 1 | **P1** | Owner MFA lockout bypass under concurrency | Failure counter was read-modify-write: N parallel wrong codes all read "0 failures" and were all evaluated (40 parallel → 25 evaluated against a limit of 5; 12 parallel on the original code → 12 evaluated, never locked) | owner sign-in, invitation, removal, recovery step-up | **FIXED** (CAS charge-before-evaluate; now exactly 5 evaluated, 35 locked) + E2E S7 + unit contract test |
| 2 | P2 | `findByIdAndUpdate(...).lean()/.populate()/.select()` threw (facade returned a plain promise) | `models/_base.js` | reconciliation alert read, market-data update, auction-integrity status, user settings | **FIXED** (chainable thenable, identical value when unchained) |
| 3 | P2 | Mongo-style sort objects crashed the db helper (`s.replace is not a function`) | `db/index.js applyOrdering` | `GET /api/fraud/check/auction/:carId` (now 200) | **FIXED** |
| 4 | P2 | DB 22P02/PGRST116 mapping was dead code behind `asyncHandler` (it stamps `statusCode=500` on every error) | `middleware/errorHandler.js` | governance changes/approvals/policies/features-stage (now 404), invalid identifiers (400) | **FIXED**, with a financial-path guard so webhook/payment/escrow/ledger/auction errors keep their previous behaviour |
| 5 | P2 | Communications admin threw plain `Error` → 500 and echoed user input in messages | `communicationControl.service.js` | templates, rollout channels/events, delivery retry (now 400/404, generic messages) | **FIXED** |
| 6 | P2 | Missing request validation → `TypeError` → 500 | cms/automation/configuration/lowCode controllers | banners reorder, scheduled job, config bulk/import, lowcode objects/fields reorder/ai suggest (now 400) | **FIXED** |
| 7 | P3 | Dealer onboarding "Next"/"Submit" button text #0a3340 on #176B87 (2.23:1, axe *serious*) | `src/pages/dealer/DealerOnboarding.jsx` | dealer onboarding accessibility | **FIXED** (white text ≈ 5.8:1); axe clean |
| 8 | P1 (hosted) | `kayad_register_identity_atomic` absent on hosted → registration unavailable | hosted drift | public registration | **Candidate migration + rollback rehearsed (47/47); NOT applied** |
| 9 | P1 (hosted) | Dealer columns + `suspended` status CHECK absent on hosted | hosted drift | dealer onboarding, suspension | **same candidate; NOT applied** |
| 10 | P2 | Feature-flag subsystem unprovisioned (`FeatureFlag` not imported, `feature_flags` absent; fail-closed) | product decision | 10 routes | DEFERRED |
| 11 | P2 | Escrow accounts ×3, escrow operations dashboard, finance issues/resolve, reconciliation report resolve, auction-admin end | protected domain | admin finance/escrow | DEFERRED – protected |
| 12 | P3 | Queue statistics/aggregated/metrics/health (`JobFailure` not imported), dealer-health-score ×4, marketplace-health alerts (`MarketplaceHealth` not imported), fraud check user (`disputes` absent), intelligence countries (`users.country` absent), `PUT /api/users/settings` (columns absent) | missing import and/or schema in features not provisioned in the repo schema | admin tooling | DEFERRED |
| 13 | P3 | config ×7, automation ×4, lowcode ×4, platform-factory ×3, ads, announcements, market-data, auction-integrity | tables absent in the migrated DB | admin tooling | DEFERRED |
| 14 | P3 | Many services throw plain `Error` for "not found / invalid" which maps to 500 | convention | scattered | DEFERRED (pattern noted; fixed only where reproduced) |
| 15 | P3 | Owner-management mobile table cells are cramped (ledger columns clip at 390px; no page overflow) | cosmetic | owner UI at phone width | DEFERRED (screenshot `owner_management_390.png`) |
