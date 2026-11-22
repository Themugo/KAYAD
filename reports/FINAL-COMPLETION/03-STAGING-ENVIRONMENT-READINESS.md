# 03 — Staging Environment Readiness

**Status: BLOCKED — no isolated staging environment is available to this session.**

## Verified facts
- Only one hosted Supabase project is reachable (read-only): "KAYAD EA". It is treated as production-equivalent; nothing was written to it.
- No Docker daemon (so `supabase start` / `validate-local-supabase` cannot run); no Supabase branch/preview project; no staging credentials.
- A disposable local Postgres 16 + PostgREST stack exists in this sandbox. It proves the repository chain, **not** hosted behaviour.

## Prerequisites (owner/infra must supply)
| # | Prerequisite | Owner |
|---|---|---|
| 1 | Separate Supabase project (or branch) restored from a **recent hosted backup/PITR** so data shape and drift are real | Owner / infra |
| 2 | Staging DB URL, service-role key, anon key held only in a secret store (never in the repo) | Owner |
| 3 | Staging backend deployment pointing at staging DB; staging Redis | Infra |
| 4 | Confirmed Postgres major version equal to hosted | Infra |
| 5 | Cloudinary test cloud and Daraja sandbox credentials (see 08, 09) | Owner |
| 6 | Written approval of D-20 strategy (see 02) before any reconciliation migration is authored | Owner |
| 7 | Remaining definition classes queried on hosted (grants, views, enums, extensions, sequences, storage, RLS flags, cron) | Engineering, read-only |

## Readiness checklist
| Item | State |
|---|---|
| Isolated target exists | NOT AVAILABLE |
| Backup taken and restore tested | NOT TESTED |
| Definition diff (tables/functions) | DONE (04); other classes NOT COMPARED |
| Ordered rehearsal on staging | NOT EXECUTED (see 05) |
| Rollback rehearsal on staging | NOT EXECUTED (see 06) |
| App smoke against staging | NOT EXECUTED |

No statement in this package says the platform is hosted-ready.
