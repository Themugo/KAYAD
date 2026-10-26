# KAYAD Phase 13H — Production Schema Discovery (read-only)

## Status: **BLOCKED** — no authorized read-only production connection or exported metadata was provided

No production or staging system was contacted. No project identifier was guessed. The Supabase tooling that exists in this session was not used, because the phase rules allow production access only when an authorized read-only connection is explicitly provided. Nothing about production was verified in this phase.

## What exists as evidence (inherited, not re-verified)
- `reports/phase-c1/evidence/prod-tables-20261021.txt`: a table-**name** list from a read-only production check on 2026-10-21.
- `reports/phase-c1/PHASE_C1_SCHEMA_RECONCILIATION.csv`: classification built from that list.
- `reports/phase-c1/evidence/repo-migrations-not-in-prod-history.txt`: **66** repository migrations absent from production's migration history on that date.
- There are no columns, constraints, indexes, RLS policies, grants, functions or triggers for any production-only object anywhere in the package.

## Corrections to the 13G account (from re-reading the C1 data)
| 13G statement | finding |
|---|---|
| "14 tables are production-only" | C1 lists **24** tables that exist in production with no repository DDL. 14 is the subset 13G found reachable by failing routes; the other 10 are `admin_action_requests`, `admin_control_registry`, `admin_control_state`, `escrow_anomalies`, `escrow_provider_integrations`, `inspection_commercial_config`, `inspection_provider_availability`, `inspection_provider_scorecards`, `inspection_report_downloads`, `transactions` |
| "79 routes: no table anywhere" | After this phase's per-route diagnosis only **8** failing routes depend on a table that is in the production list. 73 depend on a table that is in no migration, no schema file and not in the production list (C1 snapshot) |
| 13G treated the remaining 5xx as schema gaps | 20 routes fail for **code reasons independent of schema** (undefined model identifiers, unimplemented model statics, queue/Redis connection config) — see the route analysis |

## Deliverables for the database owner
1. `scripts/owner/phase13h_schema_metadata_export.sql` — one read-only script (forced `BEGIN READ ONLY`, catalog queries only, no SELECT from any application table). It returns columns, types, defaults, PK/FK/unique/check constraints, indexes, triggers, RLS state and policy definitions, grants, sequences, views, functions that mention the tables, extensions, migration history (names only), API roles (no passwords) and planner row estimates. It was executed against the disposable local database only (exit 0, `validation-logs/phase13h/owner-export-script-selftest.log`).
2. `KAYAD_PHASE13H_PRODUCTION_ONLY_SCHEMA_MATRIX.csv` — 24 rows, one per production-only object: evidence source, definition (BLOCKED), application consumers, missing dependency, ownership class (protected / application-owned? / unknown), security impact, proposed correction, owner decision, status.

## Minimal request to the owner
"Run `scripts/owner/phase13h_schema_metadata_export.sql` with a read-only role against the **production** database and return the output file. It reads schema metadata only. Also state, for each of the 24 tables, whether it is application-owned, managed by another process, legacy, optional or part of a protected financial/bid area, and whether production schema changes are applied by the Supabase CLI or another process (66 repository migrations are absent from production's history)."

## What happens next (not done here)
Classify each object first; write migrations only for application-owned objects, additive and idempotent, with rollback and RLS tests; touch protected-domain objects only with their domain owner's approval. No migration was generated from guesses.
