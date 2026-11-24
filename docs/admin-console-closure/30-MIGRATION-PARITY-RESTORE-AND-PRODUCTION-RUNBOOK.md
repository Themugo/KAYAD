# 30 — Migration parity, restore rehearsal and production migration runbook (final closure, 2026-11-24)

**Nothing in this document was executed against the hosted database except read-only SELECTs and the migration-list read.** No migration was applied, nothing was repaired, no `supabase db push`.

## State ladder (kept distinct, never merged)
| State | Status | Evidence |
|---|---|---|
| Locally verified | **YES** | tsc, vitest, Jest, journeys (doc 31) |
| Disposable-DB verified | **YES** | every journey runs the full repo migration set into a throw-away `kayad_ci_*` database |
| Hosted read-only verified | **PARTIAL** — ledger, tables, functions and columns compared; policies/grants/function bodies NOT compared | `evidence/hosted-readonly/*` |
| Hosted restore verified | **NO** — no hosted backup was restored; nothing in this session could do so | — |
| Disposable restore rehearsed | **YES** (dump → restore into a fresh DB: 242 tables, 306 functions, 149 policies, 791 indexes, 639 rows identical; 0 restore errors) | `evidence/restore-rehearsal/` |
| Production migration approved | **NO** | needs the owner |
| Production migration executed | **NO** | — |

## Reconciliation (`migration-reconciliation.csv`, 217 repository files vs 135 hosted ledger rows)
| Classification | Count |
|---|---:|
| Matched and verified (ledger row present, no object it creates is flagged absent) | 115 |
| Missing from hosted (no ledger row, objects absent hosted) | 47 |
| Schema present but ledger missing | 34 |
| Recorded but schema missing | 3 (`foundational_tables`, `gari_motors_full_schema`, `payment_architecture_extension`) |
| Requires investigation (no table/function/column DDL detected: policy, grant, RLS, data, index or theme migrations) | 18 |
| Conflicting / Superseded or excluded | 0 / 0 (none could be proven; see limits) |

**Limits, stated plainly.** The "schema evidence" column only covers tables, views, functions and `ADD COLUMN` statements, and only names in the read-only probe set. It does **not** compare RLS state, policies, grants, `REVOKE EXECUTE` or function bodies. The **18 "requires investigation" files include security hardening** (`revoke_client_execute_on_kayad_rpcs`, `enable_rls_remaining_public_tables`, `client_role_least_privilege`, `financial_audit_routing_rls_hardening`, `auction_bid_mutation_boundary`). Their hosted effect is **unknown**, so hosted security parity is NOT VERIFIED. 38 of the 135 ledger versions have no repository file with the same 14-digit version (the repository file names embed a second timestamp); those are listed in `evidence/hosted-readonly/ledger-20261124.tsv` and were not individually matched.

## The six named objects (hosted, read-only)
| Object | Hosted | Notes |
|---|---|---|
| `dealer_suspension_requests` | ABSENT | created by `20261124120000_dealer_suspension_requests.sql` |
| `reports` | ABSENT | |
| `feedback` | ABSENT | |
| `private_seller_capabilities` | ABSENT | |
| `kayad_reconciliation_issue_rows` | ABSENT | created by `20261121100000_reconciliation_issue_rows.sql` |
| `transition_escrow` | ABSENT by that name | the canonical `kayad_transition_escrow_atomic` EXISTS (6 args); body not compared; **no replacement was invented or created** |

RLS, policy and grant state for the five absent objects cannot exist hosted; they were verified only in the disposable DB.

## Production migration runbook (PREPARED FOR REVIEW — NOT AUTHORISED; extends doc 14)
1. **Preconditions.** Written owner approval naming the migrations and the window; a verified hosted backup / point-in-time-recovery marker taken immediately before; the repository commit that will be deployed is the same commit whose migrations were rehearsed; maintenance banner ready; no auction ending or escrow settlement in the window.
2. **Approvals.** Owner (System Owner) approves the exact file list; a second reviewer confirms the 47 "missing" and 18 "investigate" items.
3. **Gate 0 — read-only re-baseline** (same SELECT probes as this session). Stop if the ledger moved.
4. **Gate 1 — rehearsal on a hosted-shaped disposable copy** (restore the latest backup into a throw-away project/DB, apply the list, run the journeys against it). Stop on any failure.
5. **Order.** Apply forward-only, oldest to newest, one migration per step. Security hardening files (RLS enable, `REVOKE EXECUTE`, least-privilege) are applied **and checked** (`pg_policies`, `has_function_privilege`) before any feature table is exposed. `dealer_suspension_requests`, `reconciliation_issue_rows` and `admin_customer_care_and_market_tables` come after their dependencies.
6. **Expected changes.** Roughly 40 new tables/views, 86 functions, 78 added columns (evidence lists). No data deletion is expected; the data-only brand/hero migrations update seeded rows.
7. **Risk.** Hosted ledger is far behind the repository; ordering mistakes can leave a function referencing a missing column. Financial functions (`kayad_transition_escrow_atomic` etc.) must NOT be replaced by a migration that changes their body without a separate financial review.
8. **After each step, read-only validation:** `to_regclass`, `pg_proc`, `information_schema.columns`, `pg_policies`, grants for `anon`/`authenticated`, then `NOTIFY pgrst, 'reload schema'`, then the smoke journeys 26, 30, 33.
9. **Stop conditions.** Any error; any policy/grant not matching the disposable result; any 5xx on the admin console after a step; ledger mismatch.
10. **Rollback / forward recovery.** Migrations are forward-only: recovery is a forward fix migration, or restore from the pre-step backup (PITR) when data was damaged. A restore was NOT rehearsed against the hosted project.
