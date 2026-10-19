# Stage 5D — Migration inventory, disposable rehearsal and rollback (Gate 4)

**Nothing was applied to Supabase or any shared database.** All rehearsal ran on local PostgreSQL 16, DB `kayad5d_hostedlike_disposable` (name suffix `_disposable`, loopback only). Evidence tier **P**.

## Inventory
* Repo: 181 migration files. Hosted: 135 applied. Name-matched baseline: 118.
* **63 repo migrations are not on hosted** (`evidence/stage5d-20261019/hosted/local_not_on_hosted_norm.txt`).
* **38 hosted-only migrations have no repo file** (`hosted_only_norm.txt`, includes `remote_schema_effect_capture_20260922`, `admin_control_schema_effect_capture_20260922`, phase15–22, `p0a_*`). Their SQL cannot be reproduced from the repo.
* Two candidates (not in `supabase/migrations/`, not applied anywhere): 5B owner governance and 5C subscription RPC fix, plus rollbacks, under `runbooks/stage5b-…/migration-candidate/` and `runbooks/stage5c-…/migration-candidate/`.

## Rehearsal (script `evidence/stage5d-20261019/rehearsal/rehearse_hostedlike.sh`)
| Step | Result |
|---|---|
| Build baseline from the 118 name-matched migrations; probe the four Gate C gaps | gaps reproduced as on hosted |
| Seed user rows, apply the 63 missing migrations in order | 0 failures; seeded rows preserved (digest `3095e6b2…`) |
| Apply 5B candidate | `owner_memberships` present; 12 owner functions |
| Apply 5C candidate | subscription function md5 `13b09580…` |
| 5C rollback / re-apply | `aebc44c6…` / `13b09580…` (idempotent) |
| 5B rollback **without** `-v confirm_events_exported=yes` | refuses **but exits 0** — wrappers must inspect output |
| 5B rollback **with** flag | owner tables/functions and the 6 control rows removed; `users` preserved; re-apply works |

**Caveat:** the baseline lacks the 38 hosted-only migrations; the rehearsal is an approximation until their SQL is exported (authorization A2). Row-level data volume is tiny (2 users) so lock/duration risk is low but untested at scale.

## Rollback procedure (for the authorized staging run)
1. Before: schema-only dump of staging (`pg_dump --schema-only`), export `owner_membership_events` if 5B was applied, record `list_migrations`.
2. Apply the 63 in order inside the approved window; stop at first error; do not continue past a failure.
3. Apply 5B candidate, then 5C candidate (+ reviewed `GRANT EXECUTE … TO service_role`).
4. Rollback of 5C: run the 5C rollback file. Rollback of 5B: run with `-v confirm_events_exported=yes` only after exporting events; verify output contains no "refused".
5. Rollback of the 63 migrations is **not scripted**; restore from the pre-change backup/branch (Supabase branch or PITR).

## Recommendation (separate)
An authorized **staging** migration may proceed **only after**: (a) staging identified as a non-production project or branch, (b) hosted-only SQL exported and the rehearsal repeated against it, (c) the service_role EXECUTE gap resolved in the plan, (d) backup/branch taken. Production migration: **not recommended** from this evidence.
