# 02 — Runtime and dependency recovery report

## What "recovery" required

1. **Node version.** The tree requires Node ≥ 22.22.2; the container shipped 22.22.0. Node 22.22.2 (npm-installed) was used for every command recorded here.
2. **Dependencies.** `npm ci` succeeded for root and backend with the committed lockfiles (no lockfile changes). The harness (`docs/messaging-consistency-audit/harness`) has its own `package.json` (`pg`, `socket.io-client`) and is **not** part of the application build.
3. **A real database.** No Supabase/PostgREST was reachable (egress blocked; PostgREST binary not obtainable). The substitute, stated plainly:
   * PostgreSQL 16 built from the project's **own migration chain** (`harness/sql/apply_chain.sh`) plus a minimal Supabase shim (roles `anon/authenticated/service_role`, `auth.uid()/role()/jwt()`, `auth.users`, `supabase_realtime` publication, a stub `rls_auto_enable()`).
   * `harness/postgrest-emulator.mjs`: a small, test-only HTTP layer that speaks the subset of PostgREST the backend uses (filters, select, order, `Prefer: count`, single-object accept header, insert/upsert/PATCH/DELETE, `/rpc/<fn>`), and runs each request in a transaction with `SET LOCAL ROLE` from the JWT. Errors map to PostgREST-style codes.
   * The **real** `backend/server.js` runs against it, with a private Redis (port 6390, no persistence). Nothing talks to Supabase, a production database, M-Pesa, Brevo or Twilio.
   * **This is "local PostgreSQL + emulated REST layer" evidence. It is not Supabase evidence, not PostgREST evidence, not staging and not production.**
4. **Migration chain replayed from empty:** 172/172 applied, 0 failed (167 foundation + 5 added by this audit). On the foundation's 167 alone the chain **cannot be applied to a fresh database** without a stub for `public.rls_auto_enable()`, which no migration creates (D-MIG-1). Without the stub, `20260909070742_runtime_integration_hardening.sql` and `20260909072046_security_function_execute_privilege_hardening.sql` fail.

## Result of running the real server against the real schema

Booting the unmodified foundation server on a chain-built database surfaced contract gaps that mocked tests cannot see. Fixed (additive, idempotent migrations) or recorded:

| Gap | Effect | Disposition |
|---|---|---|
| `users.deactivated_at / granted_permissions / revoked_permissions / last_active` absent from every migration | `protect()` re-selects these on **every** request | Fixed: `20261011090000_users_security_state_columns.sql` |
| `idempotency_audit_logs` absent | concurrent duplicate payment callbacks answered 503 | Fixed: `20261011092000_idempotency_audit_logs.sql` |
| `public.transactions` absent from every migration | payment callback reads it | **Open** D-SCHEMA-1 (production state UNCONFIRMED; harness-only empty shim in `sql/post_chain_harness_shim.sql`, never shipped as a migration) |
| `config_entries`, `config_audit_logs`, `vehicle_master_data`, `disputes`, `error_budgets`, `escrows.warning_sent`, `bids.bid_count` absent | `/api/config/*` returns 500; cron/SLO jobs log errors every cycle | **Open** D-SCHEMA-2 |
| `FeatureFlag` model never imported in `featureFlagService.js` | `/api/feature-flags/user` returns 500 | **Open** D-FF-1 |

None of the "open" items were patched: each is a feature-level or production-state question, not part of the messaging/auth/payment path, and inventing schema for them would exceed a minimal patch.

## Harness reproducibility

```
# one-time
bash docs/messaging-consistency-audit/harness/sql/apply_chain.sh <db> supabase/migrations <outdir>   # needs a local PostgreSQL 16 + superuser
psql -d <db> -f docs/messaging-consistency-audit/harness/sql/post_chain_harness_shim.sql
(cd docs/messaging-consistency-audit/harness && npm ci)
# run
KAYAD_TEST_DB=<db> node --test --test-concurrency=1 docs/messaging-consistency-audit/harness/tests/*.test.mjs
```

The harness requires `redis-server`, PostgreSQL 16 and Node ≥ 22.22.2 on the machine. The browser reproduction additionally needs Playwright + Chromium (`harness/browser/m4-repro.mjs`).
