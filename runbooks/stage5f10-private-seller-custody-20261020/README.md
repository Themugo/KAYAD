# Stage 5F.10 runbook — private-seller auction gate, custody and convergence

Everything here is **local and disposable-only**. Every script refuses a database name that does not end in `_disposable` and a non-loopback host. Nothing connects to hosted Supabase, Render, Vercel, Brevo, M-Pesa or SMS providers. **No migration in this stage has been applied to any hosted database.**

| Item | Purpose | Tier |
|---|---|---|
| `../../supabase/migrations/20261020170000_private_seller_auction_gate_enforcement.sql` | the database gate, transition functions, backstop triggers, RLS | **candidate — NOT APPLIED to any hosted DB** |
| `rollback_20261020170000.sql` | non-destructive rollback: restores the five prior RPC bodies verbatim, drops triggers and gate functions, preserves every row | rehearsed on a disposable DB (harness section J) |
| `pg/stage5f10_gate_pg.mjs` | 227 SQL-level checks incl. two-session concurrency, RLS, append-only audit, guard forgery, rollback | real disposable PostgreSQL 16 |
| `http/stage5f10_http_e2e.mjs` | 46 checks over real Express → PostgREST → PostgreSQL | real disposable stack |
| `ui/ui_5f10.mjs` | 23 Chromium checks (desktop/tablet/phone, axe WCAG2A/AA, keyboard) | real disposable stack + headless Chromium |

## Re-running (loopback only)
1. Disposable PostgreSQL 16 on 127.0.0.1 with the local Supabase shim and all repo migrations replayed (`kayad5f10_full_disposable` = base replay + the 5F.10 migration). `npm run test:pg:stage5f10` clones that template into a throw-away `*_disposable` database and drops it afterwards. Set `PG_TEMPLATE_DB`, `PGHOST`, `PGPORT`, `PGUSER`.
2. For the HTTP/UI scripts start PostgREST on a clone of the template, a prefix proxy (`/rest/v1`→root), the backend (`SUPABASE_URL` → proxy, a *local* JWT secret), and for the UI `VITE_DEV_API_TARGET=<backend> npx vite`. Then `JWT_SECRET=<local secret> npm run test:http:stage5f10` and `npm run test:ui:stage5f10`.
3. Unit/integration suites need no stack: `cd backend && npm run test:jest`, `npx vitest run` at the root.

## Mutation check (proves the concurrency tests are not vacuous)
Removing the `FOR SHARE` proposal/capability locks from the RPCs alone does **not** fail the suite, because the `cars` backstop trigger takes the same lock (defence in depth). Removing the RPC locks **and** the trigger lock fails 11 checks (B6, B9, I1, I4–I9, I12, I13).
