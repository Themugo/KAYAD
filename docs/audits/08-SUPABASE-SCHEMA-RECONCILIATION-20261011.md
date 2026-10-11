# Supabase schema reconciliation (Phases A and B)

## 1. Target and access (Phase A)
| Item | Finding |
|---|---|
| Production project (per repository docs and the owner) | **KAYAD EA — `ubvgixwhfybbyjuvxboj`** (`docs/production/SUPABASE_PRODUCTION_BOOTSTRAP.md`, `scripts/bootstrap-supabase-production.mjs`; confirmed by the owner on 2026-10-11) |
| Authorised read-only connection from this session | Initially **not available** (connector listed only unrelated projects). The owner connected the KAYAD org at 14:42 EAT. From then on, **read-only catalog queries only** were run against production: migration metadata, `pg_catalog`/`information_schema`, the security advisor, and aggregate edge-log counts. No row data, DDL, writes or migrations. Evidence: `evidence/hosted-readonly-20261011/HOSTED-READONLY-FINDINGS.md`. No credentials were requested or printed |
| A second project ref in the repository | `zmbsskvnzjdaxuxlauyx` is hard-coded in 15 scripts under `scripts/` (mostly `verify-*.mjs`), one of which (`verify-database-contract.mjs`) calls it "the Topline project" and requires `supabase/config.toml` to be pinned to it — but `config.toml` has **no `project_id` at all**. **CFG-REF-1 (P2):** scripts pinned to a non-KAYAD project risk being run against the wrong database; nothing pins the CLI to the production ref (a manual `supabase link` decides). Not changed (owner decision) |
| Environment variables (names only) | backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (service role, server only); frontend: no Supabase client (`InitializationScreen` still mentions `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` as setup text only) |
| Server-side database access | `backend/utils/supabase.js` (supabase-js, service role) + `backend/db/index.js` / `models/_base.js` (Mongo-style API translated to PostgREST, camel↔snake via `utils/fieldMap.js`) + 54 `rpc()` calls |
| `supabase/seed.sql` / fixtures | none in the repository |
| Read-only operator path | `supabase/preflight/INVENTORY_SCHEMA_SECURITY.sql` → `scripts/supabase-reconcile.mjs` (diff) and `scripts/supabase-code-references.mjs` (code needs vs catalog) |

## 2. Three sources of truth
| Source | What was available | Result |
|---|---|---|
| 1. Repository migrations | 175 files, 175 unique versions (`validate-supabase-migrations.mjs` PASS); replay from empty: `applied=175 failed=0` (plain and with Supabase default privileges) | baseline inventory: `evidence/certification-20261011/schema/repo-inventory-supabase-defaults.json` (201 public tables, all RLS-enabled; 106 functions (incl. the harness `rls_auto_enable()` stub); extensions `plpgsql, pgcrypto, uuid-ossp`; publication `supabase_realtime` = bids, cars, conversations, messages, notifications; one platform stub `rls_auto_enable()` supplied by the harness) |
| 2. Supabase migration history | **live: SOURCE-VERIFIED (2026-10-11)**: 135 production versions, last `20260922060457`; 97 shared with the repository; **52 repository migrations newer than anything in production**; 26 older repository-only versions (21 applied in production under another version with the same name, 5 absent by name); **38 production-only versions with no SQL in the repository** (§Hosted below). Earlier snapshot: Dated snapshot in the repository: `docs/SUPABASE_MIGRATION_HISTORY_RECONCILIATION.json` (generated 2026-09-22 for `ubvgixwhfybbyjuvxboj`): 131 remote entries, 97 matched, **34 remote-only** (applied to production, SQL not in the repository: e.g. `p0a_market_transaction_schema_reconciliation`, `p0a_operational_schema_reconciliation`, `phase15`–`phase22_*`, `phase4_dealer_rls_role_hardening`, `phase5_finance_payout_ledger_integrity`, `phase9_payment_escrow_financial_integrity`) and 5 local-only. Its own policy: *do not repair/remove remote history until schema-effect equivalence is proven*. 73 migrations were added to the repository after that snapshot; whether production has them is unknown | **The repository cannot rebuild production.** The most plausible origin of most "missing" objects below is those 34 remote-only migrations (their names match the affected domains: market transactions, operational schema, admin identity, disputes, payouts) — **unproven until their SQL is exported** |
| 3. Actual schema | **SOURCE-VERIFIED (production catalog, read-only)**: 209 public tables, 93 functions, RLS enabled on every table, PostgreSQL 17.6 | fingerprint diff vs repository replay: 24 production-only tables, 16 repository-only, 18 with different columns; 31 functions differ, 26 production-only, 39 repository-only (§Hosted) |

