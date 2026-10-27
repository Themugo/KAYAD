# Regression evidence — Incident 2026-10-27 (all LOCAL: disposable PostgreSQL 54329 + PostgREST + real backend + built SPA; hosted = read-only SELECTs only)
| Check | Command | Exit | Result | Baseline (16C) |
|---|---|---|---|---|
| TypeScript | `npm run lint` (tsc --noEmit) | 0 | clean | clean |
| Production build | `npm run build` | 0 | ok | ok |
| Frontend | `npx vitest run` | 0 | 121 files, 966 passed, 1 skipped | 964 + 1 skipped (+2 new) |
| Backend Jest | `npm run test:jest` | 0 | 177 suites, 3108 passed | 3074 (+34 new) |
| Backend Vitest | `npm run test:vitest` | 0 | 36 passed | 36 |
| node:test | `npm run test:node` | 0 | 1 passed | 1 |
| Validators | all `validate:*` | – | 141/143; failures = `communications:providers`, `live-runtime` (need live credentials, same as 16C) | 141/143 |
| Changed-file lint | `eslint --no-ignore <7 changed files>` | 0 | clean | – |
| Incident E2E (legacy owner mode) | e2e_maintenance_owner_lockout.cjs | 0 | 32/32 (27 before the /auth/me addition + 5); failed before the fix (owner login 503, recover 503) | – |
| Owner-mode E2E (membership + MFA) | e2e_maintenance_owner_mfa_membership.cjs | 0 | 10/10: MFA_REQUIRED during maintenance, wrong code refused, recovery code once/no replay, revoked membership = no lane | – |
| Real-browser journey | browser_maintenance_owner_recovery.cjs | 0 | 8/8: user sees truthful message; owner signs in through UI; Panic Room; END MAINTENANCE; user signs in again; warning text; no page errors | – |
| Existing suites (regression) | account security / dealer lifecycle / dealer payments / inventory-team / identity integrity (legacy) | 0 | 47 / 50 / 73 / 60 / 12, 0 fail | same |
| Owner governance (owner mode, owner+MFA schema) | e2e_owner_identity_governance.cjs | 0 | 73/73 | 73 |
| Superadmin governance | e2e_superadmin_governance.cjs | – | 73/73 in legacy mode; 3 failures in owner mode are a mode mismatch (suite authored for legacy mode; owner-only approvals correctly 403) | 73 (legacy) |

Scenario coverage requested: correct/wrong password (M2/M4/N7), owner/ordinary (M, N), MFA success/invalid/replay/recovery (owner-mode E2E; lockout covered by the owner-governance suite), banned (B1), logout/refresh (B2/B3), maintenance on/off (M, R, browser), membership missing (owner-mode E2E F-series), dashboard/owner-only API authz and lower-rank admins vs owner (owner governance 73), dealer and marketplace journeys (existing suites + `/api/cars` 503 then 200 after recovery), CSRF/rate-limit (unchanged code; the lane only adds routes already guarded by them; rate limits were raised in the local harness, so rate-limit behaviour is **not re-exercised** here), DB unavailable / missing `system_settings` (fail-open unchanged and covered by the existing systemCheck source contract; not re-simulated live).

Known limits: real authenticator apps, real e-mail delivery and hosted login are **not** verified. Node is v22.23.4 vs the pinned 22.22.2.
