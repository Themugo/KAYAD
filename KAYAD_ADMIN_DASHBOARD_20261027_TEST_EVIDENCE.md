# Test evidence — Super Admin dashboard polish (LOCAL ONLY)

Disposable PostgreSQL 16 + PostgREST + Redis + the real backend (unchanged) + the built SPA + Playwright/Chromium. Nothing here is hosted verification. Browser journeys use the **real backend**; the only mocked pieces are the Vitest unit tests (labelled) and one Playwright route abort used to simulate an unreachable logout endpoint (check L1, labelled).

## Baseline (verified package, before edits)
tsc exit 0; build exit 0; Vitest 122 files / 980 passed / 1 skipped; backend Jest 179 suites / 3153 passed; validators 139 pass + 2 credential failures.

## After (commands from repo root; logs in `validation-logs-admin-dashboard-20261027/`)
| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Production build | `npm run build` | exit 0 (pre-existing chunk-size warning) |
| Frontend tests (mocked unit tests) | `npx vitest run` | 124 files, **994 passed**, 1 skipped (baseline 980 + 14 new), exit 0 |
| Backend (no backend file changed) | `cd backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit` | 179 suites, 3153 passed, exit 0 |
| Changed-file lint | `npx eslint --no-ignore <10 changed/new files>` | 0 errors, 48 warnings (pre-existing patterns); the new script needed `/* global … */` and was fixed |
| Validators | every `npm run validate:*` | 141 pass; 2 fail for missing credentials only (same as baseline) |
| Real-stack browser journey (new) | `runbooks/phase16f-admin-dashboard-20261027/ui/browser_admin_dashboard.cjs` | **38/38** on the new build |
| Same journey on the original build | same script, `before` mode | 9 pass, **3 fail** (KPI cards overflow in the unavailable state at 1440/1280/768) — evidence of the defect |
| Maintenance regression (UI, real backend) | `browser_maintenance_scopes.cjs` | 19/19 |
| Owner MFA recovery regression (UI, real backend) | `browser_owner_mfa_recovery.cjs` | 13/13 |

## What the 38 browser checks cover
Viewports 1440/1280/768/390 without horizontal overflow (healthy and unavailable states); maintenance cause named and cleared after maintenance ends (M1–M2); account menu: identity/role, collapsed by default, open, items (My profile / settings / Owner management / Sign out for the owner), Escape + focus return, outside click, ArrowDown/End, mobile fit (A1–A9); sidebar: `aria-controls` target exists, collapse/expand, group click does not navigate, shell not remounted across navigation, active route + parent state (S1–S6); Back restores scroll, dashboard module/search kept (N1–N2); failed sign-out reported and user stays signed in (L1, request aborted by Playwright); real sign-out → login, `/auth/me` 401, admin API refused, repeated Back never shows a usable admin page, deep link redirects to login, no page errors (L2–L7).

## Not run in this round
The older database E2E suites (maintenance scope matrix, security controls, owner governance, etc.) were not re-run because no backend, migration or policy file changed; the two UI regressions above were re-run because the header and shell changed. Screenshots: `evidence-admin-dashboard-20261027/screenshots/{before,after}`.