**Highest-value next action (owner):** export the 38 production-only migrations' SQL from production (`select version, name, statements from supabase_migrations.schema_migrations where version in (…)` — read-only), review it, and commit it as forward migrations. That closes most of §3 without inventing anything, and lets a staging database be built from the repository.

## 3. Objects referenced by deployed code but created by no repository migration
Method: `scripts/supabase-code-references.mjs` (static ESM reachability from `backend/server.js`, db-layer helpers, `createModel`, `.from()`, `.rpc()`), plus the runtime crawl `harness/tools/route-schema-crawl.mjs` (real `server.js` booted on a migration-only database; background jobs for 45 s; every documented GET route called as superadmin; PostgreSQL errors attributed to routes). Classification used: *confirmed present*, *present but inconsistent*, *missing from the repository*, *missing from hosted* (cannot be stated — BLOCKED), *platform-provided*, *obsolete/unreferenced*, *unknown*.
Required test for every row: once the hosted DDL is exported, re-run `route-schema-crawl.mjs` on a replay that includes it (target: zero `42P01` for the table). Migration needed: **only** from exported hosted DDL or an owner-approved design — never from this list.

Deployed code (files reachable from `backend/server.js`: 532) references **248 tables** and **54 RPC functions**. All 54 RPCs exist in the migration chain. **101 tables do not.** Runtime crawl on a migration-built database: 626 GET routes called as superadmin → status {"200": 330, "400": 22, "403": 3, "404": 64, "408": 2, "500": 205}; 247 routes hit a database error; 14 errors from boot/background jobs.


#### Financial / payments / disputes (12)

| Table | Consumers (deployed code) | DDL outside migrations | Hit at runtime (crawl) | Classification |
|---|---|---|---|---|
| `bid_logs` | models/BidLog.js | — | 7 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `dispute_cases` | governance/services/governanceService.js | backend/db/governance.schema.sql | not hit by GET crawl | Missing from repository (DDL only in `backend/db/governance.schema.sql`, not deployed by migrations); hosted: unknown |
| `dispute_evidence` | governance/services/governanceService.js | backend/db/governance.schema.sql | not hit by GET crawl | Missing from repository (DDL only in `backend/db/governance.schema.sql`, not deployed by migrations); hosted: unknown |
| `dispute_timeline` | governance/services/governanceService.js | backend/db/governance.schema.sql | not hit by GET crawl | Missing from repository (DDL only in `backend/db/governance.schema.sql`, not deployed by migrations); hosted: unknown |
| `disputes` | services/disputeCron.js, services/escrowAnomalyDetectionService.js, services/fraudDetectionService.js | — | 1 route(s) + boot/jobs | Missing from repository (no DDL anywhere); hosted: unknown |
| `escrow_anomalies` | models/EscrowAnomaly.js, services/escrowAnomalyDetectionService.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `escrow_risk_scores` | services/escrowAnomalyDetectionService.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `fraud_detection` | models/FraudDetection.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `fraud_detections` | services/dealerHealthScoreService.js, services/fraudDetectionService.js, services/marketplaceHealthService.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `fraud_reports` | governance/services/governanceService.js | backend/db/governance.schema.sql | not hit by GET crawl | Missing from repository (DDL only in `backend/db/governance.schema.sql`, not deployed by migrations); hosted: unknown |
| `sms_bidders` | models/SmsBidder.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `transactions` | models/Transaction.js, services/dealerHealthScoreService.js, services/marketplaceHealthService.js (+2) | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |

#### Messaging / notifications (5)

| Table | Consumers (deployed code) | DDL outside migrations | Hit at runtime (crawl) | Classification |
|---|---|---|---|---|
| `announcements` | models/Announcement.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `contacts` | models/Contact.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `feedback` | models/Feedback.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `notification_audits` | services/notificationAnalyticsService.js, services/notificationRetryService.js | — | 5 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `notification_templates` | models/NotificationTemplate.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |

#### Security / operations logs (8)

