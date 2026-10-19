# Test evidence matrix — Stage 5B (certified closure)

Tiers: **M** mocked/unit · **R** real application runtime (isolated local stack) · **P** disposable PostgreSQL 16 · **H** hosted · **L** live external. **Nothing in this stage reached H or L.** All counts below were produced by commands executed in the closure run (logs under `evidence/stage5b-20261019/closure/`); none is copied from an earlier report.

## A. Suites executed on the final source (working tree, then repeated on the extracted ZIP — see RELEASE_VERIFICATION_CERTIFICATE)
| Suite | Command | Exit | Duration | Result |
|---|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | 26 s | clean |
| Production build | `npm run build` | 0 | 9 s | built |
| Frontend Vitest (incl. owner management 12 tests) | `npx vitest run` | 0 | 108 s | 83 files; **662 passed, 1 skipped (pre-existing), 0 failed** |
| Backend Jest (all regression suites; includes the 5 `stage5b*` suites = 70 tests, of which 13 are the closure-defect tests) | `cd backend && npm run test:jest` | 0 | 116 s | **124 suites, 1884 passed, 0 failed** |
| Backend Vitest | `npm run test:vitest` | 0 | 13 s | 6 files, **36 passed** |
| Backend `node:test` | `timeout 300 npm run test:node` | 0 | 1 s | **1 passed** |
| Repository validators | `run_validators.sh` (every `validate/verify/certify` script) | — | — | **126 exit 0; 8 BLOCKED** (need live URLs/credentials/staging: `validate:communications:providers`, `verify:production`, `validate:live-runtime`, `certify:v14:live-api`, `certify:v14:production-runtime`, `certify:phase6:live`, `verify:backup`, `certify:buyer-portal:staging`) |
| ESLint | `npx eslint .` (backend/ is ignored by repo config) | 1 (pre-existing errors) | ~60 s | 1953 errors / 1517 warnings, **identical to the 5A baseline; 0 newly introduced** (`eslint_comparison.txt`) |

## B. Disposable PostgreSQL (P)
| Suite | Result |
|---|---|
| `pg-tests/owner_governance_pg_checks.sh` (181-migration replay + candidate twice; privileges, races, expiry, audit) | **97 / 97** |
| `pg-tests/owner_governance_pg_upgrade_rollback.sh` (populated upgrade, byte-identical fingerprint of 201 tables except `communication_event_controls`, missing-prerequisite abort and atomicity, rollback refusal/export/removal, users untouched) | **15 / 15** |
| Preflight SQL positive and negative (missing `users.deactivated_at` detected) | executed, as expected |

## C. Real isolated stack (R + P): PostgREST → backend → Vite, Brevo **stub**
| Journey | Result |
|---|---|
| `gov_api.mjs` owner API journey J0–J11 | **136 / 136** (41 s) |
| `gov_closure.mjs` closure journey C1–C7 (no-escalation window, wrong recipient, provider outage, interrupted acceptance, interrupted recovery resumed, secrets scan, live rollback fail-closed + roll-forward) | **39 / 39** (21 s) |
| `owner_ui.mjs` Playwright owner journey U0–U10 (incl. 390 px width) | **25 / 25** (44 s) |

## D. Brief requirement → evidence
| Requirement | Evidence | Tier | Result |
|---|---|---|---|
| Two designated owners provisioned only through mailbox-bound invitations | J1–J2, U0 | R+P | pass |
| Self-claim / alternate paths | J0.2–J0.5, J4.x, Jest CL-6 (staff, inspector), C1 | R+M | pass |
| Wrong recipient / replay / expiry / revoked | J2.7, J6.x, C2.1–C2.5, PG | R+P | pass |
| Second owner, remove non-final owner, last-owner refusal | J5, J7, J8, U8 | R | pass |
| Ordinary admin cannot create owners | J4.1–J4.10, Jest route guard matrix | R+M | pass |
| Revocation across HTTP/refresh/socket; cache consistency | J7.6–J7.9, CL-1/CL-2 | R+M | pass |
| Provider failure / interrupted acceptance | C3, C4 | R (stub) | pass |
| Emergency recovery, no permanent bypass | J9, J10, C5 | R | pass |
| Audit / notifications leak no secrets | J11.3–J11.6, C7 | R+P | pass |
| Fail-closed store; rollback does not restore env privilege | J10.1–J10.6, CL-3, C6 | R+M | pass |
| Migration upgrade / prerequisite / rollback | §B | P | pass |
| Post-migration with env list no longer granting privilege | C1.2–C1.5 | R+P | pass |
| **Live e-mail delivery** | — | L | **BLOCKED** (no credentials / authorised mailboxes) |
| **Migration on hosted DB; hosted schema prerequisites** | — | H | **NOT APPLIED / NOT VERIFIED** |
| Both real owner accounts exist, verified, controlled | — | H/L | **UNKNOWN — no evidence; not claimed** |
