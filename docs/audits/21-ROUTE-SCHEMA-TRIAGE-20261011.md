# Route-schema crawl: classification and corrections

**Method.** The real `server.js` runs on a disposable PostgreSQL built only from `supabase/migrations`, with Supabase default privileges reproduced. Every one of the 626 `GET` routes in `openapi.yaml` is called as a superadmin, with random UUIDs for path parameters (`tools/route-schema-crawl.mjs`). This phase made two changes to the tool:
- It records each response message and the server log lines a 500 produced (bearer tokens and JWTs redacted), so 500s without a database error could be classified.
- It accepts `CRAWL_ONLY=<routes file>` for group re-runs.

The tool `tools/classify-route-crawl.py` produces `evidence/runtime-convergence-20261011/route-schema/route-crawl-classification.json`.

## 1. Counts
| Run | 200 | 400 | 403 | 404 | 408 | 500 | 503 |
|---|---|---|---|---|---|---|---|
| Supplied baseline (previous phase) | 330 | 22 | 3 | 64 | 2 | **205** | 0 |
| Foundation re-run with detailed capture (`BEFORE-…detailed.json`) | 329 | 22 | 3 | 64 | 2 | **206** | 0 |
| After this phase (`AFTER-…detailed.json`) | 358 | 23 | 3 | 68 | 2 | **170** | 2 |

The foundation re-run differs from the supplied baseline by one route, `GET /api/fraud/check/dealer/{id}` (200 → 500). That route queries `fraud_detections`, a table that exists nowhere, and its handler alternates between swallowing and surfacing the error depending on timing. It is classified under group B. There are **no new failures**: no route that answered below 500 before answers 500 or more now (`newFailures: []`).

**34 routes fixed:** 29 now answer 200, 4 answer 404 and 1 answers 400. Two more (the dead-letter queue routes) now answer 503, which states correctly that a dependency is unavailable; they are counted under group E below. The remaining **172** (170 × 500 plus 2 × 503) are all classified below. None of them is an authorization denial, a missing grant, a migration-ordering problem or a fixture problem surfacing as a 500: the crawl runs as superadmin, and authorization failures already return 401/403.