| Table | Consumers (deployed code) | DDL outside migrations | Hit at runtime (crawl) | Classification |
|---|---|---|---|---|
| `admin_alerts` | models/AdminAlert.js, services/reconciliationService.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `auction_integrity_flags` | models/AuctionIntegrityFlag.js, services/auctionIntegrityService.js | — | 4 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `auction_risk_profiles` | models/AuctionRiskProfile.js, services/auctionIntegrityService.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `duplicate_vehicle_logs` | models/DuplicateVehicleLog.js, services/duplicateVehicleService.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `error_budgets` | models/ErrorBudget.js, services/sliTrackingService.js | — | 6 route(s) + boot/jobs | Missing from repository (no DDL anywhere); hosted: unknown |
| `job_failures` | models/JobFailure.js, services/ecpService.js | — | 14 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `scheduled_jobs` | models/ScheduledJob.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `security_logs` | models/SecurityLog.js, services/ecpService.js | — | 17 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |

#### Configuration / master data / flags (11)

| Table | Consumers (deployed code) | DDL outside migrations | Hit at runtime (crawl) | Classification |
|---|---|---|---|---|
| `config_audit_logs` | models/ConfigAuditLog.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `config_entries` | models/ConfigEntry.js | — | 4 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `country_configs` | models/CountryConfig.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `feature_flags` | models/FeatureFlag.js, services/featureFlagService.js | — | 4 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `form_definitions` | models/FormDefinition.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `homepage_variants` | models/HomepageVariant.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `location_master_data` | models/LocationMasterData.js | — | 5 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `navigation_rules` | models/NavigationRule.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `reference_data` | models/ReferenceData.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `seasonal_themes` | models/SeasonalTheme.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `vehicle_master_data` | models/VehicleMasterData.js | — | 4 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |

#### Governance / organisation (11)

| Table | Consumers (deployed code) | DDL outside migrations | Hit at runtime (crawl) | Classification |
|---|---|---|---|---|
| `approval_chains` | models/ApprovalChain.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `branches` | services/organizationService.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `certifications` | governance/services/governanceService.js | backend/db/governance.schema.sql | not hit by GET crawl | Missing from repository (DDL only in `backend/db/governance.schema.sql`, not deployed by migrations); hosted: unknown |
| `compliance_alerts` | governance/services/governanceService.js | backend/db/governance.schema.sql | not hit by GET crawl | Missing from repository (DDL only in `backend/db/governance.schema.sql`, not deployed by migrations); hosted: unknown |
| `departments` | services/organizationService.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `entity_registry` | governance/services/governanceService.js | backend/db/governance.schema.sql | not hit by GET crawl | Missing from repository (DDL only in `backend/db/governance.schema.sql`, not deployed by migrations); hosted: unknown |
| `governance_audit_log` | governance/services/governanceService.js | backend/db/governance.schema.sql | not hit by GET crawl | Missing from repository (DDL only in `backend/db/governance.schema.sql`, not deployed by migrations); hosted: unknown |
| `organizations` | services/organizationService.js | backend/db/identity.schema.sql | 4 route(s) | Missing from repository (DDL only in `backend/db/identity.schema.sql`, not deployed by migrations); hosted: unknown |
| `roles` | services/organizationService.js | backend/db/identity.schema.sql | not hit by GET crawl | Missing from repository (DDL only in `backend/db/identity.schema.sql`, not deployed by migrations); hosted: unknown |
| `trust_score_history` | governance/services/governanceService.js | backend/db/governance.schema.sql | not hit by GET crawl | Missing from repository (DDL only in `backend/db/governance.schema.sql`, not deployed by migrations); hosted: unknown |
| `verification_applications` | governance/services/governanceService.js | backend/db/governance.schema.sql | not hit by GET crawl | Missing from repository (DDL only in `backend/db/governance.schema.sql`, not deployed by migrations); hosted: unknown |

#### Analytics / intelligence (16)

| Table | Consumers (deployed code) | DDL outside migrations | Hit at runtime (crawl) | Classification |
|---|---|---|---|---|
| `conversion_funnels` | models/ConversionFunnel.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `custom_dashboards` | models/CustomDashboard.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `dealer_analytics` | models/DealerAnalytics.js | backend/db/vehicleIntelligence.schema.sql | not hit by GET crawl | Missing from repository (DDL only in `backend/db/vehicleIntelligence.schema.sql`, not deployed by migrations); hosted: unknown |
| `dealer_health_scores` | models/DealerHealthScore.js, routes/dealerRoutes.js, services/dealerHealthScoreScheduler.js (+1) | — | 5 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `experience_analytics` | models/ExperienceAnalytics.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `inspections` | services/intelligenceService.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `listing_quality` | services/listingQualityService.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `market_data` | models/MarketData.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `marketplace_health` | models/MarketplaceHealth.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `marketplace_healths` | services/marketplaceHealthService.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `ntsa_verification_requests` | models/NtsaVerificationRequest.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `predictions` | models/Prediction.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `reports` | models/Report.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `scenarios` | models/Scenario.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `simulation_results` | models/SimulationResult.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `simulations` | models/Simulation.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |

