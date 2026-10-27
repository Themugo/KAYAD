# KAYAD Phase 16C — HTTP 500 route-exception report

Source: fresh role × route probe on the 16C tree (786 routes × 16 roles, legacy owner mode, disposable stack): **identical to the 16B final matrix — same route set, zero status differences, 222 routes / 1,309 cells with a 500.** After the two 16C fixes the re-probe shows **220 routes / 1,291 cells**; the only status differences from 16B are the two fixed routes (9 role cells each). Every 500 was re-called as an authorised admin while the backend log was tailed (`classify_500s.cjs`); causes below are from that log, from source inspection, from direct model probes, or are labelled *inferred*.

**A 500 is not treated as proof of authorization, nor as harmless.** Several staff roles (moderator, hr, accounts, …) reach admin-prefixed handlers by the existing staff policy documented in the 16B authorization matrix; that is unchanged in 16C.

Full per-route data (route, roles, cause, evidence, status): `KAYAD_PHASE16C_HTTP_500_ROUTE_EXCEPTION_REPORT.csv`.

## Totals (222 baseline routes)

| Bucket | Routes | Notes |
|---|---|---|
| 1 Confirmed application defect | 18 | code defects: 2 **fixed**, 16 deferred (need feature ports, see below) |
| 2 Missing schema / migration dependency | 20 | schema exists in hosted but not in repo migrations, or a column missing |
| 3 Unprovisioned / unsupported feature | 147 | tables absent in hosted and in every repo migration; module never provisioned |
| 4 Invalid test fixture | 23 | empty probe body hits a NOT NULL/CHECK constraint; no valid-input defect shown |
| 5 Protected financial/auction/escrow (excluded) | 14 | financial/escrow/auction/reconciliation routes — excluded by the phase rules, not modified |
| **Total** | **222** | |

## Bucket 1 — confirmed application defects

| Route | Cause | Status |
|---|---|---|
| `GET /api/dealer-health-score/ranking/list` | controller calls DealerHealthScore statics that do not exist (getTopDealers/getScoreDistribution) | open |
| `GET /api/dealer-health-score/top/:category` | controller calls DealerHealthScore statics that do not exist (getTopDealers/getScoreDistribution) | open |
| `POST /api/dealer-health-score/admin/recalculate/:dealerId` | missing dealer thrown as plain Error -> 500 instead of 404 | FIXED 16C: now 404 DEALER_NOT_FOUND (live re-probe + Jest) |
| `GET /api/dealer-health-score/admin/distribution` | controller calls DealerHealthScore statics that do not exist (getTopDealers/getScoreDistribution) | open |
| `GET /api/marketplace-health/alerts` | services/marketplaceHealthService.js uses MarketplaceHealth.getActiveAlerts/getHealthTrend without import; statics not defined on the model. | open |
| `GET /api/feature-flags/user` | services/featureFlagService.js uses FeatureFlag without importing it, AND the model has none of the statics it calls (getByKey, isEnabled, ...); table feature_flags absent in hosted. Legacy Mongoose-era feature, deliberately fail- | open |
| `GET /api/feature-flags/:key` | services/featureFlagService.js uses FeatureFlag without importing it, AND the model has none of the statics it calls (getByKey, isEnabled, ...); table feature_flags absent in hosted. Legacy Mongoose-era feature, deliberately fail- | open |
| `POST /api/feature-flags/:key/toggle` | services/featureFlagService.js uses FeatureFlag without importing it, AND the model has none of the statics it calls (getByKey, isEnabled, ...); table feature_flags absent in hosted. Legacy Mongoose-era feature, deliberately fail- | open |
| `GET /api/feature-flags/:key/stats` | services/featureFlagService.js uses FeatureFlag without importing it, AND the model has none of the statics it calls (getByKey, isEnabled, ...); table feature_flags absent in hosted. Legacy Mongoose-era feature, deliberately fail- | open |
| `GET /api/feature-flags/category/:category` | services/featureFlagService.js uses FeatureFlag without importing it, AND the model has none of the statics it calls (getByKey, isEnabled, ...); table feature_flags absent in hosted. Legacy Mongoose-era feature, deliberately fail- | open |
| `GET /api/feature-flags/environment/:environment` | services/featureFlagService.js uses FeatureFlag without importing it, AND the model has none of the statics it calls (getByKey, isEnabled, ...); table feature_flags absent in hosted. Legacy Mongoose-era feature, deliberately fail- | open |
| `GET /api/feature-flags/role/:role` | services/featureFlagService.js uses FeatureFlag without importing it, AND the model has none of the statics it calls (getByKey, isEnabled, ...); table feature_flags absent in hosted. Legacy Mongoose-era feature, deliberately fail- | open |
| `GET /api/feature-flags/meta/categories` | services/featureFlagService.js uses FeatureFlag without importing it, AND the model has none of the statics it calls (getByKey, isEnabled, ...); table feature_flags absent in hosted. Legacy Mongoose-era feature, deliberately fail- | open |
| `POST /api/feature-flags/batch/evaluate` | missing input validation on keys | FIXED 16C: now 400 INVALID_KEYS (live re-probe + Jest) |
| `GET /api/admin/queue/metrics` | services/queueMetricsService.js uses JobFailure (getFailureRate/getFailureStatistics) without import; the model defines neither static. job_failures exists in hosted, not in repo migrations. | open |
| `GET /api/admin/queue/statistics` | services/queueMetricsService.js uses JobFailure (getFailureRate/getFailureStatistics) without import; the model defines neither static. job_failures exists in hosted, not in repo migrations. | open |
| `GET /api/admin/queue/health` | services/queueMetricsService.js uses JobFailure (getFailureRate/getFailureStatistics) without import; the model defines neither static. job_failures exists in hosted, not in repo migrations. | open |
| `GET /api/admin/queue/aggregated` | services/queueMetricsService.js uses JobFailure (getFailureRate/getFailureStatistics) without import; the model defines neither static. job_failures exists in hosted, not in repo migrations. | open |

