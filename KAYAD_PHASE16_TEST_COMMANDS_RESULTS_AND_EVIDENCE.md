# KAYAD Phase 16 — Test commands, exit codes, counts and evidence

All runs are on the final tree. **Tier legend:** `U` = unit/mocked, `R` = real local stack (app → PostgREST → PostgreSQL 16, disposable DB), `B` = mocked browser, `H` = hosted read-only SELECT, `L` = live provider (**none run**).

| # | Command (from repo root unless noted) | Tier | Exit | Result | Evidence |
|---|---|---|---:|---|---|
| 1 | `cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js --forceExit` | U | 0 | **172 suites / 3026 tests pass** (incl. 17+1 new Phase 16) | `evidence/phase16-20261026/regression/be_jest.txt` |
| 2 | `cd backend && npx vitest run --config vitest.config.js` | U | 0 | 6 files / 36 tests | `…/be_vitest.txt` |
| 3 | `cd backend && node --test --test-force-exit tests/response-lifecycle.test.js` | U | 0 | 1 pass / 0 fail | `…/be_node.txt` |
| 4 | `npx tsc --noEmit -p .` | – | 0 | clean | `…/tsc.txt` |
| 5 | `npx vitest run` | U | 0 | **118 files / 957 pass, 1 skipped** (incl. 7 new) | `…/fe_vitest.txt` |
| 6 | `npx eslint src` | – | 0 | 0 errors (1565 pre-existing warnings) | `…/eslint.txt` |
| 7 | `npx vite build` | – | 0 | built | `…/build.txt` |
| 8 | validator sweep (142 `validate:*`/`verify:*`/`v14:*`/`release` scripts) | – | – | **139 pass / 3 fail** (after fixing one stale pin) — see below | `evidence/…/validators_sweep.txt` |
| 9 | `build_full_schema.sh` — replay all 188 repo migrations | R | 0 | 0 failures, 208 tables | `full_schema_replay_188_migrations.txt` |
| 10 | `owner_governance_pg_checks.sh` | R | 0 | **97 / 0** | `owner_governance_pg_checks.txt` |
| 11 | `owner_governance_pg_upgrade_rollback.sh` | R | 0 | **15 / 0** | `…_upgrade_rollback.txt` |
| 12 | `owner_mfa_pg_checks.sh` (fresh, re-apply, RLS, privileges, constraints, cascade, rollback ×2) | R | 0 | **23 / 0** | `owner_mfa_pg_checks.txt` |
| 13 | `e2e_owner_identity_governance.cjs` (5B + MFA candidates applied) | R | 0 | **73 / 0** | `e2e_owner_identity_governance.txt` |
| 14 | `e2e_identity_integrity.cjs` | R | 0 | **12 / 0** | `e2e_identity_integrity.txt` |
| 15 | `identity/dealer_separation_dryrun.sh` | R | 0 | **10 / 0** | `dealer_separation_dryrun.txt` |
| 16 | carried Phase 15 E2Es in **legacy owner mode** after a live rollback of both candidates: superadmin governance / account security / dealer lifecycle / dealer payments / inventory-team | R | 0 ×5 | **73 / 47 / 50 / 73 / 60, 0 fail** | `e2e_*_legacy_mode.txt` |
| 17 | `e2e_account_security.cjs` with owner tables present (includes the D1 FK drift guard) | R | 0 | **47 / 0** | `e2e_account_security_with_owner_tables.txt` |
| 18 | `role_matrix_probe.cjs` — 786 routes × 16 roles | R | 0 | 15 routes changed vs the pre-gate run, all intended; 0 anonymous 2xx | `role_matrix_final.json`, `role_matrix_delta_vs_phase15.json`, `KAYAD_PHASE16_ROLE_ROUTE_PROBE_MATRIX.csv` |
| 19 | `classify_500s.cjs` | R | 0 | 238 routes: 146/66/25/1 | `classified_500_final.json`, `KAYAD_PHASE16_HTTP_500_CLASSIFICATION_REPORT.md` |
| 20 | `browser_owner_screens.cjs` (Playwright, **API intercepted**) | B | 0 | owner screen, enrolment, recovery codes, invite dialog, mobile (no horizontal overflow), sign-in code step | `evidence/…/screenshots/` |
| 21 | read-only SELECTs on hosted (`ubvgixwhfybbyjuvxboj`) | H | – | two-account findings | `KAYAD_PHASE16_ACCOUNT_IDENTITY_FINDINGS_AND_APPROVAL_GATE.md` |

## Validators that still fail (not relabelled, gates not weakened)
* `validate:communications:providers` — needs live e-mail/SMS provider credentials (same as Phase 15).
* `verify:production` — requires a real deployment URL; none exists in this session.
* `verify:backup` — requires a backup file argument.
* (`validate:live-runtime`, excluded from this sweep by name, still needs SUPABASE credentials — same as Phase 15.)
* One validator, `validate:phase06:departments`, failed because it pinned the *text* of the old ledger gate; it was updated to check the policy-based gate (intent unchanged) and now passes 14/14. The three Jest characterization tests that pinned “ledger reads are adminOnly” were updated for the same reason. These are deliberate behaviour changes, listed in the change ledger.

## Honest notes
* One frontend test (`DealerWorkflowWrites`) failed once while other heavy jobs ran concurrently and passed 2/2 in isolation and in the final sequential run.
* Carried E2Es were run in **legacy owner mode** because that is exactly the current hosted state; owner-mode E2Es (13, 17) run with the candidates applied. The Phase 15 E2E fixture that fabricates “the owner” had to learn to create a membership row when the governance tables exist (fixture change only).
* TOTP correctness is shown against RFC 6238/4226 vectors and by an independent generator in tests; **no real authenticator app, no real Brevo delivery, no hosted database** was involved.
