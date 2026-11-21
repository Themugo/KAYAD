# PHASE C.1 — Staging Runbook (schema reconciliation, soft-delete and authorization certification)

**Status of staging on 2026-10-21:** no KAYAD staging project exists. The Supabase organisation contains `KAYAD EA`
(`ubvgixwhfybbyjuvxboj`, **production**) and `CALQULUS PMS` (unrelated, inactive). Every staging step below is therefore
**BLOCKED** until a staging project is created. Phase C.1 used a disposable local stack instead (section A).

Nothing in this runbook may be run against `ubvgixwhfybbyjuvxboj`. Production schema changes are a separate, owner-approved
change with its own backup and rollback plan.

---

## A. Disposable local stack (what Phase C.1 actually ran)

Full procedure: `scripts/local-db/README.md`. Summary:

1. PostgreSQL 16 (production is 17.6; no version-specific syntax failed) on `127.0.0.1:54329`.
2. `supabase-shim.sql` → `supabase-default-privileges.sql` → all 184 `supabase/migrations` in order (single transaction
   each, `ON_ERROR_STOP`). Result: **184/184 applied**, 205 public tables, RLS enabled on 205/205.
3. Keep a pristine template (`kayad_c1_pristine`); recreate `kayad_c1_disposable` from it before each runtime suite
   (`bin/reset-stack.sh` pattern: stop backend/PostgREST, `dropdb`, `createdb -T`, flush Redis, start PostgREST).
4. PostgREST 12.2.3 (local `authenticator`, throwaway JWT secret) + `scripts/local-db/rest-v1-proxy.mjs`.
5. Real backend (`node backend/bootstrap.js`, `NODE_ENV=development`, explicit throwaway `JWT_SECRET`,
   `REDIS_URL=redis://127.0.0.1:6390`, **no provider credentials**).
6. Real SPA: `vite build` with `VITE_SOCKET_URL` set to the local origin (an unset socket URL falls back to
   `https://api.kayad.space` in production builds), served with SPA fallback and an `/api` proxy. Chromium launched
   with `--host-resolver-rules` that resolve only loopback hosts.

## B. Create an approved staging environment (owner action)

1. Create a **new** Supabase project (e.g. `KAYAD Staging`, region `eu-central-1`, Postgres 17). Do not branch or clone
   production data.
2. Record its project ref. Confirm in the dashboard that the ref is **not** `ubvgixwhfybbyjuvxboj`.
3. Apply repository migrations in order with the Supabase CLI against the staging ref only:
   ```bash
   supabase link --project-ref <STAGING_REF>          # verify the printed ref before continuing
   supabase db push --dry-run                         # review the plan
   supabase db push
   ```
4. Deploy a staging backend (Render `render-staging.yaml`) and frontend (`vercel-staging.json`) pointed at staging.
   Provider keys: sandbox or unset. Never reuse production secrets.

## C. Read-only staging verification (run first, mutate nothing)

```sql
-- table inventory (compare with reports/phase-c1/PHASE_C1_SCHEMA_RECONCILIATION.csv)
select table_name from information_schema.tables where table_schema='public' order by 1;
-- applied migration history (compare with supabase/migrations)
select version, name from supabase_migrations.schema_migrations order by version;
-- RLS posture
select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and relkind='r' and not relrowsecurity;
select tablename, count(*) from pg_policies where schemaname='public' group by 1 order by 1;
-- soft-delete columns
select table_name, column_name from information_schema.columns
 where table_schema='public' and column_name in ('deleted_at','deleted_by');
```

## D. Staging runtime certification (isolated fixtures only)

All harnesses refuse non-loopback targets by design. To run them against staging, use a dedicated staging copy
of the harness with an explicit staging allow-list reviewed by the owner; do not relax the shipped guards.

| Suite | What it proves |
|---|---|
| `backend: npm run test:soft-delete-integrity` | null/undefined/omitted/$ne/$eq/$and/$or semantics through PostgREST; public listing, detail, sitemap, search exclude soft-deleted vehicles; dealer quota; admin history; RLS deny-all for anon/authenticated on `cars`; concurrency; count/pagination agreement |
| `backend: npm run test:cache-invalidation` | Redis pattern invalidation actually deletes keys; public listing cache cleared on mutation |
| `runbooks/phase-c1-runtime-20261021/http/phase_c1_http_authz_matrix.mjs` | 30 server-side authorization and soft-delete checks over real HTTP |
| `runbooks/stage5f10-private-seller-custody-20261020/http/stage5f10_http_e2e.mjs` | 46 custody/authorization checks (needs a fresh database; uses fixed payment references) |
| `runbooks/phase-c1-runtime-20261021/ui/phase_c1_ui_journeys.mjs` | Chromium: public pages incl. deleted vehicle, Command Centre, CMS, staff restriction, dealer hub, buyer denial; axe |

## E. Production schema reconciliation (prepare only — requires owner approval and a backup)

Evidence (2026-10-21, read-only production metadata): see `reports/phase-c1/KAYAD_MASTER_CONVERGENCE_PHASE_C1_CERTIFICATION_REPORT.md` §5.

1. **Capture production-only DDL into the repository first.** 38 migrations recorded in production history have no file
   in `supabase/migrations`, and 24 production tables are created by none of the repository migrations. Export schema
   only (no data) from production with `supabase db dump --schema public --data-only=false` **into a review branch**,
   and turn the relevant objects into reviewed migrations. Without this, staging cannot reproduce production.
2. **Then** plan the 20 repository tables missing from production (auction setups/registrations/holds/outcomes,
   hero slides/placements, private-seller custody, chat outbox/idempotency, report versions/corrections, purchase
   outcomes, provider/vehicle custody capabilities). Apply on staging, run section D, then schedule production with a
   backup and the per-migration rollback notes.
3. Owner decisions still required: Stage 5B owner-governance candidate migration (D1), and the `DDL_MISSING_FROM_REPOSITORY`
   features (Feedback, Reports, Ad Manager, Security Log, Broadcast, Config, superadmin studios) — implement schema or
   disable/hide the routes.
