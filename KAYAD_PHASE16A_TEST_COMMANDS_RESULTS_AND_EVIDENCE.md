# KAYAD Phase 16A — Test commands, results and evidence (tiers kept apart)

Environment: PostgreSQL 16.15 (disposable, loopback only, ports 54329/54340/54341/5065), repo migrations fully replayed (208 tables, 0 failures) with the Supabase shim. Nothing connected to a hosted system except `SELECT`s listed in tier H-RO.

## Tier D — disposable database only
| Check | Command | Result |
|---|---|---|
| Proposed primary update (users+profiles), guard, idempotency, CHECK, rollback, roll-forward — hosted trigger set **and** repo trigger set | `runbooks/phase16a-20261026/primary_owner_update_dryrun.sh kayad_base_disposable` | **24 / 24** (`evidence/phase16a-20261026/primary_owner_update_dryrun.log`) |
| Owner governance candidate | `…/pg-tests/owner_governance_pg_checks.sh` | **97 / 97** |
| Owner governance upgrade + rollback | `…/owner_governance_pg_upgrade_rollback.sh` | **15 / 15** |
| Owner MFA candidate (fresh, re-apply, RLS, cascade, rollback, idempotent) | `runbooks/phase16-20261026/owner_mfa_pg_checks.sh` | **23 / 23** |
| Live rollback of MFA + governance on a populated clone, then re-apply | `runbooks/phase16a-20261026/live_rollback_rehearsal.sh kayad_full …` | **10 / 10** |

## Tier A — local application (backend → PostgREST → disposable PostgreSQL)
| Check | Result |
|---|---|
| **Phase 16A arrangement E2E** `e2e_phase16a_arrangement.cjs` (2 consecutive clean runs) | **58 / 58** (`e2e_phase16a_arrangement_final_run1.log`, `…run2.log`) |
| Owner identity / second owner / escalation / TOTP E2E (Phase 16) | 73 / 73 |
| Identity integrity E2E | 12 / 12 |
| Account security E2E | 47 / 47 |
| Dealer lifecycle E2E | 50 / 50 |
| Dealer payments E2E | 73 / 73 |
| Inventory/team E2E | 60 / 60 |
| Super-admin governance E2E | 73 / 73 |
| Backend Jest (includes auction, payments, onboarding, security suites + 6 new) | **173 suites, 3032 tests, 0 failed** |
| Frontend Vitest (includes 3 new) | **119 files, 960 passed, 1 skipped, 0 failed** |
| `tsc --noEmit` | 0 errors |
| `vite build` | success |

What the 16A E2E proves (58 checks): hosted-shaped fixtures (verified `dealer`-labelled primary with 3 live sessions; unverified `pending` test dealer with business name and no dealership rows) · role label is **not required** and **not sufficient** for owner authority · P1 touches 1+1 rows, sessions survive, sign-in works · real operator CLI: plan, wrong-host refusal, one invitation, no token/password output · primary accepts (no new user row), is recognised, bootstrap closes, MFA enrolment · second owner (no prior account): invite needs password+typed address+code, address reserved, duplicate refused, preview, weak password refused, **single use**, **expiry**, own password, one verified user row, own MFA, MFA challenge · peer cannot remove/ban primary (audited) · admin cannot invite or touch owners · revocation (wrong code refused; recovery code accepted), sessions ended, DB/API/UI payload consistent, account kept, re-invite links to the existing account, no duplicates · squatted unverified account linked (same id) · test dealer byte-identical throughout, holds no owner access, then the full normal activation path with owner-only approval and no owner permission afterwards.

Known caveats (honest):
* The first-ever run after a PostgREST schema reload hit an operator-CLI warm-up error once (stdout began with "Error: Bre…" — a transient dependency error while PostgREST reloaded); the command is idempotent and the harness now retries once. Subsequent runs: 58/58 ×2 (and 53/53 ×3 before the extra checks were added).
* TOTP replay protection is cleared between steps inside the harness (`last_used_step=null`) purely so several actions can happen inside one 30-second window; replay refusal itself is covered by the Phase 16 suites.
* ESLint: the changed files match the repository's ignore patterns, so ESLint produced "file ignored" warnings only — **no lint evidence** for them (`evidence/…/regression/eslint_changed.log`). Type-check and tests cover them.
* Phase 14/15 `validate:*` scripts were **not** re-run in this phase.
* Browser-level (Playwright) screen check of the new label was **not** repeated; the UI behaviour is covered by Vitest.
* E-mail delivery was not exercised (links are stood in for by writing a token hash in the disposable DB).

## Tier H-RO — hosted read-only observations
`evidence/phase16a-20261026/hosted_readonly_observations.md`: the two `users` rows (masked), columns used by the proposed update, hosted trigger set, owner-object absence (0 functions / no owner tables), prerequisite status (`kayad_register_identity_atomic` absent; no case-insensitive unique e-mail index; users security columns and refresh-token columns present), and the dealer-onboarding schema gap (`dealers` missing `bio, onboarding_complete, onboarding_completed_at, payment_details`; verification CHECK lacks `suspended`).
