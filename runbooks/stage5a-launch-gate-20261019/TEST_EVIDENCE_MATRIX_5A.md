# Stage 5A — test evidence matrix

Tiers: **M** mocked · **R** local runtime (real app, real browser) · **P** disposable PostgreSQL (16.x) via PostgREST · **H** hosted (read-only) · **L** live provider. Runtime: Node v22.22.2, npm 10.9.4.

## Suites (working tree; logs `evidence/stage5a-20261019/gateG/final/`)
| Suite | Command | Exit | Result | Stage 5 baseline | Tier |
|---|---|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | clean | clean | – |
| Build | `npm run build` | 0 | built | built | – |
| Frontend Vitest | `npx vitest run` | 0 | 82 files · 650 passed · 1 skipped | 82 · 650 · 1 | M |
| Backend Jest | `npm run test:jest` | 0 | **119 suites · 1814 passed** | 113 · 1728 | M |
| Backend Vitest | `npm run test:vitest` | 0 | 6 files · 36 passed | 36 | M |
| node:test | `npm run test:node` | 0 | 1 passed | 1 | M |
| Validators | 134 `validate:/verify:/certify:` scripts | 126 × 0; 8 non-zero | the **same 8** hosted/live validators as the baseline (communications:providers, verify:production, validate:live-runtime, certify:v14:live-api, certify:v14:production-runtime, certify:phase6:live, verify:backup, certify:buyer-portal:staging) — **not passes** | 126 / 8 | – |
| Browser acceptance (seller, dealer, responsive) | `acceptance.mjs` | 0 | 48 PASS · 0 FAIL · 1 NOT TESTED | new | R+P |
| Owner settings UI | `ownerui.mjs` | 0 | 12 PASS | new | R+P |
| Decisions via UI/API | `decide.mjs` | 0 | 15 PASS | new | R+P |
| Gate D real DB (restart, corrupt/missing) | `gateD.mjs` | 0 | 9 PASS | new | R+P |
| Migration replay | Stage 5 `10_replay_migrations.sh` re-run on the unchanged migrations | 0 | 181 applied · 0 failed | 181/0 | P |
| Hosted preflight | `GATE_C_PREFLIGHT_READONLY.sql` | – | 12 OK / **4 MISSING** | – | H |

Regressions vs baseline: **none**. Existing tests updated intentionally (listed in the change ledger). One validator (`validate:owner-identity-convergence`) failed once after my import change because its regexes assumed an exact import list; the pattern was widened (still requires the shared predicate) and it passes 7/7.

## Requirement → evidence
| Requirement | Tier | Result | Where |
|---|---|---|---|
| A: owner-email self-claim impossible (case/space/full-width variants) | M | PASS; pre-fix 10 failed | stage5aOwnerIdentityBootstrap; gateA log |
| A: email verification alone grants no privileged role; registration cannot set role/status/approval | M+R | PASS (DB `individual_seller\|pending` after injection attempt) | same; acceptance J1.11 |
| A: owner exemption consistent in login/refresh/protect/optionalAuth/sockets; unverified owner fails closed | M | PASS | same |
| A: settings APIs authorized on the backend; admin/dealer refused | M+R | PASS (403) | stage5OwnerOnboardingSettings; decide E2/E3 |
| A: hosted owner exists and is verified | H | **NOT MET** (2 users, 0 verified) | Gate C report |
| B: config audit, tokens, resend, redaction | M | PASS | stage5aEmailVerificationGate |
| B: live Brevo delivery end-to-end | L | **BLOCKED** | email runbook |
| C: hosted compatibility | H | **NOT COMPATIBLE** (4 missing); migration candidate prepared, not applied | Gate C docs |
| D: owner operates settings through real UI; save/reload/restart/409 | R+P | PASS | ownerui, gateD |
| D: missing/corrupt/unreadable never opens approval or publication | M+R+P | PASS (unreadable: mocked only) | gateD DB2–DB5 |
| E: hide works; UI honest; sold protected; single+bulk; duplicates; self-publish through every bulk path; both dealer modes; hold/auto independent; approval publishes nothing | M+R+P | PASS | J4.*, E-series, 4 new Jest files |
| E: `rejected` migration | – | **GATED** (owner decision D3) | decision register |
| F: Playwright journeys + 6 widths | R | PASS (seller listing with image NOT TESTED) | browser report |

## Extracted-copy run (checkpoint-1 archive extracted to a new directory; logs `evidence/stage5a-20261019/gateG/extracted_checkpoint1/`)
| Suite | Exit | Result | Tier |
|---|---|---|---|
| tsc / build | 0 / 0 | clean / built | – |
| FE Vitest | 0 | 82 files · 650 passed · 1 skipped | M |
| BE Jest | 0 | 119 suites · 1814 passed | M |
| BE Vitest | 0 | 6 files · 36 passed | M |
| BE node:test | 143 (first run, hang 569 s) → **0 on rerun** | 1 passed on rerun; 25/25 further passes; known intermittent keep-alive hang | M |
| Validators | 126 × 0 · 8 non-zero | same 8 hosted/live validators as baseline, not passes | – |
Final-ZIP extracted run: see the final `…CERTIFICATION.txt`. Known baseline: 1 skipped FE test; 8 hosted/live validators non-zero. Blocked live checks: Brevo delivery, hosted post-migration behaviour, seller image-upload listing (Cloudinary).
