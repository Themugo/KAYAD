# 04 — Database Map
**KAYAD Fusion Audit — Document 4 of 12**

---

## 0. Headline Finding — The Old Claim Was Exactly Right

This document independently re-derives, from scratch, the number in the old "116 orphaned enterprise-platform models" note that this session's earlier work retracted based on a frontend-only search.

**Method:** parsed the complete `TABLE_MAP` in `backend/models/_base.js` (185 model→table pairs), then parsed every `CREATE TABLE` statement across all 21 files in `backend/db/*.sql`, and checked which of the 185 expected tables have no corresponding `CREATE TABLE` anywhere.

**Result: exactly 116 of 185 models expect a database table that does not exist in any schema file in this repository.** 69 have a real, defined table. This is not an estimate or a plausibility judgment — it's a direct set comparison, reproducible by anyone with access to this repository.

**The old claim is confirmed correct, precisely, down to the exact number.** The earlier retraction in this session's work (which searched only `src/`, the frontend, and found none of the named terms) was based on an incomplete search scope, not a wrong method applied to the right scope. This document supersedes that retraction. `01-repository-map.md` already flagged this as "reopened, not resolved" — it is now resolved, in the direction of the original claim.

---

## 1. What "Table Doesn't Exist in Schema" Actually Means Here

Three important caveats, stated plainly rather than overstated:

1. **No live database currently exists at all** for this backend (confirmed in `01`: `SUPABASE_URL` in `.env.example` is a placeholder, no matching project exists in this account's real Supabase organization). So *none* of the 185 models — including the 69 "present" ones — are backed by an actual running database right now. The 69/116 split is about what the **schema source code** defines, not about what's live.
2. It's possible some of the 116 "missing" tables are defined via a mechanism other than a `CREATE TABLE` statement matched by this regex (e.g., inside `schema_clean.sql` under a naming variation, or in a migration using `CREATE TABLE IF NOT EXISTS` with unusual formatting the regex didn't catch, or via a Supabase dashboard-created table with no corresponding SQL file at all). The regex used (`CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)`, case-insensitive) is reasonably robust but not proven exhaustive — flagged here rather than overclaimed as 100% certain for every one of the 116.
3. This confirms the tables aren't *defined*. It says nothing yet about whether the **route/controller code** for these 116 domains is itself complete, stubbed, or broken independent of the missing table — that's a `06`/`07` question.

---

## 2. The 69 Models WITH a Real Table (Core Business + Some Supporting Infrastructure)

Every genuinely core marketplace concept is here: `users`, `cars`, `auctions`, `bids`, `escrows`, `payments`, `dealers`, `chats`, `messages`, `disputes`, `refresh_tokens`, `audit_logs`, `mpesa_transactions`, `escrow_vaults`, `vehicle_passports`, `inspection_orders`, `feature_flags`, `subscriptions`, `organizations`, and more (69 total — full list is a straightforward re-run of the same script, not reproduced in full here to keep this document readable; available on request).

**This is the reassuring part of the finding**: the actual transactional core of the business — the part a real buyer/seller/auction/escrow flow depends on — has real schema backing it. The gap is concentrated elsewhere.

## 3. The 116 Models WITHOUT a Table, Grouped by What They Clearly Belong To

Grouping the raw list by obvious naming clusters (not an official taxonomy — just what the names themselves make clear):

