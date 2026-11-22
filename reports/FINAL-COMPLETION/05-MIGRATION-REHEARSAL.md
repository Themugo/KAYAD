# 05 — Migration Rehearsal

## What WAS executed (disposable DB, not staging)
- Bootstrap + all **210** repository migrations applied in filename order to empty Postgres 16: **0 failures**, 233 public tables (`kayad_ref`). VERIFIED for a clean database only.
- New migration `20261122120000_listing_creation_idempotency.sql` applied on top of the chain and exercised by journey 15 (30/30 checks) and journeys 13/14.

## What was NOT executed (BLOCKED — no staging)
Applying the chain onto a copy of hosted (diverged ledger: 91 repo migrations absent from hosted history, 38 hosted-only names; 44 tables missing, 50 differing, 24 hosted-only; see 04).

## Ledger classification (from 04 / earlier read-only audit)
| Class | Meaning | Action |
|---|---|---|
| A. Applied on both | same version recorded | none |
| B. In repo, absent on hosted ledger, objects absent | genuinely unapplied | apply in order on staging |
| C. In repo, absent from ledger, objects present (drift) | applied out-of-band | verify definitions; do **not** re-run blindly; record in ledger only via approved procedure |
| D. Hosted-only names | applied outside repo | export definitions into new forward migrations after owner review; never delete |

## Planned ordered rehearsal (to run on staging once available)
1. Restore backup to staging; record `select version()`, ledger dump, per-table row counts, checksum of critical tables (escrows, payments, ledger_entries, cars).
2. Run remaining definition queries (03 #7); drill into the 50 differing tables column-by-column.
3. Author **new forward** reconciliation migrations only (never edit historical ones), idempotent (`IF NOT EXISTS`, guarded `DO` blocks), reviewed by owner per D-20.
4. Apply in order inside transactions where possible; capture timings and locks (`CREATE INDEX CONCURRENTLY` for large tables outside transaction).
5. Post-apply: re-run definition diff (expect zero), run `ci/db-journeys` journeys against staging, backend smoke, financial invariants (`kayad_validate_wave2_invariants()`), row-count/checksum comparison with step 1.
6. Ship backend **together with** `20261122120000` (new backend sends `p_request_hash`; migration drops the 3-arg function).

## Prohibited (and not done)
`supabase migration repair`, `db push` on shared envs, any production migration, editing historical migrations.
