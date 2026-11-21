# Stage 5 — test evidence matrix

Tiers: **S** static · **M** mocked local runtime (emulated persistence) · **P** disposable local PostgreSQL 16.15 · **H** hosted/staging · **L** live provider · **B** browser. Only tiers actually executed are claimed. Node.js 22.22.2, npm 10.9.4.

## Suite results on the final tree (`evidence/stage5-20261019/final/`)
| Suite | Command | Exit | Result | Baseline (Stage 4A) |
|---|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | clean | clean |
| Frontend build | `npm run build` | 0 | built | built |
| Frontend Vitest | `npx vitest run` | 0 | 82 files · 650 passed · 1 skipped | 81 · 643 · 1 |
| Backend Jest | `npm run test:jest` | 0 | **113 suites · 1728 passed · 0 skipped/failed** | 109 · 1586 |
| Backend Vitest | `npm run test:vitest` | 0 | 6 files · 36 passed | 36 |
| node:test | `npm run test:node` | 0 | 1 passed | 1 |
| Validators | every `validate:` / `verify:` / `certify:` script | see `validators_results.txt` | same 8 hosted/live validators non-zero as the baseline; all others 0 | 8 non-zero |
| Real PostgreSQL checks | `disposable-pg/20_onboarding_pg_checks.sh` | 0 | 28 PASS · 0 FAIL | not run before |
| Migration replay | `disposable-pg/10_replay_migrations.sh` | 0 | 181 applied · 0 failed | not run before |

Regressions vs baseline: **none** (every previously passing test still passes). Four existing test files had fixtures updated to state the policy explicitly (they implicitly relied on the old defaults); no assertion was weakened. Deltas: frontend +7 tests; backend Jest +142 tests, +4 suites.
Flakiness note: an earlier Stage 5 run showed one random suite failing per run; root cause was my own new `createCar` tests leaving a background task unresolved (fixed; three subsequent full runs passed 113/113).

## Requirement → evidence
| Requirement | Tier | Result | Where |
|---|---|---|---|
| Owner settings: unauthorized access | M | PASS (every non-owner role refused; 401 unauthenticated; superadmin non-owner `OWNER_ONLY`) | `stage5OwnerOnboardingSettings` |
| Invalid values / unknown / inherited keys / mass assignment | M | PASS | same |
| Missing config → launch defaults; unreadable → restrictive; corrupt → per-field restrictive | M | PASS | same |
| Failed persistence → 500, no success audit, value unchanged | M | PASS | same |
| Concurrent updates → one wins, one 409 | M **and** P | PASS (row-lock proof on real PG) | same; `pg_checks.log` B5 |
| Restart persistence | M (cache dropped + re-read) / P | PASS (a real process restart was not performed) | same |
| Audit: actor, old/new value, outcome, no secrets | M | PASS | same |
| Registration policy (seller disabled, dealer closed, unavailable→503, runtime change) | M | PASS | `stage5RegistrationAndLifecycle` |
| No elevated flags reach the database | M, P | PASS | same; `pg_checks.log` A4 |
| Atomic registration, duplicates, concurrent duplicates, orphan rollback, privileges | P | PASS | `pg_checks.log` A1–A8 |
| Seller verified-email gate independent of provider config | M | PASS | `stage5RegistrationAndLifecycle` |
| Token: valid, replay, concurrent, expired, malformed, hashed at rest | M | PASS | same |
| Resend: generic response and token-replacement logic | M (existing suites, unchanged) | PASS | `registrationContract`, `securityCertification`. Rate limiters are existing middleware, **not retested** here |
| Dealer mode 1 (self) / mode 2 (approval) / closed / unreadable | M | PASS | `onboardingFlow`, `stage5RegistrationAndLifecycle` |
| Atomic dealer decisions, duplicate decision, concurrent approve/reject | M | PASS | `stage5DealerDecisions` |
| Ordinary admin cannot decide unless delegated; unavailable policy → owner only | M | PASS | `stage5OwnerOnboardingSettings` |
| Dealer approval ≠ listing publication | M | PASS | `stage5DealerDecisions` |
| Listing moderation setting controls status; client status ignored | M | PASS | `onboardingFlow` |
| Seller self-publication blocked | M | PASS | `stage1ListingWriteBoundaries` (bulk-status) |
| Dealer-platform bulk and duplicate-listing self-publication blocks | S/inspection | **Implemented, no dedicated test** | change ledger |
| Wording: received ≠ verified ≠ approved | M | PASS | `stage5RegistrationAndLifecycle` |
| Log redaction | M/S | PASS | `stage5LogRedaction` |
| Admin UI: view, read-only for non-owner, save, failure, conflict, unavailable | M (jsdom) | PASS | `AdminSettingsOnboarding.test.jsx` |
| Sold-listing protections, `cars_status_check`, rejected | S/P | existing tests pass; constraint verified on PG; 03B rehearsed on a PG copy | `pg_checks.log` C1 |
| CSRF / session revocation / suspension / logout | M (existing suites) | PASS, unchanged | existing |
| **Playwright browser journeys, mobile and desktop** | B | **NOT RUN** — needs a running backend with a database and seeded accounts; none available in this session | — |
| **Live Brevo delivery and inbox test** | L | **BLOCKED** — no credentials, no authorized recipient | email runbook |
| **Hosted/staging database, PostgREST, RLS via API** | H | **NOT RUN** | risk register |
| Windows tree / backup / odd paths (G0) | — | **NOT INSPECTED** (bridge not connected) | baseline report |