**Why 16 are deferred, not patched:** the calls are to Mongoose-era statics (`FeatureFlag.getByKey`, `JobFailure.getFailureStatistics`, `MarketplaceHealth.getActiveAlerts`, `DealerHealthScore.getTopDealers`, …) that the PostgREST facade models do not define, against tables the repository migrations never create. Adding the missing `import` alone turns a `ReferenceError` into a `TypeError`/`42P01` — it does not make the feature work, and the feature-flag service is intentionally fail-closed (Stage 4A). Fixing them means porting features and adding migrations, which is a product decision, not a defect fix within this phase.

## Bucket 2 — missing schema / migration dependency

| Route | Cause |
|---|---|
| `GET /api/admin/referrals/stats` | missing table transactions (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/admin/market-data` | missing table market_data (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/admin/market-data/:id` | missing table market_data (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `PUT /api/admin/market-data/:id` | module tables absent locally and not created by any repo migration: market_data |
| `DELETE /api/admin/market-data/:id` | missing table market_data (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/ntsa-verification/car/:carId/status` | missing table ntsa_verification_requests (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/fraud/check/user/:userId` | missing table disputes (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/dealer-health-score/:dealerId` | missing table dealer_health_scores (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/dealer-health-score/:dealerId/details` | missing table dealer_health_scores (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/dealer-health-score/:dealerId/trends` | missing table dealer_health_scores (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/dealer-health-score/admin/alerts` | missing table dealer_health_scores (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/marketplace-health/summary` | missing table marketplace_health (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `POST /api/marketplace-health/alerts/:alertId/resolve` | missing table marketplace_health (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/marketplace-health/metrics` | missing table marketplace_health (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/marketplace-health/admin/all` | missing table marketplace_health (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/admin/queue/failures` | missing table job_failures (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `GET /api/admin/queue/failures/:failureId` | missing table job_failures (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `POST /api/admin/queue/failures/:failureId/resolve` | missing table job_failures (hosted has it; repo migrations do not create it: repo/hosted drift) |
| `POST /api/cms/media` | missing column alt |
| `GET /api/intelligence/countries` | column users.country missing (not in repo migrations) |

## Bucket 3 — unprovisioned / unsupported modules (by module)

| Module | Routes | Cause (representative) |
|---|---|---|
| `/api/config` | 40 | missing table config_entries (absent in hosted too: feature never provisioned) |
| `/api/automation` | 30 | missing table workflows (absent in hosted too: feature never provisioned) |
| `/api/lowcode` | 30 | missing table business_objects (absent in hosted too: feature never provisioned) |
| `/api/organizations` | 11 | missing table organizations (absent in hosted too: feature never provisioned) |
| `/api/duplicates` | 5 | missing table duplicate_vehicle_logs (absent in hosted too: feature never provisioned) |
| `/api/reliability` | 5 | missing table error_budgets (absent in hosted too: feature never provisioned) |
| `/api/announcements` | 5 | module tables absent locally and not created by any repo migration: announcements |
| `/api/admin` | 4 | missing table ads (absent in hosted too: feature never provisioned) |
| `/api/feature-flags` | 4 | missing table feature_flags (absent in hosted too: feature never provisioned) |
| `/api/reports` | 4 | missing table reports (absent in hosted too: feature never provisioned) |
| `/api/security-logs` | 3 | missing table security_logs (absent in hosted too: feature never provisioned) |
| `/api/platform-factory` | 3 | module tables absent locally and not created by any repo migration: platform_products, platform_brands |
| `/api/fraud` | 2 | missing table fraud_detection (absent in hosted too: feature never provisioned) |
| `/api/intelligence` | 1 | missing table inspections (absent in hosted too: feature never provisioned) |

Evidence quality: where the classifier logged `42P01`/`PGRST205` the table name is exact; routes whose handler swallowed the message (module-level rows with *INFERRED* evidence in the CSV) are attributed by the tables their route file's models need, and for the `config_*` models a direct `Model.create({})` probe returned `42P01`. They are not proven per request.

## Bucket 4 — invalid test fixtures

The probe sends an empty body to every mutating route. These routes accept the request and the database rejects it (`23502` not-null / check). No defect in valid input handling is shown; hardening them with request validation (400 instead of 500) is recommended but was not done blanket-wise because a not-null violation can equally be a server bug.

| Route | Detail |
|---|---|
| `POST /api/cms/analytics/track` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/cms/pages` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/cms/content` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/cms/faqs` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/cms/campaigns` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/cms/banners` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/cms/taxonomies` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/cms/ab-tests` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/automation/rules` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/governance/policies` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/governance/changes` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/governance/approvals` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/governance/features` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/governance/risks` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/governance/standards` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/governance/countries` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/governance/partners` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/governance/releases` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/governance/decisions` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/command-center/war-room/activate` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/command-center/war-room/deactivate` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/improvement/ideas/:ideaId/vote` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |
| `POST /api/ownership/vehicles` | empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejec |

## Bucket 5 — protected routes (not modified)

| Route | Underlying class |
|---|---|
| `POST /api/admin/escrow/accounts` | 4: Escrow bank account name, bank name and account number are required [protected domain: not modified in 16C] |
| `PATCH /api/admin/escrow/accounts/:id` | 4: Escrow bank account name, bank name and account number are required [protected domain: not modified in 16C] |
| `DELETE /api/admin/escrow/accounts/:id` | 4: Escrow account not found [protected domain: not modified in 16C] |
| `GET /api/escrow/operations/dashboard` | 4: 'issue_details' is not an embedded resource in this request [protected domain: not modified in 16C] |
| `POST /api/escrow/operations/reconcile` | 4: empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejects it); no valid-inp |
| `POST /api/auction-admin/:carId/end` | 5: auction route; no cause logged (protected, not investigated) [protected domain: not modified in 16C] |
| `GET /api/finance/issues` | 5: finance route [protected domain: not modified in 16C] |
| `POST /api/finance/reports/:reportId/issues/:issueIndex/resolve` | 4: Error: Report not found [protected domain: not modified in 16C] |
| `POST /api/reconciliation/reports/:reportId/resolve` | 4: Error: Report not found [protected domain: not modified in 16C] |
| `GET /api/new-admin/auction-integrity/dashboard` | 2: missing table auction_integrity_flags (hosted has it; repo migrations do not create it: repo/hosted drift) [pr |
| `GET /api/new-admin/auction-integrity` | 2: missing table auction_integrity_flags (hosted has it; repo migrations do not create it: repo/hosted drift) [pr |
| `GET /api/new-admin/auction-integrity/risk-profiles` | 2: missing table auction_risk_profiles (hosted has it; repo migrations do not create it: repo/hosted drift) [prot |
| `GET /api/new-admin/auction-integrity/:id` | 2: missing table auction_integrity_flags (hosted has it; repo migrations do not create it: repo/hosted drift) [pr |
| `PATCH /api/new-admin/auction-integrity/:id/status` | 5: auction route; no cause logged (protected, not investigated) [protected domain: not modified in 16C] |

Routes in this bucket include the `finance/issues` embed error (`PGRST108 'issue_details' is not an embedded resource`) and escrow/operations dashboard — real defects in protected financial surfaces that need a separately authorised phase.

## Fix verification (focused re-probes)

* `POST /api/feature-flags/batch/evaluate` (empty body): 500 → **400 `INVALID_KEYS`**.
* `POST /api/dealer-health-score/admin/recalculate/<unknown id>`: 500 → **404 `DEALER_NOT_FOUND`**.
* Jest: `phase16cRouteExceptionFixes.test.js` 11/11. Full matrix re-run: only these two routes changed.
