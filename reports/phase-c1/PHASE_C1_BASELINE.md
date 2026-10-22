# PHASE C.1 — Foundation Baseline

**Date:** 2026-10-21 · Executed before any Phase C.1 source change. Statuses: PASS / FAIL / BLOCKED / NOT VERIFIED / SOURCE-LEVEL ONLY.

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Supplied foundation located | PASS | `KAYAD-MASTER-CONVERGENCE-PHASE-C-DATA-INTEGRITY-20261021.zip`, 62,081,482 bytes |
| 2 | SHA-256 calculated independently | PASS | `385b6cd29f9f8e7e8b3a7a682d6f537269eeac1a7c10dbd61c5385c7aa6bcd68` |
| 3 | Accompanying `.sha256` file | **NOT VERIFIED** | No checksum file was supplied with the ZIP, so the hash above could not be compared with an expected value. Provenance was established by content comparison instead (row 7). |
| 4 | ZIP integrity | PASS | `unzip -tq`: no errors |
| 5 | Inventory | PASS | 5,999 files + 466 directory entries; single root folder `kayad-phaseC-work/` |
| 6 | Git metadata in archive | NOT VERIFIED | No `.git` in the ZIP. Remote `main` was read instead: HEAD `2e9e098a652ae40b58f76cf9f6329db93f266efc` ("Phase B: restore production build, typecheck, tests and CI audit") |
| 7 | Provenance vs Phase B | PASS | File-level diff against the Phase B release ZIP (`68c55272…3b3`, the archive Phase C declares as its foundation): **16 files modified, 5 added, 0 deleted**, exactly matching `reports/PHASE_C_CHANGED_FILES.txt`. No undeclared change. |
| 8 | Phase B ≙ `main` | PASS (with note) | `2e9e098` equals the Phase B archive except two stray files committed with it (`tatus`, `iness Command Centre phases 1-7`+U+F022: captured `git diff --stat` text, no secrets). Not present in any ZIP. Register R-11. |
| 9 | Production state (read-only) | PASS | `https://www.kayad.space/release.json` → `2e9e098…`; `https://api.kayad.space/health` → buildId `2e9e098…`, database ok. Frontend and backend converged on Phase B. |
| 10 | Manifests and lockfiles | PASS | `package.json c8eacb68…`, `package-lock.json f0d1c903…`, `backend/package.json 9f1083f3…`, `backend/package-lock.json a4bac694…`. Lockfiles byte-identical to Phase B, as Phase C states. |
| 11 | Phase C reports read | PASS | `KAYAD_MASTER_CONVERGENCE_PHASE_C_REPORT.md`, `reports/PHASE_C_SCHEMA_TABLE_RECONCILIATION.csv` (183 rows), `reports/PHASE_C_SOFT_DELETE_CALLSITE_INVENTORY.csv`, Phase B and Phase 0 reports, Phase 07 report |
| 12 | Phase C changes and validator present | PASS | `scripts/validate-phaseC-soft-delete-integrity.mjs`, npm script `validate:phaseC-soft-delete`, helper/adapter null semantics in `backend/db/index.js` and `backend/models/_base.js` |
| 13 | Secrets / dumps | PASS | Pattern scan (Brevo, Stripe-style, service-role JWT, private keys): only placeholders (`eyJhbGc...`), detection rules and redacted fixtures. No `.env`, `.sqlite`, `.dump` or bulk SQL data. |
| 14 | Runtime | PASS | Official `node-linux-x64@22.22.2` binary (nodejs.org is not reachable from this environment; the npm-registry package is the official build), npm 10.9.4, Linux 6.18 x86_64, git 2.43.0 |
| 15 | Clean install from lockfiles | PASS | `npm ci` root exit 0; `npm ci` backend exit 0; all four manifest hashes unchanged afterwards |

## Phase C as supplied — runtime baseline (before Phase C.1 edits)

| Command | Status | Result |
|---|---|---|
| `npm run typecheck` | PASS | 0 errors |
| `npm run build` | PASS | exit 0 |
| `npx vitest run` | PASS | 95 files, 759 passed, 1 skipped |
| backend `npm run test:jest` | **FAIL** | 150/151 suites, 2,569/2,570 tests. `stage5f5CommandCenterSnapshot.test.js › the operator queues exist and use the same definitions as the destination pages` |
| backend `npm run test:vitest` | PASS | 36/36 |
| backend `npm run test:node` | PASS | 1/1 |
| All `validate:*` scripts (135) | PASS 131 / FAIL 4 | The same 4 pre-existing failures as Phase B (credentials-dependent or known stale; see test results) |
| Soft-delete runtime test against real PostgREST (written in C.1, run on unmodified Phase C code) | **FAIL** 14/21 | 5 public read paths leak soft-deleted vehicles; model adapter `$ne: null` raises 22007; 1 test-side column error (corrected) |