#### Platform builders (AI, VX, objects, workflows, CMS ext.) (35)

| Table | Consumers (deployed code) | DDL outside migrations | Hit at runtime (crawl) | Classification |
|---|---|---|---|---|
| `ai_commands` | models/AICommand.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `ai_conversations` | models/AIConversation.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `ai_knowledge` | models/AIKnowledge.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `ai_prompts` | models/AIPrompt.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `ai_workspaces` | models/AIWorkspace.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `audiences` | models/Audience.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `automation_tasks` | models/AutomationTask.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `business_objects` | models/BusinessObject.js | — | 4 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `campaigns` | models/Campaign.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `experiences` | models/Experience.js | — | 4 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `journeys` | models/Journey.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `object_fields` | models/ObjectField.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `object_indexes` | models/ObjectIndex.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `object_permissions` | models/ObjectPermission.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `object_relationships` | models/ObjectRelationship.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `object_versions` | models/ObjectVersion.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `platform_brands` | models/PlatformBrand.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `platform_components` | models/PlatformComponent.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `platform_products` | models/PlatformProduct.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `platform_templates` | models/PlatformTemplate.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `view_definitions` | models/ViewDefinition.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `vx_advertisements` | models/VXAdvertisement.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `vx_cards` | models/VXCard.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `vx_components` | models/VXComponent.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `vx_layouts` | models/VXLayout.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `vx_pages` | models/VXPage.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `vx_sections` | models/VXSection.js | — | 2 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `vx_styles` | models/VXStyle.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `vx_themes` | models/VXTheme.js | — | 4 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `vx_versions` | models/VXVersion.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `vx_widgets` | models/VXWidget.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `workflow_actions` | models/WorkflowAction.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `workflow_logs` | models/WorkflowLog.js | — | 1 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |
| `workflow_triggers` | models/WorkflowTrigger.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `workflows` | models/Workflow.js | — | 3 route(s) | Missing from repository (no DDL anywhere); hosted: unknown |

#### Other (3)

| Table | Consumers (deployed code) | DDL outside migrations | Hit at runtime (crawl) | Classification |
|---|---|---|---|---|
| `ads` | models/Ad.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `subscriptions` | services/reconciliationService.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |
| `teams` | services/organizationService.js | — | not hit by GET crawl | Missing from repository (no DDL anywhere); hosted: unknown |

#### Column-name drift observed at runtime (code queries a column the migrated table does not have)

| Error | Routes |
|---|---|
| 42703: column "uploaded_at" does not exist | GET /api/cms/media |
| 42703: column bid_count does not exist | BOOT/BACKGROUND JOB |
| 42703: column business_address does not exist | GET /api/dealer/profile |
| 42703: column car does not exist | GET /api/executive-analytics/dashboard, GET /api/executive-analytics/revenue, GET /api/executive-analytics/user-growth, GET /api/fraud/check/dealer/{dealerId} … |
| 42703: column carId does not exist | GET /api/dealer/bids |
| 42703: column clicks does not exist | GET /api/cars/dealer/analytics, GET /api/cars/dealer/my-cars, GET /api/intelligence/benchmarks, GET /api/intelligence/dealers … |
| 42703: column country does not exist | GET /api/intelligence/countries |
| 42703: column dealer does not exist | GET /api/dealer/analytics, GET /api/dealer/bids, GET /api/dealer/cars, GET /api/dealer/milestones … |
| 42703: column is_active does not exist | GET /api/ledger/balance-sheet, GET /api/ledger/trial-balance |
| 42703: column issue_details.resolved does not exist | GET /api/escrow/operations/case/{id}, GET /api/finance/issues |
| 42703: column kyc_verified does not exist | GET /api/command-center/dealers, GET /api/operations/dealer-queue, GET /api/v1/analytics/operations/dealer-onboarding |
| 42703: column location does not exist | GET /api/analytics/market/county-trends |
| 42703: column mpesa_business does not exist | GET /api/dealer/settlement |
| 42703: column receiver does not exist | GET /api/dealer/summary |
| 42703: column scheduled_date does not exist | GET /api/command-center/inspections, GET /api/operations/inspection-queue |
| 42703: column status does not exist | GET /api/ai/suggestions |
| 42703: column type does not exist | GET /api/command-center/mission-control, GET /api/ecp/deployments |
| 42703: column user does not exist | GET /api/dealer/analytics, GET /api/dealer/earnings, GET /api/dealer/summary |
| 42703: column user_id does not exist | GET /api/v1/preferences |
| 42703: column verified does not exist | GET /api/command-center/dealers, GET /api/operations/dealer-queue, GET /api/v1/analytics/operations/dealer-onboarding |
| 42703: column warning_sent does not exist | BOOT/BACKGROUND JOB |
| 42703: column wholesale does not exist | GET /api/dealer/trade-listings |

