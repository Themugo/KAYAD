# Phase 17 runbook — mobile landing page polish evidence

Local, disposable-environment tooling only. Nothing here talks to a hosted system.
- `ui/browser_*.cjs` — Playwright scripts (Chromium at /opt/npm-tools or any Playwright install).
- `ui/LOCAL_TEST_FIXTURES_ONLY_seed_vehicles.sql` — three `[LOCAL TEST]` vehicles for a **disposable** local database. Never apply to a hosted database; never shipped as application data.
- `ui/test_spa_server.cjs <dist> <port>` — static SPA server with `/api` proxied to the local backend on 5055.
- `evidence/screenshots`, `evidence/data` — before/after captures, metrics, state matrix, validator exit codes.
Paths and ports inside the scripts match the author's local stack (backend 5055, Postgres 54329, PostgREST proxy 54331, Redis 6390); adjust for yours. `browser_states.cjs` mutates the disposable DB (maintenance flag, soft-delete of fixtures) and stops the PostgREST proxy on 54331 — run it only against that stack.
