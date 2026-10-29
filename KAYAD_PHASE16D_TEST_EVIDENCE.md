# Phase 16D test evidence — LOCAL ONLY (disposable PostgreSQL 16 + PostgREST + Redis + the real backend + built SPA + Playwright/Chromium)

Nothing here is hosted verification. Hosted reads in this round: SELECT queries only (flag, schema, owner row facts). Logs: `validation-logs-phase16d-20261027/`, `evidence-phase16d-20261027/`.

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Production build | `npm run build` | exit 0 (pre-existing chunk-size warning) |
| Frontend (unit, mocked) | `npx vitest run` | 124 files, **996 passed**, 1 skipped (previous 994 + 2 new) |
| Backend Jest (no backend file changed) | `cd backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit` | 179 suites, **3153 passed** |
| Changed-file lint | `npx eslint --no-ignore <changed files>` | 0 errors |
| Validators | every `npm run validate:*` (143) | 141 pass; 2 fail for missing credentials only (`validate:communications:providers`, `validate:live-runtime`). One new failure (`brand-palette-convergence`, a black shadow in my sign-out notice) was found and fixed |
| Database E2E / browser suites (real backend, each on a freshly reset database; `evidence-phase16d-20261027/regression_summary.txt`) | | all exit 0 |
| account security 47/47 · dealer lifecycle 50/50 · dealer payments 73/73 · inventory team 60/60 · identity integrity 12/12 · superadmin governance 73/73 | legacy owner | pass |
| maintenance scopes 67/67 · scope matrix 90/90 · security controls 30/30 · rate limits 6/6 · owner lockout 32/32 · browser maintenance scopes 19/19 | legacy owner | pass |
| owner identity governance 73/73 · owner/dealer separation 41/41 · dealer staff separation 40/40 · MFA race/step-up 8/8 · owner MFA membership 13/13 · browser owner MFA recovery 13/13 | owner governance + MFA | pass |
| **New** browser: admin dashboard/menu/sidebar/sign-out/navigation | `browser_admin_dashboard.cjs` | 38/38 |
| **New** browser: public Navbar sign-out (failure alert, revocation, Back, deep link) | `browser_public_signout.cjs` | 8/8 |
| **New** browser: dashboard against real backend failure (PostgREST stopped mid-session) | `browser_dashboard_failures.cjs` | 5/5 |

Viewports: dashboard journey at 1440/1280/768/390 (no horizontal overflow, KPI cards equal height); owner ledger at 1440/768/390 (no overflow; 390 before/after in `screenshots/owners_before_390.png`, `owners_after_390.png`).
Mocked pieces, labelled: Vitest unit tests; Playwright route aborts that simulate an unreachable logout endpoint (checks L1, P1).
Not verified: anything hosted (login, MFA, health, deployment); real authenticator-app interoperability; WebSockets; multi-instance cache timing.
