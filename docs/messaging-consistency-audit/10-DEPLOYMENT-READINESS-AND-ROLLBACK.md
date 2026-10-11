# 10 — Deployment readiness decision and rollback runbook

## Decision

| Gate | Status | Basis |
|---|---|---|
| Typecheck, production build, frontend and backend unit suites | **PASS** | `08-COMMANDS-EXIT-CODES.md` (fresh extraction of this archive) |
| Real-PostgreSQL integration, concurrency and security tests (local, emulated REST layer) | **PASS** | harness suite, `08` |
| Browser reproduction of the Messages redirect | **PASS** (fixed) / reproduced on foundation | `06` |
| Migration chain replay from empty database | **PASS** with a stub for D-MIG-1 | 172/172 |
| Real PostgREST / Supabase behaviour | **BLOCKED** | no egress, no binary, no project access |
| Staging deployment, staging migrations, staging browser journeys, health checks | **NOT RUN** (BLOCKED: no staging access) | — |
| Deployment commit parity | **BLOCKED** | archive has no `.git`; deployed commit unknown |
| Real provider confirmations (M-Pesa, Brevo, Twilio) | **NOT RUN** | none issued, by rule |
| Ledger/reconciliation, escrow flows, full auction settlement | **NOT RUN** | `07` |
| **Production certification** | **BLOCKED** | evidence above is unavailable |

**Release decision: NOT CERTIFIED for production. Conditional GO to a disposable/approved staging environment** once the pre-flight below is done. The candidate fixes four P0 defects that would break authentication, payment settlement and (if hosted grants match the chain) expose money-moving RPCs; none of them were detectable by the foundation's own test suite, so the staging run is expected to find more environment-specific drift. Do not push or deploy from this archive until the release scope is explicitly approved.

## Pre-flight for staging (read-only, before applying any migration)

Run against the target database and keep the output:

```sql
-- 1. Which of this audit's assumptions already hold?
select table_name, column_name from information_schema.columns
 where table_schema='public' and table_name='users' and column_name in ('deactivated_at','granted_permissions','revoked_permissions','last_active');
select to_regclass('public.transactions') as transactions, to_regclass('public.idempotency_audit_logs') as idem_audit,
       to_regproc('public.rls_auto_enable') as rls_auto_enable;
-- 2. Client-executable kayad_* functions (expect rows on an unfixed database)
select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like 'kayad\_%' and p.prokind='f' and p.prorettype<>'trigger'::regtype
   and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'));
-- 3. Public tables without RLS
select tablename from pg_tables where schemaname='public' and not rowsecurity;
-- 4. Applied migration list vs supabase/migrations (confirm 20261010193000 applied or not)
select version from supabase_migrations.schema_migrations order by 1 desc limit 10;
```

Then: take a backup/branch; apply the five new migrations in order (`20261011090000` … `20261011093100`); each is additive/idempotent. `20261011093000` and `…093100` change privileges: confirm with a staging smoke test that the backend (service role) is unaffected and that an `authenticated` JWT is denied on `/rpc/kayad_resolve_dispute_atomic` and on a read of `provider_credentials`.

Staging acceptance (not yet executed): sign in with two real accounts → open Messages (no redirect) → send/replay → read receipt → unread → reconnect; `/api/v1/auth/me` 200; a **sandbox** M-Pesa callback accepted (200) and replay-safe; `/api/health/*` green; deployed commit equals the archive's source commit.

## Rollback runbook

**Application code.** Redeploy the previous (foundation) build. The candidate adds no new environment variables and no data-format change; the foundation tolerates the new schema objects.

**Migrations** (all additive; prefer *forward-fix* over rollback):

| Migration | Rollback | Note |
|---|---|---|
| `20261011090000` users columns | none needed (nullable / defaulted columns; harmless) | dropping them re-breaks `protect()` |
| `20261011091000` chat RPC | re-run the function body from `20261010193000_chat_message_idempotency.sql` | restores D-MSG-1/D-MSG-2 behaviour; no data change |
| `20261011092000` idempotency_audit_logs | `DROP TABLE public.idempotency_audit_logs;` only after reverting the code | drops audit history |
| `20261011093000` revoke client EXECUTE | **do not roll back**. If a specific *non-money* function genuinely needs client access, `GRANT EXECUTE ON FUNCTION <sig> TO authenticated;` for that function only, after adding caller authorization inside it | never re-grant `kayad_resolve_dispute_atomic` or `kayad_transition_*` to clients |
| `20261011093100` RLS on 11 tables | `ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;` and re-grant the specific privileges previously held (capture them in pre-flight #3) | only if a legitimate direct-client reader is discovered; none exists in this codebase |

**Trigger conditions:** any `5xx` spike on `/api/v1/auth/*`, `/api/chat/*`, `/api/payments/callback`; callbacks not settling; unexpected `403` for the backend itself (service-role privilege regression).

**Data safety:** no migration rewrites or deletes business data. The idempotency tables only gain rows.

## Residual risk accepted by this candidate (open items that do not block staging)

D-MSG-4 (no outbox), D-AUTH-2 (infrastructure errors surface as 401), D-RT-2/-3 (socket auth), D-SCHEMA-1/-2, D-FF-1, D-MIG-1, D-AUTHZ-2, D-FIN-3, D-MSG-5 — see `09-DEFECT-REGISTER.md`. D-SCHEMA-1 (`transactions`) and D-MIG-1 (`rls_auto_enable`) must be answered on staging before production: if production has them, they are documentation gaps; if it does not, payment callbacks cannot work there.
