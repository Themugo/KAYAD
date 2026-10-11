# Supabase certification status (Priority 3)

**Overall: BLOCKED.** No disposable Supabase environment was available, so nothing in this document was exercised on Supabase itself. Every database result in this phase comes from **disposable local PostgreSQL 16** with Supabase's client roles and default privileges emulated. That is a different and weaker level of evidence, and it is labelled so everywhere.

## 1. Why it is blocked (evidence)
| Route to a disposable Supabase | Result |
|---|---|
| Local Supabase stack (`supabase start`, Docker) | Docker starts, but every image registry is refused by the sandbox egress policy: Docker Hub (`registry-1.docker.io` → Forbidden), `public.ecr.aws/supabase/postgres` → Forbidden, `ghcr.io/supabase/postgres` → Forbidden |
| New disposable project in the owner's Supabase org (connector `create_project`) | Billable, so it needs the owner's explicit authorisation. This was requested in chat at the start of the phase and **no authorisation was received**. Nothing was created |
| Supabase branch of production | Not attempted. It is also billable and is derived from production, which this phase must not touch |
| Production (`ubvgixwhfybbyjuvxboj`) | Read-only catalog inspection only, which is not certification. Used solely as comparison evidence (see the previous phase, `evidence/hosted-readonly-20261011/`, plus three read-only catalog queries this phase for ledger function bodies and column existence) |

## 2. Status per required item
| Item | Local PostgreSQL 16 (this phase) | Disposable Supabase | Staging |
|---|---|---|---|
| Complete migration replay | PASS, 176/176, plain and with Supabase default privileges | BLOCKED | NOT RUN |
| Re-application of idempotent migrations (`…100000`, `…120000`, `…121000`, `…130000`) | PASS, 8/8 | BLOCKED | NOT RUN |
| Supabase default privileges | PARTIAL: emulated grants for `anon`/`authenticated`/`service_role`. Production's actual ACL (`Dxtm` for client roles) is documented and is revoked by `…120000` | BLOCKED | NOT RUN |
| RLS under ordinary authenticated roles | PASS (`m10` 13/13, `m5-rls-privileges`) via `SET ROLE` plus `request.jwt.claims` | BLOCKED: GoTrue-issued JWTs and PostgREST were not exercised | NOT RUN |
| Function ownership, SECURITY DEFINER, `search_path`, EXECUTE grants | PASS (`m10` #2/#3 catalog checks) | BLOCKED | NOT RUN |
| Transactional outbox atomicity and retries | PASS (`m8` 5/5, `m8b` 7/7) | BLOCKED | NOT RUN |
| Message idempotency and concurrency | PASS (`m2`, `m14` #13) | BLOCKED | NOT RUN |
| Financial schema integrity | PASS with one **FAIL by design**: `m15` shows defect FIN-LEDGER-1 (`24-…`); `m5` 7/7, `m13` 5/5 | BLOCKED | NOT RUN |
| Compatibility with platform features (Realtime publication, storage, `pg_net`/`pg_cron`, GoTrue triggers on `auth.users`) | NOT RUN: these are platform objects that local PostgreSQL does not have; the migration chain uses harness stubs where needed (`rls_auto_enable`) | BLOCKED | NOT RUN |
| GoTrue sign-up setting and auth configuration | NOT RUN: a dashboard/Management API setting that SQL cannot read | BLOCKED | NOT RUN (checklist A6) |

## 3. What to run once a disposable project exists
Steps 1–5 are written down in `28-STAGING-CERTIFICATION-INSTRUCTIONS-20261011.md` §B and §C. In short:
1. Create the project in the owner's org, with the same region and Postgres major version as production (17).
2. Restore a **schema-only** dump of production, so that the project starts as production rather than as the repository.
3. Apply the pending repository migrations in version order.
4. Run `INVENTORY_SCHEMA_SECURITY.sql` and then `supabase-reconcile.mjs`.
5. Point the harness at it with `SUPABASE_URL` and the service key held in a local `.env`, never in chat or tickets, and run `m10`, `m8`, `m8b`, `m14` and `m15`.
6. Record the GoTrue "Allow new users to sign up" setting (expected: **off**).
7. Pause or delete the project.
