# Test matrix (Stage 5E — verification-recovery scope)

Evidence tiers: **S** source inspection · **M** mocked unit/integration · **P** disposable PostgreSQL · **R** disposable real stack (real SPA + API + PostgreSQL, **stub** mail/SMS/Cloudinary — *not* live delivery) · **B** real Chromium on the disposable stack. **No hosted (H) or live (L) evidence was produced in this stage.** Environment: Node v22.22.2, npm 10.9.4, PostgreSQL 16 on 127.0.0.1:54339, DB `kayad5c_disposable` (+ `*_disposable` clones). Logs: `evidence/stage5e2-20261019/`.

| Check | Command | Tier | Result (observed) | Limitations |
|---|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | S | exit 0 (23 s) | — |
| Frontend build | `npm run build` | S | exit 0 | chunk-size warning only |
| Frontend Vitest | `npx vitest run` | M | **85 files, 668 passed, 1 skipped** (was 662; +6 new) | the skip is pre-existing |
| Backend Jest | `npm run test:jest` (in `backend/`) | M/R | **135 suites, 1961 passed** (was 1941; +20 new) | — |
| Backend Vitest | `npm run test:vitest` | M | 6 files, **36 passed** | — |
| Node `node:test` | `npm run test:node` | M | exit 0 (1 test) | the suite is 1 test |
| Release validators | `evidence/stage5a-20261019/gateG/run_validators.sh` | S | 134 run: **126 exit 0, 8 non-zero** — the **same 8** as the previous stage (`certify:buyer-portal:staging`, `certify:phase6:live`, `certify:v14:live-api`, `certify:v14:production-runtime`, `validate:communications:providers`, `validate:live-runtime`, `verify:backup`, `verify:production`): they need live endpoints / credentials / a backup target that do not exist here | environmental, not regressions |
| Dependency/lockfile | not modified; no `npm install` performed | — | n/a | `package.json`/lockfiles byte-identical to 5D |
| New: login owner-unverified (client) | `vitest` `authApi.ownerUnverified` (4) + `LoginPage.ownerUnverified` (2) | M | 6/6 pass; **3 of 6 fail with the fix reverted** | — |
| New: resend commit-on-acceptance | jest `stage5eResendCommitOnProviderAcceptance` | M | 13/13 pass; **4 failed before the fix** | gateway mocked |
| New: `--verify-designated` | jest `stage5eOwnerDesignatedVerify` (7) + `stage5bOwnerBootstrapCli` (5) | R (spawned process) | 12/12 | — |
| Existing owner/identity suites | `stage5aOwnerIdentityBootstrap`, `stage5aEmailVerificationGate`, `stage5bOwner*`, `stage5bClosureDefects`, `stage4IdentityLifecycle` … (all inside the 1961) | M | pass | — |
| SQL owner/dealer activation | `evidence/stage5e-20261019/pg/owner_dealer_activation_pg_tests.sh` | P | **63/63** | clone of the 5D hosted-like rehearsal DB |
| Privilege candidate rehearsal | `…/privilege_candidate_rehearsal.sh` | P | apply ok; re-apply idempotent; service_role EXECUTE true after, false after rollback; anon/authenticated false | candidate **not applied anywhere shared** |
| **Two-owner journey** | `role_api_k.mjs` | R | **93/93** (K1–K10: login block reproduction, resend/verify, both invitations, negatives, Path A/B, concurrency ×6, audit-failure injection, expiry/revoke/replay, last owner, HTTP/refresh/socket revocation, emergency refusal, ledger append-only, missing/typo config) | stub mail; socket check asserts rejection-or-ordinary only |
| Single-owner journey | `role_api_j.mjs` | R | 35/35 | — |
| Earlier role journeys re-run on the changed tree | `role_api_a/b/c/d/h/i` | R | 70 / 67 / 55 / 49 / 60 / 64 — all pass | — |
| Browser journey (this stage) | `ui_owner_unverified.mjs` (Chromium) | B | **6/6** + screenshots | stub mail |
| Broad browser journeys | `ui_journeys.mjs` | B | **run 1: 14 pass + 1 harness `TimeoutError` (UD.4, resend button not found in 20 s); run 2, immediately after: 35/35** (previous stage: 35/35). Both logs kept | stub providers; the run-1 failure is an **unexplained intermittent** (first dealer-flow load after a fresh Vite start; no application error logged) — not reproduced, not proven benign |
| Secret scan + manifest | package script | S | recorded in `package-summary` | — |

Negative-test coverage requested by the stage brief → where proven: unverified owner (K1, UI1, M A3) · unverified email (K1.5, K2) · conflicting/missing owner config (K9, `stage5eOwnerDesignatedVerify`) · expired/replayed invitation (K4.8/K4.10/K4.14, K6.9) · expired/replayed verification token (K2.5/K2.7/K2.11) · unauthorised owner management (K6.1–K6.4) · duplicate invitations (K6.6–K6.7) · concurrent acceptance (K4.11–K4.12) · failed audit write (K4.6–K4.7) · partial transaction failure (K4.7) · revoked owner access (K7.3–K7.7) · last-owner removal (K7.10) · existing dealer preservation (K5.2, K5.8, J3.4, PG) · no privilege elevation via registration (K1.1, K9.2–K9.3, M A1/A2/A5).
