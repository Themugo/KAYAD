# KAYAD Phase 16C — Source audit and verification of the Phase 16B claims

## Foundation archive
| Item | Value |
|---|---|
| Archive | `KAYAD-PHASE16B-SOURCE-AUDIT-OWNER-DEALER-SECURITY-CONVERGENCE-20261027.zip` (kept unchanged, read-only) |
| **Actual SHA-256** | `7f97ebe5acb00fc0313f1272cd465638c64e7fca9eb0ee96e5f64f326985d9e3` (`sha256sum`, 275,220,954 bytes) |
| Sidecar | `….zip.sha256` content equals the computed hash |
| ZIP integrity | `unzip -tq`: No errors detected |
| Source manifest | `KAYAD_PHASE16B_SOURCE_MANIFEST.sha256`: **10,825 / 10,825 files OK** against the extracted tree |
**Disclosure:** no 16B archive or sidecar was attached to the 16C request. The archive used is the one produced in the previous (16B) session of this same workspace, so the sidecar is **not an independent** record — if you hold the delivered 16B copy, compare its SHA-256 to the value above. No hash was invented.
The 16A archive (`…PRIMARY-OWNER-SECOND-OWNER-TEST-DEALER-PRESERVATION-20261026.zip`) hashes to `2a6a433175c91fa89c11de646e4eba27ce4b3a6403b90fbe2e5ddefdd135aa0f`; it was supplied without a sidecar.

## 16B claims re-run on the 16C tree (extracted from the 16B archive + the 16C changes)
| Claim (16B) | Command | 16C result | Match |
|---|---|---|---|
| Owner/dealer separation 41/41 | `node runbooks/phase16b-20261027/http/e2e_phase16b_owner_dealer_separation.cjs` (owner mode) | **41/41**, exit 0 | yes |
| Owner governance 73/73 | `…/phase16-20261026/e2e_owner_identity_governance.cjs` | **73/73**, exit 0 | yes |
| Jest 3,063 | `npm run test:jest` (backend) | **3,074 passed / 176 suites** (3,063 + 11 new 16C tests) | yes (+11) |
| Frontend Vitest 960 + 1 skipped | `npm test` | **964 passed, 1 skipped, 120 files** (960 + 4 new 16C tests) | yes (+4) |
| Backend Vitest 36 | `npm run test:vitest` | **36/36** (6 files) | yes |
| node:test 1/1 | `npm run test:node` | **1/1** | yes |
| Browser 18/18 | 16B script on 16B tree: not re-run unchanged; the 16C script extends it (same B1–B8 checks + K/L checks) | **35/35** | yes, superset |
| Validators 141/143 | all `validate:*` scripts | **141/143**; the two failures are `communications:providers` (provider credential set absent) and `live-runtime` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` absent) — environment-dependent, unchanged | yes |
| Matrix 786 × 16 | `role_matrix_probe.cjs` | 786 routes × 16 roles, **zero status differences** vs the 16B final matrix | yes |
| 222 routes with a 500 | same probe, then `classify_500s.cjs` | **222** (1,309 cells) before the 16C fixes; **220** (1,291 cells) after | yes |
| TypeScript / build | `npm run lint` (= `tsc --noEmit`), `npm run build` | exit 0 / exit 0 | yes |
Corrected record: the 16B text said "119 of 121 validators"; the real count is **141 of 143**. No expected number was edited to match.
Other 16A/16B suites re-run: phase16a_arrangement **58/58**, account_security **47/47** (owner-table mode) and **47/47** (legacy mode), identity_integrity **12/12**, dealer_lifecycle **50/50**, dealer_payments **73/73**, inventory_team **60/60**, superadmin_governance **73/73**.

## Lint (explicit, `--no-ignore`; ignored files are not counted as linted)
* The root ESLint config ignores `backend/`. Therefore the 16C-changed files were linted with `npx eslint --no-ignore`: **9 files** (2 frontend, 4 backend, 3 runbook scripts) — **0 errors, 0 warnings** (`validation-logs/phase16c/lint/eslint_changed.log`).
* The 7 code files named in the 16B change ledger were linted the same way: **5 errors in 3 files, all pre-existing**: `backend/db/index.js` (`no-control-regex` for an intentional `\x00` strip) and `backend/models/_base.js` (`no-control-regex` ×2; duplicate keys `FeatureFlag`, `DealerSubscription` with identical values). Not changed in 16C (no behavioural effect; touching the model registry is out of scope).
* A wider pass over `backend/controllers|services|middleware|routes|utils` and the phase 16–16C runbooks reports 139 problems (131 errors, 8 warnings), mostly the frontend ruleset applied to backend code; this is **not** a clean-lint claim for the backend. Log: `eslint_backend_runbooks_full.log`.