## 2. Fixed (34)
| Route | Status | Root cause and correction |
|---|---|---|
| `GET /api/audit/statistics` | 500 → **200** | `aggregate` used but not imported (`escrowAuditService.js`) |
| `GET /api/cars/admin/{id}/fraud` | 500 → **404** | null car dereferenced → 404 |
| `GET /api/cars/dealer/analytics` | 500 → **200** | see crawl JSON |
| `GET /api/cars/dealer/my-cars` | 500 → **200** | see crawl JSON |
| `GET /api/cms/calendar` | 500 → **200** | `$or` with range operators serialised as `[object Object]` (22007) — `$or` builder in `models/_base.js` now supports `$gte/$lte/$gt/$lt/$ne/$in/$ilike` with AND inside a branch; calendar defaults to a 31-day window and rejects bad dates with 400 |
| `GET /api/cms/media` | 500 → **200** | sorted by non-existent `uploaded_at`; `cms_media.created_at` is the upload time (repository and production) |
| `GET /api/dealer-platform/analytics/recommendations` | 500 → **404** | same → 404 |
| `GET /api/dealer-platform/leads/{leadId}/activities` | 500 → **404** | `Lead not found` thrown as plain Error → 404 |
| `GET /api/dealer-platform/subscription` | 500 → **404** | non-dealer → `Dealer not found` plain Error → 404 |
| `GET /api/dealer/bids` | 500 → **200** | raw PostgREST calls used `dealer`, `carId`, `createdAt` and unsupported embeds; now real columns + two explicit lookups, same response shape |
| `GET /api/dealer/milestones` | 500 → **200** | raw PostgREST calls used camelCase columns (`cars.dealer`, `auctionStatus`); optional `dealer_health_scores` (production-only table) tolerated as `unscored` |
| `GET /api/executive-analytics/dashboard` | 500 → **200** | `bids.car` selected; fieldMap alias `car` → `car_id` added |
| `GET /api/executive-analytics/revenue` | 500 → **200** | `bids.car` selected; fieldMap alias `car` → `car_id` added |
| `GET /api/executive-analytics/user-growth` | 500 → **200** | `bids.car` selected; fieldMap alias `car` → `car_id` added |
| `GET /api/fraud/check/dealer/{dealerId}` | 500 → **200** | see crawl JSON |
| `GET /api/inspections/my-tasks` | 500 → **400** | stale OpenAPI path matched `/:id`; non-UUID ids now 400 (validateObjectId) — the route itself does not exist (`/my` does) |
| `GET /api/intelligence/auctions` | 500 → **200** | `bids.car` alias + `cars.clicks` column (migration 20261011130000) |
| `GET /api/intelligence/benchmarks` | 500 → **200** | `bids.car` alias + `cars.clicks` column (migration 20261011130000) |
| `GET /api/intelligence/dashboard` | 500 → **200** | `bids.car` alias + `cars.clicks` column (migration 20261011130000) |
| `GET /api/intelligence/dealers` | 500 → **200** | `bids.car` alias + `cars.clicks` column (migration 20261011130000) |
| `GET /api/intelligence/forecasts` | 500 → **200** | `bids.car` alias + `cars.clicks` column (migration 20261011130000) |
| `GET /api/intelligence/insights` | 500 → **200** | `bids.car` alias + `cars.clicks` column (migration 20261011130000) |
| `GET /api/intelligence/marketplace` | 500 → **200** | `bids.car` alias + `cars.clicks` column (migration 20261011130000) |
| `GET /api/intelligence/revenue` | 500 → **200** | `bids.car` alias + `cars.clicks` column (migration 20261011130000) |
| `GET /api/ledger/balance-sheet` | 500 → **200** | filtered `ledger_accounts.is_active`, a column that exists nowhere |
| `GET /api/ledger/trial-balance` | 500 → **200** | filtered `ledger_accounts.is_active`, a column that exists nowhere |
| `GET /api/ownership/dashboard` | 500 → **200** | TDZ bug: alerts query used `currentVehicles` inside the Promise.all that defines it (`ownership/services/ownershipService.js`) |
| `GET /api/reconciliation/integrity-score` | 500 → **200** | `ReconciliationReport.generateReportId` (Mongoose static never ported) and literal `"system"` written into a uuid column |
| `GET /api/v1/analytics/sales` | 500 → **200** | `cars.clicks` column (migration 20261011130000) |
| `GET /api/v1/analytics/sales/dealers` | 500 → **200** | `cars.clicks` column (migration 20261011130000) |
| `GET /api/v1/analytics/sales/dealers/{dealerId}` | 500 → **200** | `cars.clicks` column (migration 20261011130000) |
| `GET /api/v1/analytics/sales/revenue` | 500 → **200** | `cars.clicks` column (migration 20261011130000) |
| `GET /api/v1/preferences` | 500 → **200** | `fieldMap.user_preferences` aliased `user` → `user_id`, but the column is `user` in every migration and in production |
| `GET /prometheus` | 500 → **200** | metrics key split on every `:` (JSON tags contain `:`), histogram summaries spread as arrays, and 28 `incrementCounter(name, tags)` calls passing tags as the value; summaries now exported correctly |
Supporting corrections that are not tied to a single route:
- **FIN-3** (`middleware/idempotency.js`): `idempotencyCheck` runs before `protect` on `/api/bids` and `/api/escrow`. Every GET wrote an audit row with a null `key` (23502) and took a distributed lock named `idempotency:undefined`, which was shared by all such requests. Safe methods and requests that have no key now pass straight through.
- **Error classification** (`middleware/errorHandler.js`): when nothing upstream set a status, `22P02` (a malformed id) now returns 400 and `PGRST116` (`single()` matched nothing) returns 404. Missing tables and columns deliberately **stay 500**, because they are deployment or schema defects.
- **Metrics counters**: 33 `incrementCounter(name, tags)` calls in 10 files passed the tags object as the increment. That corrupted every counter value (`0[object Object]…`). All of them are now `incrementCounter(name, 1, tags)`.

