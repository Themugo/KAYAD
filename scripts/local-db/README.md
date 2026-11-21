# KAYAD disposable local database (not part of CI)

Rebuilds the full KAYAD schema from `supabase/migrations` in a scratch PostgreSQL 16/17 instance, then serves it
through PostgREST so the **unmodified** backend data layer and the real Express backend can run against it.
Verified 2026-10-21 (Phase C.1): **184/184 migrations apply in order from an empty database** (205 public tables,
RLS enabled on all 205). This does **not** replace validation against a real Supabase staging project, and it must
never be pointed at a hosted project. Every harness below refuses non-loopback targets.

(The previous version of this README described a different project's database and fixtures; `test-fixtures.sql`
in this folder is that project's and is not used by KAYAD.)

## 1. Schema from migrations

```bash
export PGHOST=127.0.0.1 PGPORT=54329 PGUSER=postgres
createdb kayad_local_disposable
# The shim creates Supabase-only roles/schemas. If the roles already exist in this cluster, skip its first line.
psql -d kayad_local_disposable -v ON_ERROR_STOP=1 -f scripts/local-db/supabase-shim.sql
# Hosted Supabase grants these defaults before any migration runs; without them GRANT/REVOKE semantics differ.
psql -d kayad_local_disposable -v ON_ERROR_STOP=1 -f scripts/local-db/supabase-default-privileges.sql
for f in $(ls supabase/migrations/*.sql | sort); do
  psql -d kayad_local_disposable -q -v ON_ERROR_STOP=1 -1 -f "$f" || { echo "FAILED: $f"; break; }
done
```

Keep a pristine copy and recreate the working database between suites: `createdb -T kayad_local_pristine kayad_local_disposable`.

## 2. PostgREST + backend

- PostgREST 12.x with `db-uri` using a local `authenticator` login (`ALTER ROLE authenticator LOGIN PASSWORD '...'`),
  `db-anon-role = "anon"` and a throwaway `jwt-secret`.
- `node scripts/local-db/rest-v1-proxy.mjs` (POSTGREST_URL, PROXY_PORT): supabase-js calls `/rest/v1/*`.
- Backend: `SUPABASE_URL=http://127.0.0.1:<proxy>`, `SUPABASE_SERVICE_ROLE_KEY=<service_role JWT signed with the
  throwaway secret>`, `NODE_ENV=development`, explicit `JWT_SECRET`, optional `REDIS_URL=redis://127.0.0.1:<port>`.
  No provider credentials: nothing is sent.

## 3. Runtime suites (see runbooks/phase-c1-runtime-20261021/PHASE_C1_STAGING_RUNBOOK.md)

| Suite | Command (from repo root unless noted) |
|---|---|
| Soft-delete / null-filter data layer | `cd backend && KAYAD_DISPOSABLE_DB=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... KAYAD_TEST_JWT_SECRET=... npm run test:soft-delete-integrity` |
| Cache invalidation (real Redis) | `cd backend && KAYAD_TEST_REDIS_URL=redis://127.0.0.1:<port> npm run test:cache-invalidation` |
| HTTP authorization matrix | `BASE=... JWT_SECRET=... PGHOST=127.0.0.1 E2E_DB=<name>_disposable node runbooks/phase-c1-runtime-20261021/http/phase_c1_http_authz_matrix.mjs` |
| Stage 5F.10 custody HTTP | `node runbooks/stage5f10-private-seller-custody-20261020/http/stage5f10_http_e2e.mjs` (fresh database only) |
| Browser journeys | `node runbooks/phase-c1-runtime-20261021/ui/phase_c1_ui_journeys.mjs` (WEB, E2E_DB, PW_PATH, AXE_PATH) |
