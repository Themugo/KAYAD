# Stage 5E.1 — Test matrix (observed results only)

Runtime: Node **v22.22.2**, npm 10.9.4 (the project's required minimum). All runs on the work tree `/home/claude/s5f/x`, logs in `evidence/stage5e1-20261020/checks/`; the packaging step then re-runs the same battery on the **extracted ZIP** (results in the package summary).

| Check | Command | Result (observed) |
|---|---|---|
| Dependency / lockfile consistency | `cmp` vs `main`; `npm ls --depth=0` (root + backend); every declared dep present in its lockfile | `package.json`, `package-lock.json`, `backend/package.json`, `backend/package-lock.json` **byte-identical to main**; both `npm ls` exit 0; 0 declared dependencies missing from locks. **No dependency changed** |
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Frontend build | `npm run build` | exit 0 |
| Frontend Vitest | `npx vitest run` | **85 files, 668 passed, 1 skipped** (unchanged: no frontend change this stage) |
| Backend Jest | `npm run test:jest` | **139 suites, 2011 tests passed** (1961 + 50 new) |
| Backend Vitest | `npm run test:vitest` | **6 files, 36 passed** |
| Node regression | `npm run test:node` | 1/1 pass |
| Static validator battery | `evidence/stage5a-20261019/gateG/run_validators.sh` | 126 exit 0; **8 non-zero, identical names and exit codes to the Stage 5E.2 baseline**: `validate:communications:providers` (needs real Brevo + SMS credentials: "email: NOT CONFIGURED"), `verify:production`, `validate:live-runtime`, `certify:v14:live-api`, `certify:v14:production-runtime`, `certify:phase6:live`, `verify:backup`, `certify:buyer-portal:staging` — all require live/production/staging endpoints or credentials this environment deliberately lacks. **Not claimed as passing** |
| Gitleaks (repo config) | v8.18.4 `--no-git`, git-mode scratch repo, canary | before 16 → after **14** (older findings only); git-mode old fixture **2** → corrected diff **0**; canary **detected**; new files add **0** |
| Workflow lint | `actionlint v1.7.7` | identical output before/after the candidate bumps (1 pre-existing issue); candidate patch `git apply --check` clean |
| Archive manifest / forbidden / secrets / earlier ZIPs | packaging script | see package summary |

## New tests added this stage (50) and edited tests (2 files)
| File | Tests | Covers |
|---|---|---|
| `backend/tests/regression/stage5e1BrevoResendIntegration.test.js` | 27 | real controller→gateway→email.service→Brevo adapter with stubbed `fetch`: accept, 8 failure modes, config missing, DB failure after acceptance, link expiry/replay/malformed/wrong identity, no oracle, cooldown, accept≠delivered≠clicked, no secret in ledger/logs |
| `backend/tests/regression/stage5e1BrevoAdapterRetry.test.js` | 6 | unset sender default, config object has flags only, real retry (transient then success), permanent 401 retried (documented), missing key/recipient/subject fail before network |
| `backend/tests/regression/stage5e1VerificationRateLimit.test.js` | 5 | real `verificationLimiter` on a loopback Express: 9th request 429 + Retry-After, case-variant bypass, per-address budgets, identical for known/unknown, verify route throttled |
| `backend/tests/regression/stage5e1BrevoReadiness.test.js` | 12 | readiness tool: offline (no network), flag/shape reporting, live mode GET-only with injected fetch, 401/outage/no-key paths, key never printed, `--require-ready` semantics |
| `stage5aEmailVerificationGate.test.js`, `stage5eResendCommitOnProviderAcceptance.test.js` (edited) | 26 (unchanged) | fixture value only; assertions unchanged |
Mutation check: breaking the invariant makes **18** and **11** tests fail (see `RESEND_TOKEN_COMMIT_EVIDENCE_5E1.md`).

## Not run / cannot be run here
Any live Brevo call; hosted DB/PostgREST; hosted CI (Gitleaks action engine, CodeQL, deploy); the 8 live validators; browser E2E (no UI change this stage — the Stage 5E.2 browser journeys 35/35 and owner-unverified UI evidence are carried, not re-run); disposable PG/API harness (no schema or API-surface change; carried from 5E.2: `role_api_k` 93/93, PG 63/63).