Unit regression coverage is in `backend/tests/regression/routeSchemaTriageFixes.test.js` (8 tests): the fieldMap corrections, the 400/404 classification, missing schema kept at 500, explicit statuses never overridden, and FIN-3.

## 3. Remaining 172 by root cause
The group letters are those used in the classification JSON. Each missing table was checked against three sources:
- all repository migrations;
- the production catalog (read-only, 2026-10-11, `evidence/hosted-readonly-20261011`);
- the runtime queries recorded by the crawl.

### A. Missing table — exists only in production (DDL only in hosted migrations) — 27 routes

| Root cause | Routes |
|---|---|
| table(s) only in production (DDL in hosted-only migrations): bid_logs | 7: `/api/v1/bid-logs/admin/all`, `/api/v1/bid-logs/admin/stats`, `/api/v1/bid-logs/car/{carId}`, `/api/v1/bid-logs/car/{carId}/stats`, `/api/v1/bid-logs/car/{carId}/winning`, `/api/v1/bid-logs/my`, `/api/v1/bid-logs/{logId}` |
| table(s) only in production (DDL in hosted-only migrations): dealer_health_scores | 4: `/api/dealer-health-score/admin/alerts`, `/api/dealer-health-score/{dealerId}`, `/api/dealer-health-score/{dealerId}/details`, `/api/dealer-health-score/{dealerId}/trends` |
| table(s) only in production (DDL in hosted-only migrations): marketplace_health | 3: `/api/marketplace-health/admin/all`, `/api/marketplace-health/metrics`, `/api/marketplace-health/summary` |
| table(s) only in production (DDL in hosted-only migrations): job_failures | 2: `/api/admin/queue/failures`, `/api/admin/queue/failures/{failureId}` |
| table(s) only in production (DDL in hosted-only migrations): conversion_funnels | 2: `/api/funnel/cars/{carId}/analytics`, `/api/funnel/dealer/analytics` |
| table(s) only in production (DDL in hosted-only migrations): auction_integrity_flags | 2: `/api/new-admin/auction-integrity`, `/api/new-admin/auction-integrity/{id}` |
| table(s) only in production (DDL in hosted-only migrations): contacts | 1: `/api/contact` |
| table(s) only in production (DDL in hosted-only migrations): escrow_anomalies | 1: `/api/escrow/operations/dashboard` |
| table(s) only in production (DDL in hosted-only migrations): auction_integrity_flags, auction_risk_profiles | 1: `/api/new-admin/auction-integrity/dashboard` |
| table(s) only in production (DDL in hosted-only migrations): auction_risk_profiles | 1: `/api/new-admin/auction-integrity/risk-profiles` |
| table(s) only in production (DDL in hosted-only migrations): ntsa_verification_requests | 1: `/api/ntsa-verification/car/{carId}/status` |
| table(s) only in production (DDL in hosted-only migrations): transactions | 1: `/api/referral/stats` |
| table(s) only in production (DDL in hosted-only migrations): sms_bidders | 1: `/api/sms-bidding/my` |

### B. Missing table — exists nowhere (unimplemented subsystem) — 110 routes