#### Other runtime database errors (not schema objects)

| Error | Routes |
|---|---|
| 22007: invalid input syntax for type timestamp with time zone: "[object Object]" | GET /api/cms/calendar |
| 22P02: invalid input syntax for type uuid: "my-tasks" | GET /api/inspections/my-tasks |
| 23502: null value in column "key" of relation "idempotency_audit_logs" violates not-nul | GET /api/disputes, GET /api/disputes/my, GET /api/disputes/stats, GET /api/disputes/{id} … |
| PGRST116: JSON object requested, multiple (or no) rows returned | GET /api/ai/decision/vehicles/{vehicleId}/explain, GET /api/cars/admin/{id}/fraud, GET /api/cars/{id}/insights, GET /api/cars/{id}/price-history … |
| PGRST200: embedded resource select not supported by emulator: car:cars(title,price,images) | GET /api/dealer/escrows |
| PGRST200: embedded resource select not supported by emulator: member:users(name,email,phon | GET /api/dealer/team |

## 4. Previously reported objects — final classification
| Object | Type | Repository references | Created by | Hosted (verified?) | Runtime impact on a migration-built DB | Risk | Correction | Test | Migration needed? |
|---|---|---|---|---|---|---|---|---|---|
| `transactions` | table | payment callback (every callback), bid security, auction registration, reconciliation, health analytics | **no migration**; probably remote-only `p0a_market_transaction_schema_reconciliation` (unproven) | unknown | **every M-Pesa callback failed** (`m5-financial-webhooks` 3/7 before) | P0 money | code now stores security payments in `payments` (the FK target declared by 20261002193000/20261007180000) with a legacy fallback | `m5-financial-webhooks` 7/7, `m13` 5/5 | no (contract already in `payments`); remaining readers after hosted export |
| `config_entries`, `config_audit_logs`, `feature_flags`, `country_configs`, `reference_data`, `location_master_data`, `vehicle_master_data` | tables | `/api/config/*` models (admin-only since the security sweep), makes lookup | no migration | unknown | config admin routes 500; vehicle makes lookup 500 | P2 | export hosted DDL or retire routes | crawl | after export |
| `disputes` | table | dispute cron, fraud detection, escrow anomaly service | no migration (user dispute API uses `escrows.dispute*`) | unknown | cron error each cycle | P2 | export or point the cron at `escrows` | crawl (boot/jobs) | after export |
| `error_budgets` | table | SLO tracking | no migration | unknown | error logged every cycle (non-fatal) | P3 | export or disable SLO job | crawl | after export |
| `warning_sent` / `warningSent` (escrows) | column | escrow cron | `"warningSent"` exists (20260710044900) | unknown | **present but inconsistent**: the db layer queries `warning_sent` → cron aborts → auto-release dormant | P1 (FIN-1) | intentionally unchanged pending owner decision | `fieldMapSchemaReconciliation` pins it | no |
| `bid_count` | column | a background job filters `bids` by it | no migration | unknown | job error each cycle | P3 | fix the query after hosted check | crawl (boot/jobs) | no |
| `notifications.is_read` | column | ops/ECP dashboards (`isRead`) | column is `read` | — | dashboards silently miscount | P3 | **fixed** (alias `isRead → read`) | `m11` #2 | no |
| escrow `dispute*` columns | columns | ops dispute queues via the db layer | present (camelCase) | — | queues failed | P3 | **fixed** (identity aliases) | `m11` #1 | no |
| `profiles.updated_at` + role sync | column + trigger | `trg_profiles_updated_at`, `is_admin()` | trigger exists, column missing | unknown | **every profiles UPDATE failed**; `is_admin()` stale | P2 | **fixed** (20261011121000) | `m10` #12 | **yes — added** |
| `rls_auto_enable()` | function | REVOKE/ALTER in 2 migrations | **platform-provided** (Supabase event-trigger helper) | — | fresh non-Supabase replay needs a stub | — | none (harness stub) | chain replay | no |
| Messaging outbox (`chat_message_outbox`, 5 functions) | table + functions | chat controller, outbox worker | 20261011100000 | unknown (not applied) | — | — | — | `m8`, `m8b`, `m10` | applied locally only |
| Chat attachment metadata | jsonb inside `chats.messages[].attachments` (`uploadId`, `provider`, `publicId`) | attachment service/controller | no schema change (JSON) | — | — | — | — | `m6`, `m12` | no |
| Upload records (`uploads`) | **local SQLite / JSON file**, not PostgreSQL | upload store | `backend/services/sqlUploadStore.js` | n/a | ephemeral on Render except the mounted disk; attachments fall back to Cloudinary ids stored in the message | P3 | documented | `m6` #7 | no |

## 5. Hosted-only verification still required
Resolved on production 2026-10-11 by read-only catalog queries (see §Hosted): which of the 101 tables exist (15), whether the post-snapshot migrations are applied (no: 52 pending), and the remote-only count (38). Still required: run `INVENTORY_SCHEMA_SECURITY.sql` on the **staging** clone and attach the full JSON diff. Also confirm by schema diff on staging whether the 38 hosted-only effects explain the 5 unmatched older repository migrations.


## Hosted — production facts (read-only, 2026-10-11)
Full detail: `evidence/hosted-readonly-20261011/HOSTED-READONLY-FINDINGS.md` (plus version lists, statement digests, privilege snapshot, advisor summary).

* **Deploy-order blocker (P0).** Production lacks every object added since 2026-09-22 that the current backend needs: `chat_message_outbox`, `chat_message_idempotency`, `users.deactivated_at`, the auction registration/security tables, `profiles.updated_at`. Edge logs show that the backend serving production today never touches them, so it is an older build. The 52 migrations must reach a staging clone of production, then production, **before** this backend is deployed.
* **SCH-101 against production:** of the 101 code-referenced tables that no repository migration creates, 15 exist in production (`transactions`, `contacts`, `bid_logs`, `market_data`, `marketplace_health`, `job_failures`, `sms_bidders`, `ntsa_verification_requests`, `dealer_analytics`, `dealer_health_scores`, `conversion_funnels`, `escrow_anomalies`, `escrow_risk_scores`, `auction_integrity_flags`, `auction_risk_profiles`). Their DDL is in the hosted-only migrations. **86 exist nowhere**, so their routes fail in production too (product decision: retire or design).
* **`transactions` in production:** id, user_id, car_id, payment_id, escrow_id, type, status, amount, currency, metadata, created_at, updated_at. It has no `checkout_request_id`, so it was never the store for security payments. This confirms the `payments` decision in `13-…`.
* **Migration history cannot be pushed as-is:** `supabase db push` refuses while remote-only versions exist. Plan in `11-…` §6.
* Tables only in production (24): admin_action_requests, admin_control_registry, admin_control_state, auction_integrity_flags, auction_risk_profiles, bid_logs, contacts, conversion_funnels, dealer_analytics, dealer_health_scores, escrow_anomalies, escrow_provider_integrations, escrow_risk_scores, inspection_commercial_config, inspection_provider_availability, inspection_provider_scorecards, inspection_report_downloads, job_failures, market_data, marketplace_health, notification_audit, ntsa_verification_requests, sms_bidders, transactions.
* Tables only in the repository (16): the auction_* registration/security tables, chat_message_idempotency, chat_message_outbox, hero_placements, hero_slides, provider_service_capabilities, purchase_outcomes, report_corrections, report_versions.
* Tables whose columns differ (18): ad_slots, communication_deliveries, dealers, escrow_audits, idempotency_audit_logs, inspection_packages, inspection_providers, inspection_reports, inspection_staff, inspector_applications, platform_config, profiles, provider_credentials, refresh_tokens, roadside_service_requests, support_tickets, users, vehicle_service_offerings.
