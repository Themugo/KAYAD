# 19 — Final Regression Report

Run on the final working tree (base 8e42413 + this work, uncommitted), 2026-11-22, suites run one at a time. Logs: `evidence/final-gate/`.

| Suite | Result |
|---|---|
| `tsc --noEmit` | PASS |
| Frontend Vitest | **224 files, 1,877 passed, 1 skipped** (baseline 220 / 1,855 / 1) |
| `vite build` | PASS |
| Backend Jest (14 batches, `--maxWorkers=1`) | **4,185 passed, 21 skipped**, 0 failed (baseline 4,165 / 21) |
| Backend Vitest | 11 files, 61 passed |
| `node:test` | 34 pass, 0 fail |
| DB journeys (`ci/db-journeys/run.sh`, disposable Postgres 16, 210/210 migrations) | **overall=PASS**: legacy j1–j10, 03, 05, 07, 09–13, **15 (30/30)**, 14, **16 (31/31)**, 06, 08; journey 13 now enforces exactly-once duplicate submission as a hard check |
| Validators (358 scripts) | 354 pass, **4 fail — all environmental, none exercise code defects**: `validate-live-runtime` (needs SUPABASE_URL/service key), `validate-local-supabase` (needs Docker), `validate-communications-provider-certification` (email/SMS provider credentials), `validate-release` — failed only on a generated `ci/db-journeys/out/mig.tmp` left by the harness; after deleting it **PASS**. The three credential/Docker validators did **not** exercise their checks: reported as NOT EXERCISED, not as passed |
| Skipped | 1 frontend test; 21 backend tests (1 skipped suite) — unchanged from baseline, not hidden |

Fixes made during this run (not weakening tests): `DealerWorkflowWrites` mock updated to mirror the new `vehicleApi` exports (`newSubmissionNonce`, `listingSubmissionKey`).

## Targeted platform-protection audit (prompt §11)
Verified by the passing suites unless noted. Unified personal account (journeys, registration tests) ✔; dealer/staff separation (journey 16, 14) ✔; banking consolidation (journey 10, panel tests) ✔; escrow/offer consistency (journeys 05, 09; `singleEscrowTimeline`) ✔ locally only; listing numbering (13, 15) ✔; sold-listing protection and funded-escrow guards (09) ✔; browser never supplies an amount (payment tests; idempotency change adds no amount input) ✔; D-16 legacy files untouched (`git diff` shows none changed; guard test passes) ✔; homepage hero untouched (no hero file in diff; `validate-home-hero-premium` PASS) ✔; dashboard no false zeros (existing section-contract tests) ✔. Hosted equivalents of all of the above: **NOT VERIFIED** (see 04).
