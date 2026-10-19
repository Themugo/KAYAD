# Test evidence matrix — Stage 5B

Tiers: **M** mocked · **R** real application runtime (isolated stack) · **P** disposable PostgreSQL · **H** hosted · **L** live external. Nothing in this stage reached H or L.

| Requirement (brief) | Test / evidence | Tier | Result |
|---|---|---|---|
| Both initial owners (two designated identities) | gov_api J1–J2 (both established through mailbox-bound invitations, bootstrap auto-closes); owner_ui U0/U0.1 | R+P | pass |
| Self-claim cannot grant owner | J0.2–J0.5 (register designated address), J4.7–J4.10 (role label/body/query/user-admin API) | R+P | pass |
| Unverified owner refused (5A guard intact) | Jest `stage5aOwnerIdentityBootstrap`, `stage5bOwnerRegistry` (all registry modes), J0.5, J10.7 | M+R | pass |
| Provisioning idempotency | J1.10–J1.12 (re-run = no duplicate invitation/mail), PG bootstrap checks, J2.17 | R+P | pass |
| Duplicate invitations | J5.8, J5.9, PG duplicate-invite race | R+P | pass |
| Unauthorized add/remove | Jest `stage5bOwnerRoutes` (9 actor classes × list + 5 mutations), J4.1–J4.6, U10 | M+R | pass |
| Admin escalation | J4.x, U10, PG privilege checks | R+P | pass |
| Invitation expiry / replay | J2.7, J6.1–J6.11, U5.1 | R | pass |
| Removal & immediate revocation | J7.0–J7.15, U7 | R | pass |
| HTTP / refresh / socket consistency | J5.16, J7.6 (HTTP), J7.7 (refresh), J7.9 (socket) | R | pass |
| Last-owner protection | PG, J8.4, J8.6, U8.1, U8.2 | R+P | pass |
| Concurrency | PG: 5-round mutual-removal race, duplicate-invite race, double-accept race | P | pass (97/97) |
| Recovery — one owner | J9.4–J9.12, runbook §2 | R | pass |
| Recovery — all owners (emergency) | J10.8–J10.14, runbook §3 | R | pass |
| Fail-closed store | Jest registry (10 malformed shapes, transient, exception), J10.1–J10.6 | M+R | pass |
| Audit completeness | J11.1–J11.2, PG audit checks | R+P | pass |
| Secrets hygiene | J11.3–J11.6, Jest contract suite (static scans), U3.2 | R+M | pass |
| Owner authorization across domains | AUTHORIZATION_MATRIX_5B.md; J3, J4.4, J7.12 (policy), unchanged Stage 1/5/5A suites | R+M | pass |
| Admin console owner section (desktop + mobile) | Vitest `AdminOwnerManagement.test.jsx` (12) ; Playwright owner_ui U1–U10 (25) incl. 390 px width | M+R | pass |
| Email tests (stub) | J1.7–J1.9, J5.5–J5.6, J7.14, J9.5, J10.9; EMAIL_TEST_STATUS_5B.md | R (stub) | pass |
| **Email — live provider** | — | L | **BLOCKED** (no credentials / authorised mailboxes) |
| Migration on hosted DB | — | H | **NOT APPLIED / NOT APPROVED** |
| Migration candidate on disposable PG (181-migration replay + candidate twice) | pg-tests/owner_governance_pg_checks.sh | P | pass (97/97) |
| Full regressions | tsc, build, FE Vitest, BE Jest/Vitest/node:test, validators — see execution report §4 | R | see report |

Evidence files: `evidence/stage5b-20261019/` (journey logs + JSON results, PG log, screenshots, redacted stack scripts, full-run summaries).