| Root cause | Routes |
|---|---|
| table(s) in no migration and not in production: notification_audits | 5: `/api/notification-analytics/delivery-report`, `/api/notification-analytics/platform-stats`, `/api/notification-analytics/retry-queue`, `/api/notification-analytics/trends`, `/api/notification-analytics/user/{userId}/stats` |
| table(s) in no migration and not in production: location_master_data | 4: `/api/config/location`, `/api/config/location/cities`, `/api/config/location/countries`, `/api/config/location/regions` |
| table(s) in no migration and not in production: vehicle_master_data | 4: `/api/config/vehicle`, `/api/config/vehicle/makes`, `/api/config/vehicle/models`, `/api/config/vehicle/{id}` |
| table(s) in no migration and not in production: organizations | 4: `/api/organizations/platform-stats`, `/api/organizations/{id}`, `/api/organizations/{id}/stats`, `/api/organizations/{id}/users` |
| table(s) in no migration and not in production: error_budgets | 4: `/api/reliability/error-budgets`, `/api/reliability/error-budgets/{sloId}`, `/api/reliability/health`, `/api/reliability/report` |
| table(s) in no migration and not in production: config_entries | 3: `/api/config/entries`, `/api/config/entries/{id}`, `/api/config/export` |
| table(s) in no migration and not in production: feature_flags | 3: `/api/config/features`, `/api/config/features/check/{key}`, `/api/config/features/{id}` |
| table(s) in no migration and not in production: business_objects | 3: `/api/lowcode/objects`, `/api/lowcode/objects/{id}`, `/api/lowcode/objects/{id}/api` |
| table(s) in no migration and not in production: reports | 3: `/api/reports/admin/all`, `/api/reports/admin/{id}`, `/api/reports/my` |
| table(s) in no migration and not in production: security_logs | 3: `/api/security-logs`, `/api/security-logs/my`, `/api/security-logs/summary` |
| table(s) in no migration and not in production: vx_themes | 3: `/api/vxp/themes`, `/api/vxp/themes/default`, `/api/vxp/themes/{id}` |
| table(s) in no migration and not in production: experiences | 3: `/api/xos/experiences`, `/api/xos/experiences/{id}`, `/api/xos/resolve` |
| table(s) in no migration and not in production: ai_commands | 2: `/api/ai/analytics`, `/api/ai/history` |
| table(s) in no migration and not in production: ai_conversations | 2: `/api/ai/conversations`, `/api/ai/conversations/{id}` |
| table(s) in no migration and not in production: announcements | 2: `/api/announcements`, `/api/announcements/{id}` |
| table(s) in no migration and not in production: approval_chains | 2: `/api/automation/approvals`, `/api/automation/approvals/{id}` |
| table(s) in no migration and not in production: automation_tasks | 2: `/api/automation/tasks`, `/api/automation/tasks/{id}` |
| table(s) in no migration and not in production: notification_templates | 2: `/api/automation/templates/notifications`, `/api/automation/templates/notifications/{id}` |
| table(s) in no migration and not in production: workflows | 2: `/api/automation/workflows`, `/api/automation/workflows/{id}` |
| table(s) in no migration and not in production: country_configs | 2: `/api/config/countries`, `/api/config/countries/{id}` |
| table(s) in no migration and not in production: reference_data | 2: `/api/config/reference`, `/api/config/reference/{id}` |
| table(s) in no migration and not in production: scenarios | 2: `/api/digital-twin/scenarios`, `/api/digital-twin/scenarios/{id}` |
| table(s) in no migration and not in production: simulations | 2: `/api/digital-twin/simulations`, `/api/digital-twin/simulations/{id}` |
| table(s) in no migration and not in production: duplicate_vehicle_logs | 2: `/api/duplicates/all`, `/api/duplicates/{id}` |
| table(s) in no migration and not in production: fraud_detection | 2: `/api/fraud/all`, `/api/fraud/analytics` |
| table(s) in no migration and not in production: vx_pages | 2: `/api/vxp/pages`, `/api/vxp/pages/{id}` |
| table(s) in no migration and not in production: campaigns | 2: `/api/xos/campaigns`, `/api/xos/campaigns/{id}` |
| table(s) in no migration and not in production: journeys | 2: `/api/xos/journeys`, `/api/xos/journeys/{id}` |
| table(s) in no migration and not in production: ai_commands, ai_conversations, ai_knowledge, ai_prompts | 1: `/api/ai/dashboard` |
| table(s) in no migration and not in production: ai_knowledge | 1: `/api/ai/knowledge` |
| table(s) in no migration and not in production: ai_prompts | 1: `/api/ai/prompts` |
| table(s) in no migration and not in production: ai_workspaces | 1: `/api/ai/workspaces` |
| table(s) in no migration and not in production: workflow_logs | 1: `/api/automation/logs` |
| table(s) in no migration and not in production: scheduled_jobs | 1: `/api/automation/scheduled` |
| table(s) in no migration and not in production: automation_tasks, workflows | 1: `/api/automation/stats` |
| table(s) in no migration and not in production: config_audit_logs | 1: `/api/config/audit` |
| table(s) in no migration and not in production: config_entries, country_configs, feature_flags, location_master_data, reference_data, vehicle_master_data | 1: `/api/config/stats` |
| table(s) in no migration and not in production: predictions, scenarios, simulations | 1: `/api/digital-twin/dashboard` |
| table(s) in no migration and not in production: predictions | 1: `/api/digital-twin/predictions` |
| table(s) in no migration and not in production: feedback | 1: `/api/feedback/admin/all` |
| table(s) in no migration and not in production: inspections | 1: `/api/intelligence/inspections` |
| table(s) in no migration and not in production: listing_quality | 1: `/api/listing-quality/platform/trends` |
| table(s) in no migration and not in production: custom_dashboards | 1: `/api/lowcode/dashboards` |
| table(s) in no migration and not in production: object_fields | 1: `/api/lowcode/objects/{objectId}/fields` |
| table(s) in no migration and not in production: form_definitions | 1: `/api/lowcode/objects/{objectId}/forms` |
| table(s) in no migration and not in production: object_permissions | 1: `/api/lowcode/objects/{objectId}/permissions` |
| table(s) in no migration and not in production: object_relationships | 1: `/api/lowcode/objects/{objectId}/relationships` |
| table(s) in no migration and not in production: object_versions | 1: `/api/lowcode/objects/{objectId}/versions` |
| table(s) in no migration and not in production: view_definitions | 1: `/api/lowcode/objects/{objectId}/views` |
| table(s) in no migration and not in production: business_objects, form_definitions, object_fields, view_definitions | 1: `/api/lowcode/stats` |
| table(s) in no migration and not in production: branches | 1: `/api/organizations/{id}/branches` |
| table(s) in no migration and not in production: admin_alerts | 1: `/api/reconciliation/alerts` |
| table(s) in no migration and not in production: vx_advertisements | 1: `/api/vxp/advertisements` |
| table(s) in no migration and not in production: vx_cards | 1: `/api/vxp/cards` |
| table(s) in no migration and not in production: vx_components | 1: `/api/vxp/components` |
| table(s) in no migration and not in production: vx_sections | 1: `/api/vxp/sections` |
| table(s) in no migration and not in production: vx_advertisements, vx_cards, vx_pages, vx_sections, vx_themes | 1: `/api/vxp/stats` |
| table(s) in no migration and not in production: vx_versions | 1: `/api/vxp/versions` |
| table(s) in no migration and not in production: experience_analytics | 1: `/api/xos/analytics` |
| table(s) in no migration and not in production: audiences | 1: `/api/xos/audiences` |
| table(s) in no migration and not in production: campaigns, experiences, journeys, seasonal_themes | 1: `/api/xos/dashboard` |
| table(s) in no migration and not in production: navigation_rules | 1: `/api/xos/navigation-rules` |
| table(s) in no migration and not in production: seasonal_themes | 1: `/api/xos/themes` |
| table(s) in no migration and not in production: homepage_variants | 1: `/api/xos/variants` |

