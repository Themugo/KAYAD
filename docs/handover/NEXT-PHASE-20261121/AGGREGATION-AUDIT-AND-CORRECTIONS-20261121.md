# Aggregation audit and corrections — 2026-11-21

Status labels: VERIFIED = executed with evidence (`ci-run3/06_aggregate_shim.log`, jest `aggregateEngine.test.js`).

## 1. Defects found in the old `Model.aggregate()` (`backend/models/_base.js`)
Each was **reproduced against a real database** (1,300 `payments` + 1,100 `audit_logs` rows, SQL ground truth) before any fix; the journey went 1/16 passing on the old code.

| # | Defect | Observed effect (old code) |
|---|---|---|
| D1 | `model.find({})` read the table once; PostgREST `max-rows` (1000) truncated it silently | `$match`+`$sum` over 1,300 rows returned count **982**, sum **3,925,000** vs SQL **1,300 / 5,200,000** — a dashboard total that looks right but is low |
| D2 | `$match` operator objects (`$gte/$lte/$in`) fell through to strict equality | every ranged/`$in` pipeline returned **[]** (audit dashboard, finance `createdAt:{$gte}`, fraud, CMS, duplicates) — the "zero activity" answer |
| D3 | Falsy operands ignored (`$gte: 0`) | rows wrongly included/excluded |
| D4 | `$count`, `$facet` ignored → stage skipped, **raw documents returned** | operations dashboard received documents instead of counts |
| D5 | `$min`/`$max`/`$first`/`$push`/`$addToSet`, `$cond`, `$project` expressions ignored | `maxBid:null`, bid stats missing |
| D6 | Compound `_id` collapsed to one group | breakdowns merged into a single row |
| D7 | `$sort` used first key only and subtracted values | string keys (`_id`, status) not ordered |
| D8 | `$avg` treated missing values as 0 and left `_avgSum/_avgCount` internals on rows | averages biased low; internal fields leaked (the old `_avg*` fields) |
| D9 | `$unwind`, `$lookup`, dotted paths silently ignored | silently wrong |

## 2. Correction
* New `backend/models/aggregateEngine.js` (pure, unit-tested): `$match` (eq, `$eq/$ne/$gt/$gte/$lt/$lte/$in/$nin/$exists/$regex`, `$and/$or/$nor`, Date vs ISO string compared as instants), `$group` (`_id` null / field / compound; `$sum/$avg/$min/$max/$first/$last/$push/$addToSet`, Mongo null semantics, numeric strings coerced), `$sort` multi-key, `$limit/$skip/$count/$facet/$unwind/$project`, expressions `$cond/$ifNull/$add/$subtract/$multiply/$divide/$round/$size`.
* **Anything else throws `AggregateUnsupportedError`** (code `AGGREGATE_UNSUPPORTED`). No silent skipping.
* `aggregate()` now reads the table in 1000-row pages ordered by `id` until empty (hard stop at 500k rows → loud error, never a partial total) and pushes down only filters whose SQL semantics equal Mongo's (equality, `$gt/$gte/$lt/$lte/$in`; **not** `$ne/$nin`, which differ on NULL). The engine re-checks every condition.
* Behavioural changes callers should know: `$avg` now ignores missing values (Mongo semantics) instead of counting them as 0; results previously empty because of D2 now contain data.
* Limits: still an in-memory scan. Money/counts on large tables should move to SQL/RPC (as done for reconciliation via `kayad_reconciliation_issue_rows`). Not changed here.

## 3. Call sites (32) — all classified
All 32 pipelines use only operators the engine now supports (checked from the operator inventory below); none will throw. Defects D1/D2 affected **every** one.

