# Test evidence — selective maintenance & owner recovery (final verification round)

**Everything here is LOCAL**: disposable PostgreSQL 16 + PostgREST + the real backend + Redis + the built SPA + Playwright/Chromium. Nothing below is hosted verification, and no test is described as one. The only hosted action in this round was ONE read-only `SELECT` (see section 1). Node was v22.23.4 (repository pins 22.22.2). Raw logs: `validation-logs-maintenance-scopes-20261027/round2/` (this round, authoritative) and `.../` (previous round).

## 1. Hosted maintenance flag (read-only)
`select value::text, updated_at from system_settings where key='system_status'` on project KAYAD EA → `isMaintenanceMode: true`, `emergencyMessage: "System under scheduled maintenance."`, feature switches all `true`, no `maintenanceScope`/`maintenanceVersion`, `updated_at 2026-10-27 06:17:02+00`. **The hosted flag is still ENABLED.** Nothing was changed. Evidence: `round2/hosted_readonly/system_status_readonly_check.txt`.

## 2. Archive verification
Previous archive `KAYAD-MAINTENANCE-SCOPES-20261027-OWNER-RECOVERY.zip`: SHA-256 `49f10132efe87fc4a1ba313fd95e5e2f28b7360c8a50838c288e2dda23b5526f` = sidecar; `unzip -t` OK; `sha256sum -c` of its 11,126-entry manifest: 0 mismatches. Extracted to a fresh directory for this round (original untouched).

## 3. Suites and results (this round)
| Check | Command (repo root unless stated) | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Production build | `npm run build` | exit 0 (only the pre-existing chunk-size warning) |
| Frontend tests | `npx vitest run` | 122 files, 980 passed, 1 skipped (pre-existing), exit 0 |
| Backend Jest | `cd backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit` | 179 suites, **3153** passed (+7 new), exit 0 |
| Backend Vitest / node test | `cd backend && npx vitest run --config vitest.config.js` / `npm run test:node` | 36 passed / 1 passed |
| Validators | every `npm run validate:*` (141) | 139 pass; 2 fail only for missing credentials: `validate:communications:providers` (email/SMS provider credentials), `validate:live-runtime` (SUPABASE_URL / service key). Unrelated to maintenance code |
| Changed-file lint | `npx eslint --no-ignore <30 changed files incl. new E2E/browser scripts>` | 0 errors (warnings pre-exist in untouched lines) |
| Repository naming/manifest validator | `node scripts/validate-repository-naming-and-paths.mjs --base <pre-change tree> --manifest <manifest>` | run at packaging (see integrity log) |

## 4. Database E2E and real-browser suites (each on a freshly reset database; run order and exit codes in `round2/regression/e2e_run_order_and_exit_codes.txt`)
| Suite | Mode | Result |
|---|---|---|
| `e2e_maintenance_scope_matrix.cjs` **(new)** | legacy owner | **90/90** |
| `e2e_maintenance_security_controls.cjs` **(new)** | legacy owner | **30/30** |
| `e2e_maintenance_rate_limits.cjs` **(new)** (backend started with `STEP_UP_RATE_LIMIT_MAX=4 ADMIN_RATE_LIMIT_MAX=60`; production defaults 8 / 200) | legacy owner | **6/6** |
| `e2e_maintenance_scopes.cjs` | legacy owner | 67/67 |
| `e2e_maintenance_owner_lockout.cjs` (incident) | legacy owner | 32/32 |
| `browser_maintenance_scopes.cjs` (Playwright, built SPA) | legacy owner | 19/19 |
| `browser_owner_mfa_recovery.cjs` **(new)** (Playwright, built SPA) | owner governance + MFA | **13/13** |
| `e2e_maintenance_owner_mfa_membership.cjs` (incident) | owner governance + MFA | 13/13 |
| `e2e_owner_identity_governance.cjs` | owner governance + MFA | 73/73 |
| `e2e_phase16b_owner_dealer_separation.cjs` / `e2e_phase16c_dealer_staff_separation.cjs` / `e2e_phase16c_mfa_race_stepup.cjs` | owner governance + MFA | 41/41, 40/40, 8/8 |
| `e2e_superadmin_governance.cjs` | legacy owner | 73/73 |
| account security / dealer lifecycle / dealer payments / inventory-team / identity integrity | legacy owner | 47/47, 50/50, 73/73, 60/60, 12/12 |