### C. Missing column — absent in repository and production (contract unresolved) — 6 routes

| Root cause | Routes |
|---|---|
| column(s) absent in repository and production: location | 1: `/api/analytics/market/county-trends` |
| column(s) absent in repository and production: user | 1: `/api/dealer/earnings` |
| column(s) absent in repository and production: business_address | 1: `/api/dealer/profile` |
| column(s) absent in repository and production: mpesa_business | 1: `/api/dealer/settlement` |
| column(s) absent in repository and production: issue_details.resolved | 1: `/api/finance/issues` |
| column(s) absent in repository and production: country | 1: `/api/intelligence/countries` |

### D. Genuine application defect — incomplete Mongo→Supabase port (undefined model / missing static) — 27 routes

| Root cause | Routes |
|---|---|
| incomplete Mongo->Supabase port: FeatureFlag is not defined | 7: `/api/feature-flags/category/{category}`, `/api/feature-flags/environment/{environment}`, `/api/feature-flags/meta/categories`, `/api/feature-flags/role/{role}`, `/api/feature-flags/user`, `/api/feature-flags/{key}`, `/api/feature-flags/{key}/stats` |
| incomplete Mongo->Supabase port: ListingQuality is not defined | 6: `/api/listing-quality/car/{carId}`, `/api/listing-quality/dealer/{dealerId}/report`, `/api/listing-quality/dealer/{dealerId}/stats`, `/api/listing-quality/platform/benchmarks`, `/api/listing-quality/platform/low-quality`, `/api/listing-quality/platform/stats` |
| incomplete Mongo->Supabase port: NotificationAudit is not defined | 5: `/api/notification-analytics/channel-stats`, `/api/notification-analytics/delivery-stats`, `/api/notification-analytics/engagement-metrics`, `/api/notification-analytics/failure-analysis`, `/api/notification-analytics/retry-stats` |
| incomplete Mongo->Supabase port: s.replace is not a function | 3: `/api/feature-flags`, `/api/fraud/check/auction/{carId}`, `/api/fraud/check/user/{userId}` |
| incomplete Mongo->Supabase port: JobFailure is not defined | 2: `/api/admin/queue/aggregated`, `/api/admin/queue/statistics` |
| incomplete Mongo->Supabase port: DealerHealthScore.getTopDealers is not a function | 2: `/api/dealer-health-score/ranking/list`, `/api/dealer-health-score/top/{category}` |
| incomplete Mongo->Supabase port: DealerHealthScore.getScoreDistribution is not a function | 1: `/api/dealer-health-score/admin/distribution` |
| incomplete Mongo->Supabase port: MarketplaceHealth is not defined | 1: `/api/marketplace-health/alerts` |

