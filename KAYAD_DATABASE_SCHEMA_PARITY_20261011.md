# KAYAD Database & Schema Parity Report

## Current repository facts

- Supabase migration files: **178**.
- Unique migration versions: **178**.
- Migration hygiene: PASS; no exact duplicate migration bodies or duplicate table creators found.
- Static migration preflight: PASS.
- Database contract alignment source validator: **8/8 PASS**.
- The new `20261011220000_ledger_signed_balance_rebuild.sql` migration is additive and does not execute a balance rebuild during migration replay.

## Hosted parity — BLOCKED / historical evidence only

The supplied audit trail records a read-only hosted catalog review on 11 October 2026. The existing blocker register reports:

- Production schema last recorded at 22 September 2026.
- 53 newer repository migrations needed by the backend.
- 38 hosted migration versions without corresponding SQL in the repository.
- Five early repository migration versions absent by name from production.
- Existing route/schema classification of 110 routes with missing schema dependencies, 6 unresolved column contracts and 27 incomplete model/static-method ports.

Those values are retained as **historical evidence from the supplied archive**, not represented as a fresh hosted check in this session. This environment had no authorized Supabase session or PostgreSQL client, and no live schema query was performed.

## Required reconciliation procedure

1. Export hosted migration history and schema using the approved Supabase CLI/project connection or a schema-only dump.
2. Preserve the exact SQL for hosted-only versions under their authoritative versions; do not invent or rewrite historical migration bodies.
3. Compare the five unmatched early repository versions against the actual hosted schema before deciding whether to apply, supersede or retire them.
4. Rebuild a staging clone from the production shape, then apply the reviewed pending migrations in order.
5. Run migration replay, RLS matrix, route/schema crawl and all integration tests against staging.
6. Verify the `20261011220000` ledger migration and run the read-only ledger dry-run before any balance rebuild.
7. Deploy backend code only after the staging schema and tests match the release candidate.

Never use `supabase db push --include-all` as a shortcut when hosted-only migration versions are unresolved. Never reset production or disable RLS to force migration success.

## Missing-schema route decisions

Do not create placeholder tables simply to stop 500 responses. For each route, classify it as: canonical implementation to repair; missing but approved schema contract; incomplete model/service port; stale route to retire; or environment-dependent capability. Retire unused routes only after checking frontend callers, OpenAPI documentation, role permissions and tests. Dealer earnings requires a real settlement/earnings contract rather than treating payer payments as dealer income.

## Verification limitations

- Local PostgreSQL migration replay: NOT RUN (no `psql`/`pg_isready` available).
- Hosted migration history and schema query: NOT RUN.
- RLS role/tenant matrix: BLOCKED pending staging database.
- Provider-specific SQL migrations: source preflight only.