| Site | Model | Priority | Operators used |
|---|---|---|---|
| `controllers/securityLogController.js:126` | SecurityLog | P3 analytics/audit/CMS | action, group, limit, sort, sum |
| `controllers/financeController.js:213` | ReconciliationReport | P1 finance/escrow/payment/reconciliation | group, gte, match, reportType, sum |
| `controllers/financeController.js:219` | ReconciliationReport | P1 finance/escrow/payment/reconciliation | avg, group, gte, match, successRate |
| `controllers/escrowOperationsController.js:65` | Escrow | P1 finance/escrow/payment/reconciliation | amount, group, match, sum |
| `controllers/escrowOperationsController.js:66` | Escrow | P1 finance/escrow/payment/reconciliation | amount, group, in, match, sum |
| `controllers/operationsController.js:20` | Escrow | P2 operations/fraud dashboards | count, facet, gte, in, lt, match |
| `controllers/operationsController.js:30` | InspectionOrder | P2 operations/fraud dashboards | count, facet, gte, in, lt, match |
| `controllers/operationsController.js:40` | User | P2 operations/fraud dashboards | count, facet, gte, match |
| `controllers/operationsController.js:49` | Escrow | P2 operations/fraud dashboards | count, facet, gte, in, match |
| `controllers/operationsController.js:50` | Payment | P2 operations/fraud dashboards | count, facet, gte, match |
| `controllers/duplicateController.js:278` | DuplicateVehicleLog | P3 analytics/audit/CMS | group, gte, match, matchType, sum |
| `controllers/duplicateController.js:282` | DuplicateVehicleLog | P3 analytics/audit/CMS | detectionMethod, group, gte, match, sum |
| `controllers/duplicateController.js:288` | DuplicateVehicleLog | P3 analytics/audit/CMS | avg, group, gte, match, matchScore |
| `controllers/bidLogController.js:260` | BidLog | P2 operations/fraud dashboards | addToSet, amount, autoBids, avg, avgBidAmount, car, cond, divide, group, isAutoBid, isProxyBid, match, max, min, multiply, project, proxyBids, round, size, sum, totalBids, uniqueCars, uniqueUsers, user |
| `controllers/bidLogController.js:297` | BidLog | P2 operations/fraud dashboards | group, match, status, sum |
| `controllers/bidLogController.js:303` | BidLog | P2 operations/fraud dashboards | group, match, source, sum |
| `controllers/reconciliationController.js:163` | ReconciliationRecord | P1 finance/escrow/payment/reconciliation | group, match, outcome, sum |
| `controllers/fraudController.js:32` | FraudDetection | P2 operations/fraud dashboards | count, facet, gte, lt, match |
| `controllers/fraudController.js:50` | FraudDetection | P2 operations/fraud dashboards | fraudType, group, gte, match, sort, sum |
| `controllers/fraudController.js:55` | FraudDetection | P2 operations/fraud dashboards | group, gte, match, severity, sum |
| `controllers/cmsController.js:899` | CMSAnalytics | P3 analytics/audit/CMS | group, limit, match, metadata, sort, sum |
| `controllers/cmsController.js:1049` | CMSAnalytics | P3 analytics/audit/CMS | event, group, gte, match, sum |
| `controllers/cmsController.js:1054` | CMSAnalytics | P3 analytics/audit/CMS | contentId, group, gte, limit, match, sort, sum |
| `controllers/auditController.js:506` | AuditLog | P3 analytics/audit/CMS | action, group, gte, match, sort, sum |
| `controllers/auditController.js:511` | AuditLog | P3 analytics/audit/CMS | actor, group, gte, limit, match, sort, sum |
| `controllers/auditController.js:517` | AuditLog | P3 analytics/audit/CMS | group, gte, match, severity, sum |
| `controllers/auditController.js:521` | AuditLog | P3 analytics/audit/CMS | group, gte, match, sort, sum, targetModel |
| `routes/referralRoutes.js:21` | Transaction | P1 finance/escrow/payment/reconciliation | amount, group, match, sum |
| `routes/adminRoutes.js:283` | Escrow | P1 finance/escrow/payment/reconciliation | commission, group, match, sum |
| `routes/adminRoutes.js:285` | Car | P1 finance/escrow/payment/reconciliation | favoritesCount, group, sum |
| `routes/adminRoutes.js:2218` | Payment | P1 finance/escrow/payment/reconciliation | amount, group, match, sum |
| `routes/adminRoutes.js:2426` | Transaction | P1 finance/escrow/payment/reconciliation | amount, group, match, sum |

Highest-impact before the fix: `financeController:213/219` (reconciliation windows → D2 → zeros), `escrowOperationsController:65/66` (held totals → D1 truncation + D2 `$in` → **0**), `adminRoutes:283/285/2218/2426` (platform commission/payment totals → D1), `referralRoutes:21` (D1), `operationsController` (D4: documents instead of counts).

## 4. Evidence
* `ci/db-journeys/06_aggregate_shim.mjs` — 16 DB-backed checks against SQL ground truth (old code 1/16, new code 16/16), wired into `ci/db-journeys/run.sh` (PostgREST `db-max-rows=1000` set explicitly in the CI config).
* `backend/tests/regression/aggregateEngine.test.js` — 7 unit tests, including the bid-stats pipeline and a loud-refusal test.
* Full run: `/home/claude/align/out/ci-run3/` (14 journeys, `overall=PASS`).

## 5. Not done / residual
* Per-endpoint figures were not re-verified against hosted data (read-only hosted verification of each dashboard not performed).
* Endpoints still scan whole tables; performance on very large tables (audit_logs, analytics) not measured.