### E. Dependency unavailable (now 503, not 500) — 2 routes

| Root cause | Routes |
|---|---|
| dependency unavailable | 2: `/api/admin/queue/dlq/jobs`, `/api/admin/queue/dlq/statistics` |
## 4. What each group needs (no object was created to silence an error)
| Group | Responsible path | Action | Owner |
|---|---|---|---|
| A (27) | Hosted-only migrations (2026-09-19 → 22) created these tables in production; no repository file contains their DDL | Export the 38 hosted-only migrations (HIST-38), review them, commit them under their production versions, then re-run this crawl. The routes start working on staging built from production | owner, staging |
| B (110) | AI workspace, VX page builder, platform objects, workflows, config/feature flags, governance analytics, disputes v1, fraud and more — tables exist **nowhere**, not even in production | Product decision per subsystem: retire the routes (preferred where the frontend does not call them) or design and migrate them properly. Inventing schemas is out of scope | product owner |
| C (6) | `users.location` (county trends), `users.country`, `users.business_address`, `users.mpesa_business`, `payments.user` (dealer earnings also reads payer payments as dealer income — a contract error), `reconciliation_reports.issue_details.resolved` (JSON path filter) | Confirm the intended data contract (where dealer settlement details and earnings live), then fix the query or add a reviewed migration | product / finance owner |
| D (27) | Mongoose statics and models never ported: `FeatureFlag.*`, `ListingQuality.*`, `NotificationAudit.*`, `MarketplaceHealth.*` (service), `DealerHealthScore.getTopDealers/getScoreDistribution`, `JobFailure.*` | Port each static to explicit queries **after** the backing tables exist (most are in groups A/B). Adding imports alone would only turn a ReferenceError into a missing-table error | engineering, after A/B decisions |
| E (2) | Dead-letter queue not initialised (Bull/Redis) | Correct 503 now; the queue must be initialised in the deployment that runs workers | operations |

Background jobs (not routes) still log at boot: `disputes` and `error_budgets` (missing everywhere), `bid_count` (an analytics aggregate column alias that exists nowhere) and `escrows.warning_sent` (FIN-1, owner decision, unchanged).