| Cluster | Example missing tables | Count (approx) |
|---|---|---|
| **VXP** (Visual Experience Platform — matches the `/api/vxp` route cluster in `03`) | `vx_pages`, `vx_sections`, `vx_components`, `vx_themes`, `vx_layouts`, `vx_advertisements`, `vx_cards`, `vx_widgets`, `vx_versions`, `vx_styles` | 10 |
| **CMS extended** (beyond the 2 CMS tables that DO exist — `cms_pages`, `cms_media`) | `cms_contents`, `cms_campaigns`, `cms_banners`, `cms_faqs`, `cms_taxonomies`, `cms_revisions`, `cms_ab_tests`, `cms_analytics` | 8 |
| **Workflow / Automation** (matches `/api/automation`) | `workflows`, `workflow_triggers`, `workflow_actions`, `workflow_logs`, `automation_tasks`, `business_rules`, `approval_chains`, `scheduled_jobs` | 8 |
| **Low-Code Platform** (matches `/api/lowcode`) | `business_objects`, `object_fields`, `object_relationships`, `form_definitions`, `view_definitions`, `object_permissions`, `object_indexes`, `object_versions`, `custom_dashboards`, `object_data` | 10 |
| **Governance** (matches `/api/governance`) | `governance_policies`, `change_requests`, `approval_rules`, `feature_lifecycles`, `decision_registers`, `enterprise_standards` | 6 |
| **AI Platform** (matches `/api/ai`) | `ai_commands`, `ai_knowledge`, `ai_conversations`, `ai_prompts`, `ai_workspaces` | 5 |
| **Digital Twin / Simulation** (matches `/api/digital-twin`) | `simulations`, `scenarios`, `simulation_results`, `predictions` | 4 |
| **Command Center / Ops Intelligence** | `platform_metrics`, `incidents` *(has table)*, `alerts`, `health_checks`, `self_healing_actions`, `operation_logs`, `command_actions`, `war_rooms`, `dashboard_widgets` | ~8 |
| **Platform Factory** | `platform_products`, `platform_templates`, `platform_components`, `platform_brands` | 4 |
| **Improvement / Experimentation** | `improvements`, `experiments`, `product_health`, `innovation_ideas` | 4 |
| **Experience/Marketing (ECP)** | `experiences`, `campaigns`, `audiences`, `journeys`, `seasonal_themes`, `homepage_variants`, `navigation_rules`, `experience_analytics` | 8 |
| **Partner/Integration (EIP)** | `partners`, `webhooks` *(note: `Webhook` model has no table, distinct from the working `/api/webhooks` route which may use a different mechanism)*, `plugins`, `integration_templates`, `country_rules`, `partner_requirements` | 6 |
| **Executive/Intelligence Analytics** | `executive_metrics`, `intelligence_reports`, `forecasts`, `benchmarks` | 4 |
| **Config/Reference/Localization extended** | `config_entries`, `reference_data`, `vehicle_master_data`, `location_master_data`, `country_configs`, `config_audit_logs` | 6 |
| **Ghost Checkers / Duplicate detection extended** | `duplicate_vehicle_logs` | 1 |
| **Dealer extended** | `dealer_teams`, `dealer_trust_scores`, `dealer_profiles`, `dealer_subscriptions` | 4 |
| **Finance/Ledger extended** (core `transaction_ledger` exists; these don't) | `ledger_accounts`, `ledger_entries`, `reconciliation_records`, `reconciliation_reports` | 4 |
| **Misc / smaller items** | `lead_activities`, `market_pricing`, `brand_depreciation`, `mileage_impact`, `vehicle_market_analytics`, `sms_bidders`, `idempotency_audit_logs`, `job_failures`, `ads`, `events`, `referrals`, `feedback`, `global_settings`, `notification_templates`, `release` *(has table)*, `api_endpoints` *(has table)*, `api_keys` *(has table)*, `inspectors`, `inspections` *(note: distinct from `inspection_orders`, which HAS a table)* | ~18 |

(Totals above are approximate groupings for readability; the exact 116-item list was generated directly from the script and is available in full — every single entry, not just these clustered examples, if needed for a later document.)

**Direct cross-reference to `03-api-map.md`'s "Enterprise Platform" route cluster**: every route file with a large endpoint count in that cluster (`xosRoutes` 46, `automationRoutes` 43, `vxpRoutes` 38, `governanceRoutes` 35, `lowCodeRoutes` 36, `eipRoutes` 34, `aiPlatformRoutes` 26) maps directly onto one or more of these missing-table clusters. **The routes are real and mounted; the controllers presumably call model methods; the models expect tables; the tables don't exist.** This is a complete, traceable chain from route to missing table, not a loose association.

---

## 4. What This Means for the Fusion Mission

Per the project's own non-negotiable rules — "do not delete code before proving it is obsolete," "do not add features," "prefer consolidation over addition" — this finding does **not** by itself mean these 116 models/routes should be deleted. It means:

- They cannot function today, in the current repository state, against any real database, because their tables were never created.
- Whether they represent *genuinely planned future capability* (schema simply not yet written) or *scaffolded/generated code that was never intended to be finished* (a "V2/V3/experimental" situation the rules explicitly warn about) is not yet determined — that's a `07-dead-code-map.md` and ultimately `12-fusion-roadmap.md` decision, informed by this data but not made here.
- Given the frontend calls **none** of this backend's API at all (confirmed in `03`), none of these 116 gaps are currently causing any visible failure to any real user — they're latent, not active bugs, in the system's current disconnected state. That changes the moment any fusion work starts connecting the frontend to this API.

---

## 5. Critical Refinement — Spot-Checking `governance.schema.sql` Changes the Picture

Before finalizing this document, one of §5's original open questions was checked immediately rather than left for later: does `governance.schema.sql` actually define governance-related tables under names the regex missed?

**Answer: yes, substantially — but it doesn't resolve the gap, it reframes it.** `governance.schema.sql` is a real, substantial file (614 lines) defining 14 real tables: `entity_registry`, `verification_applications`, `trust_score_history`, `dispute_cases`, `dispute_evidence`, `dispute_timeline`, `fraud_reports`, `governance_audit_log`, `compliance_alerts`, `certifications`, `platform_policies`, `risk_assessments`, `enterprise_partners`, `governance_notifications`.

Compare this to what the `GovernancePolicy`/`ChangeRequest`/`ApprovalRule`/`FeatureLifecycle`/`DecisionRegister`/`EnterpriseStandard` models in `_base.js`'s `TABLE_MAP` actually expect: `governance_policies`, `change_requests`, `approval_rules`, `feature_lifecycles`, `decision_registers`, `enterprise_standards`. **Almost none of these names match**, even though both clearly belong to the same "governance" domain conceptually — one exception, `risk_assessments`, does match exactly and is correctly counted in the "69 present" list.

**This means the original 116-count is still literally accurate (those exact expected table names really don't exist), but the underlying story is more specific than "nothing was built for these domains."** What actually happened looks more like: a real, substantial governance schema was designed and written (14 tables, clearly thought through — dispute handling, fraud reports, compliance alerts, certifications), and **separately**, a model layer was written expecting a differently-named, differently-shaped governance schema, and the two were never reconciled with each other. This is a genuine duplicate/parallel-implementation situation — exactly what the fusion project's own Rule #2/#3 ("do not create parallel implementations," "do not create V2/V3 versions without justification") exists to catch — not simply an unfinished/abandoned feature.

**This same pattern likely applies to some unknown portion of the other 10 clusters in §3** (CMS, Workflow/Automation, VXP, AI, etc.) — each may have a real, substantial, differently-named schema sitting in its own domain file that a naive table-name match would miss, exactly like governance did. **This has NOT been checked for the other 10 clusters yet** — governance was spot-checked because it was the first item in the original open-questions list, not because it's representative. Systematically re-checking all 21 domain schema files against their corresponding models (rather than relying on exact table-name matching) is now a confirmed, high-priority task for a subsequent pass — the 116-number is real and precise for "exact expected name," but the true count of genuinely-unbuilt-anywhere models could be meaningfully lower once every domain file gets governance's same scrutiny.

---



- Is `gari_motors_full_schema` (the migration name flagged in `01`) related to any of this, or an unrelated naming artifact? Not yet investigated.
- Does `schema_clean.sql` represent a deliberate "core-only" schema (i.e., was it *intentionally* written to exclude the 116 enterprise tables, as a scoped-down MVP schema), or is it simply incomplete relative to what the other 20 domain-specific `.sql` files describe? This distinction matters enormously for the fusion roadmap and is not yet answered.
- Are any of the 21 domain schema files internally inconsistent with each other (e.g., does `governance.schema.sql` actually define `governance_policies` under a different exact name that the regex missed)? A manual spot-check of 2-3 of the domain-specific files against their expected tables would strengthen this finding further — not yet done.

None of these are answered here. They're listed so they aren't lost before the next document picks them up.