## 5. Mapping to the eleven numbered requirements
| # | Requirement | Evidence |
|---|---|---|
| 1 | Archive, SHA-256, integrity, manifest; whole implementation reviewed | section 2; review findings F1, F2 in the change ledger addendum |
| 2 | Hosted flag, read-only | section 1 — still enabled |
| 3 | Owner signs in **with MFA**, verifies session, reaches Panic Room, recovers — final build | `browser_owner_mfa_recovery` B3–B12 (password → code prompt, wrong code refused, session `/auth/me` 200, admin data route still 503, Panic Room shows ACTIVE, wrong code cannot end maintenance, correct code ends it, public site back); `e2e_maintenance_owner_mfa_membership` F0b–F6a (recovery code single use, replay refused, step-up required) and G1–G3 (no owner membership ⇒ no lane); `browser_maintenance_scopes` U1–U16. Screenshots `round2/browser/mfa_0*.png` |
| 4 | Technical staff: only explicitly granted recovery functions; no Super Admin / finance / auction / escrow | `e2e_maintenance_security_controls` T1–T8 (granted == ungranted twin on 16 admin/finance/auction/escrow routes; cannot kill-switch, edit permissions, activate; owner AND tech both refused on all 16 during global); `e2e_maintenance_scopes` S1, X5–X8, R1–R5; browser U11–U15 |
| 5 | All scopes × anonymous / existing tokens / refresh tokens / login / logout / session verify / direct API / unauthorised control access | `e2e_maintenance_scope_matrix` (90 checks; hand-written oracle independent of the policy module; 9 identities × 4 scopes × every request type); plus `e2e_maintenance_scopes` D1–D13, B1–B4, O1–O2, X1–X9 |
| 6 | Store / identity outage policy | policy matrix section 7; `e2e_maintenance_security_controls` F0–F7 (really stops PostgREST: shutdown still enforced, recover/activate/status/sign-in answer 5xx, never success, nothing falsely recovered, state identical afterwards, then recovery works); `e2e_maintenance_scopes` E1–E2; unit tests (fail-static ×5, dealer-team lookup failure ⇒ 503) |
| 7 | Concurrency, stale `expectedVersion`, audit, rate limits, CSRF, MFA step-up, UI shows server state | `e2e_maintenance_scopes` C1–C3 (409 with current state), K1–K4, R4; matrix MA1–MA3 (8 audit rows for 8 effective changes, all attributed); security controls C1–C3 (no / forged CSRF refused); rate limits R1–R6; MFA step-up F0b/F0c/F6a; UI: browser U3 (failed activation shows server error, still NOT ACTIVE, DB unchanged), B9, frontend tests (status re-read after every action) |
| 8 | Legacy kill-switch cannot bypass; feature switches correct | security controls L1–L9 (legacy start/end ⇒ 400/503 and no change; auctions switch ⇒ `/bid` 403 "paused", payments unaffected; payments switch; idempotent; `recover all` re-enables only the switches and leaves an active scope alone) |
| 9 | Complete regression, lint, browser, validators | section 3–4 |
| 10 | Deliverables | package: ZIP, sidecar, integrity log, manifest, ledger, policy matrix, this file, deployment plan, rollback |
| 11 | Deployment as a separate approval request | deployment plan: Operation A / Operation B; nothing executed |

## 6. Not verified (cannot be, locally)
Hosted login; the hosted `WEBHOIST_EMAIL` / owner-table state; whether hosted PostgREST accepts the JSON-path conditional update used by the compare-and-swap; real authenticator-app interoperability (codes come from KAYAD's own RFC 6238 implementation); multi-instance cache timing; WebSocket sessions.
