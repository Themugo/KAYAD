# Test evidence — selective maintenance & owner recovery

All runs are LOCAL: disposable PostgreSQL + PostgREST + the real backend + the built SPA + Playwright/Chromium. They say nothing about the hosted deployment. Raw logs: `validation-logs-maintenance-scopes-20261027/` (`e2e/`, `regression/`, `browser/` screenshots). Node was v22.23.4 (repository pins 22.22.2).

## Suites and results

| Check | Command (from repo root unless stated) | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Production build | `npm run build` | exit 0 (only the pre-existing chunk-size warning) |
| Frontend tests | `npx vitest run` | 122 files, 980 passed, 1 skipped (pre-existing), exit 0 |
| Backend Jest | `cd backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit` | 179 suites, 3146 passed, exit 0 |
| Backend Vitest | `cd backend && npx vitest run --config vitest.config.js` | 6 files, 36 passed |
| Backend node test | `cd backend && npm run test:node` | 1 passed |
| Validators | every `npm run validate:*` (141) | 139 pass; 2 fail for missing credentials only: `validate:communications:providers` (email/SMS provider credentials not configured) and `validate:live-runtime` (needs SUPABASE_URL/SERVICE_ROLE_KEY). Neither touches maintenance code |
| Navigation validator | `npm run validate:super-admin-phase1-navigation` | 12/12 after the documented 30→31 destination update |
| Changed-file lint | `npx eslint --no-ignore <24 changed files>` | 0 errors (warnings are pre-existing in untouched lines of large files) |
| Scoped-maintenance DB E2E (legacy-owner mode) | `node runbooks/phase16e-maintenance-scopes-20261027/http/e2e_maintenance_scopes.cjs` | **67/67** |
| Real-browser journey (legacy-owner mode) | `node runbooks/phase16e-maintenance-scopes-20261027/ui/browser_maintenance_scopes.cjs <outdir>` | **19/19**, screenshots in `browser/` |
| Incident E2E: owner lockout (legacy) | `e2e_maintenance_owner_lockout.cjs` | 32/32 |
| Incident E2E: owner MFA + membership (owner mode) | `e2e_maintenance_owner_mfa_membership.cjs` | 13/13 |
| Owner/dealer separation 16B (owner mode) | `e2e_phase16b_owner_dealer_separation.cjs` | 41/41 |
| Dealer/staff separation 16C (owner mode) | `e2e_phase16c_dealer_staff_separation.cjs` | 40/40 |
| MFA race / step-up 16C (owner mode) | `e2e_phase16c_mfa_race_stepup.cjs` | 8/8 |
| Owner identity governance (owner mode) | `e2e_owner_identity_governance.cjs` | 73/73 |
| Superadmin governance (legacy) | `e2e_superadmin_governance.cjs` | 73/73 |
| Account security / dealer lifecycle / dealer payments / inventory-team / identity integrity (legacy) | `runbooks/phase16-20261026/e2e_*.cjs` | 47/47, 50/50, 73/73, 60/60, 12/12 |
| New backend unit/contract tests | `maintenancePolicyMatrix` 37, `maintenanceControlService` 16, `maintenanceEnforcementPolicy` 19 | all pass (inside the Jest total) |
| New frontend tests | `MaintenanceControlPanel.test.jsx` 14, `platformRecoveryPermission.test.ts` 2 | all pass (inside the Vitest total) |

The E2Es need a freshly reset database each (they create fixed accounts) and different owner modes; the order used is recorded in the logs.

## Mapping to the 12 required regression areas

| # | Requirement | Evidence |
|---|---|---|
| 1 | Owner activates and reverses | E2E A6–A9, O1, X1, R6–R8; browser U4, U15 |
| 2 | Owner signs in, completes MFA, verifies session during maintenance | E2E X4 (sign-in + `/auth/me`); with an enrolled authenticator, `e2e_maintenance_owner_mfa_membership` (13/13) proves MFA is still demanded during maintenance (F2), wrong code refused (F3), single-use recovery code signs in (F4–F5), step-up code required to activate/end (F0b, F6a), and a missing owner membership gets no lane (G1–G3); lockout suite 32/32 |
| 3 | Technical staff: only permitted recovery functions | E2E S1, X4, X5, X6, X8, R1–R5; browser U11–U15 (cannot activate, cannot open Panic Room, no admin/financial APIs) |
| 4 | Ordinary staff cannot bypass | E2E S2 (technical without grant, admin, superadmin-labelled non-owner), X2, X5, R3, D12, G1–G2 |
| 5 | Dealers, dealer staff, buyers, sellers only per scope | E2E D1–D12, B1–B4, O2; browser U5–U7 |
| 6 | Global restricts ordinary operations, recovery kept | E2E X1–X9; browser U9–U13 |
| 7 | Direct API & stale sessions cannot bypass | E2E D3 (stale session), D4 (refresh token), D5 (direct dealer routes), D13 (legacy endpoints), X2, X6 |
| 8 | Failed activation/recovery leaves no false UI state | browser U3 (wrong password → server error, still "NOT ACTIVE", DB unchanged); frontend tests re-read status after every action; E2E A3–A4, C1 |
| 9 | Concurrency | E2E R4, K1–K3 (version delta and audit rows equal effective changes), C1; service tests (CAS, contention, 409) |
| 10 | DB/auth outages honest | E2E E1–E2; service tests (store down / table missing); enforcement tests (dealer-team lookup failure → 503 `MAINTENANCE_POLICY_UNAVAILABLE`) |
| 11 | Owner/dealer separation & MFA lockout intact | 16B 41/41, 16C 40/40 and 8/8, owner governance 73/73, incident MFA 13/13 |
| 12 | Public marketplace outside scope unchanged | E2E D10, D11, B4, O2; browser U7–U8 |

## Browser evidence
`browser/01_panic_room_inactive.png` … `08_after_recovery.png` (inactive Panic Room, failed activation, dealers scope active, dealer refused, global active owner view, public site during global, technical recovery page, after recovery).

## Not verified (cannot be, locally)
Hosted login, hosted `WEBHOIST_EMAIL`/owner-table state, hosted PostgREST behaviour of the conditional update, real authenticator apps, multi-instance cache timing, WebSocket sessions. See `KAYAD_MAINTENANCE_SCOPES_20261027_REMAINING_RISKS_AND_DECISION.md`.
