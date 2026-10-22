# KAYAD Stage 4A — Checkpoint Reconciliation, Security Gates and Stage 5 Entry Certification
Date: 2026-10-18 · Status: **STAGE 4A COMPLETE WITH GATES — FULL PROJECT CHECKPOINT VERIFIED** (the checkpoint claim covers the ZIP's integrity and the source-level results in section 3; see section 1 for what is *not* certified)
Stage 5 was not started.

## 1. Provenance and gate G0 (NOT closed)
| Item | Result |
|---|---|
| Foundation actually used | `KAYAD-STAGE3A-FULL-PROJECT-20261018.zip`, SHA-256 `706a8fe56c4de6133c040aeab8827ccfab42f932ee9359181e2b3e74c5514df8`, 5,380 entries (byte-identical to the Stage 3A archive built earlier in this engagement) |
| Stage 4 checkpoint | `KAYAD-STAGE4-FULL-PROJECT-20261018.zip`, SHA-256 `a3dc6253d58889edb5bd7b28796f6c5f723052496af9ccb016628c29b8da9015`, 5,410 entries; Stage 4A started from exactly that tree |
| Reference `-VERIFIED` ZIP (`85f70c3a…`, 5,382 entries) | **Never supplied; does not match the Stage 3A file.** No claim is made about it |
| Windows tree `C:\Users\hp\Desktop\kayad-fresh` | **Unreachable** (device bridge reported "not connected", retried). Branch/HEAD/remote/status/diff of the real repository, working-tree vs ZIP comparison, which Stage 4 changes exist on the Windows disk, backup creation/verification, and inspection of the unusual tracked-deleted path and `tatus --short` artifact **were not performed**. Provenance of the Windows project is therefore **not certified**; only ZIP provenance is |
| Five previously reported files | Searched by name in every archive held (Foundation, Stage 2, Stage 3 package, Stage 3A, Stage 4, and the 2026-10-17 continuation ZIP): **none present.** Nothing was recreated |
| Git facts that can be stated | The work area is a scratch repository created from the Stage 3A ZIP (branch `master`, no remote, 2 local commits made *in the scratch area only*); it is not your repository. Nothing was pushed or committed to any remote |
| Runtime | Node v22.22.2 (toolchain), npm per `runtime_versions.txt`. The shell default Node (22.22.0) is below the project's `>=22.22.2` and was not used for certifying runs |

To close G0: link the Windows session (open this chat in the desktop app on that PC) so `git rev-parse HEAD`, `git status`, `git diff --stat`, the five-file search, the odd paths and the backup check can be run read-only, or run the same commands yourself and paste the output.

## 2. Gates G1–G9
| Gate | Finding (evidence) | Action | Status |
|---|---|---|---|
| G1 `rejected` | Confirmed: admin moderation, duplicate removal and the report queue write `rejected`; `cars_status_check` excludes it; readers in bid/auction/ops. Candidate 03B (low-lock) exists outside the chain | Static pins for writers/constraint/candidate; transition guard tests; approved migration sequence documented in the safety pack. **Not applied, not in `supabase/migrations`** | GATED on D3 |
| G2 finance | Reads: `adminOnly` only (all staff). Writes: `adminOnly` + `MANAGE_FINANCE`. `VIEW_FINANCE` **does not exist** in `config/roles.js` | No change (nothing broadened/narrowed); documented | OPEN D5/D6 |
| G3 aliases/overrides | `executive/staff/super_admin/manager/engineer` cannot be stored (`users.role` CHECK) and so grant nothing. Lead ×6, payment status, bid-log checks tested literal `admin` (excluded superadmin) | Canonical `isRoleAllowed(["admin","superadmin"])` in those 8 places (a *broadening to superadmin only*); tests | D10 implemented, owner to confirm |
| G4 feature flags | **Correction to Stage 4:** routes ARE mounted (`/api/feature-flags`); the store is unusable (no migration, missing import/helpers) and the service/middleware failed OPEN (`evaluate/:key` answered `enabled` for every key) | Service fails closed; 7 middleware catch-blocks return 503; tests. No table invented | D8 OPEN (retire vs build) |
| G5 audit | 26 sites use fail-open-with-log; governance strict. Error logs reach Sentry only if configured (not verified) | Critical actions get one retry and `critical:true` marker; recommendation hybrid (register D9) | D9 OPEN |
| G6 `GET /ledger/seed` | State-changing GET (idempotent upsert of 12 accounts, overwrites names). No in-repo consumer | `POST /seed` (admin + MANAGE_FINANCE); GET → 405, never reaches service; OpenAPI updated; HTTP-level tests | Done |
| G7 owner/session | Login lacked owner exemption present in `protect`/refresh; reset did not clear the auth cache; revoke-all doc said "except current" but code revokes all and bumps tokenVersion | Login exemption, cache invalidation, doc fixed | Done (D11 reversible) |
| G8 scripts/lockfile | 4 scripts target files absent from every archive; `bun.lock` cannot reproduce `package.json` | Scripts disabled with explicit failing message (not invented); `bun.lock` kept, documented non-authoritative; tests | D12/D13 OPEN |
| G9 referral | Operator-object `referralCode` reached `findOne`; credit before record; no double-credit guard; admin credit accepted non-numeric amounts and had a check-then-set race; unverified-referee credit, no caps | Guards implemented (`utils/referralGuards.js`), record-before-credit, conditional claim; policy items registered. No payouts exist in code | D17 OPEN (policy) |

Changed files: `stage4a_change_list.txt` in `evidence/stage4a-20261018/`. New tests: `stage4aGateClosure.test.js` (43 tests) plus 5 additions in `stage4RunbookGuard.test.js`; two Stage 4 characterization tests and one Stage 2 test were updated deliberately (they pinned the old behavior). **Detection proof:** against the Stage 4 code the new suite fails 18 tests (`detection_on_stage4_code.log`).
Not tested end-to-end: login/refresh/reset (G7) and registration referral crediting (G9) are pinned by source-level assertions plus pure-function tests, not by executing the handlers.

## 3. Revalidation (Node 22.22.2, work tree, results are fresh executions)
| Check | Stage 4 (reported) | Stage 4A |
|---|---|---|
| `tsc --noEmit` | pass | **pass** |
| `vite build` | pass | **pass** |
| Frontend Vitest | 81 files, 643 pass, 1 skip | **same** |
| Backend Jest | 108 suites, 1,538 | **109 suites, 1,586, 0 fail** |
| Backend Vitest | 6 / 36 | **6 / 36** |
| `node --test` | 1 pass | **1 pass** |
| 134 validators | 8 non-zero | **same 8** (`certify:buyer-portal:staging`, `certify:phase6:live`, `certify:v14:live-api`, `certify:v14:production-runtime`, `validate:communications:providers`, `validate:live-runtime`, `verify:backup`, `verify:production`) — need live credentials/hosts, **not run live, not certified**, not weakened |
| `git diff --check` | – | clean |
| ESLint (`src`) | – | 4 errors / 1,511 warnings, **pre-existing and in unchanged files** (`src/` untouched since Stage 3A); not addressed |
| Migration dependency analysis | 0 inversions | **0 inversions** (181 migrations, 307 objects) |
Two validators (`validate:release`, `validate:wave3-convergence`) failed once because the new `POST /api/ledger/seed` route was undocumented in `backend/openapi.yaml`; the route was documented, the validators were not touched.

## 4. Migration and staging safety
`runbooks/stage4a-gate-closure-20261018/`: `MIGRATION_SAFETY_PACK_THREE_MIGRATIONS.md`, `02_…PREFLIGHT…sql`, `03_…POSTVERIFY…sql` (SELECT-only, counts only).
Disposable-database evidence (PostgreSQL 16.15, own cluster, unix socket only, synthetic data, DB names `rehearsal4a*`, stopped and deleted afterwards): preflight on pre-migration shapes; apply of the three migrations in order; post-verify (all checks pass; **live sessions 20 → 20**); abort scenario (rows without token → migration fails atomically, table unchanged). It proves the SQL and migration behavior on stand-in schemas, **not** the hosted schema.
**Corrections to Stage 4:** `20260930110000` backfills `token_hash` before dropping `token`, so live sessions survive (still irreversible for the plaintext column; fails if a row has neither); `20261011121000` can *raise or lower* database-level admin visibility, not just "reconcile".
Nothing was applied to shared staging or production; no `db push --include-all`.

## 5. Owner decisions
Full register: `runbooks/stage4a-gate-closure-20261018/OWNER_DECISION_REGISTER.md` (D3, D5/D6, D7, D8, D9, D10, D11, D12, D13, D14, D15, D16, D17 with affected files, evidence, impact, options, recommendation, approval need and what proceeds safely). Approvals needed before Stage 5 builds on them: **D3, D5/D6, D8, D9, D14, D15, D17**; confirm **D10/D11/D16**.

## 6. Not done / not claimed
Windows-tree provenance, backup verification, recovery of five files, odd-path inspection (G0); any hosted/staging/production verification; the eight live validators; end-to-end execution of login/refresh/referral handlers; Stage 5.

## 7. Package
`KAYAD-STAGE4A-GATE-CLOSURE-FULL-PROJECT-20261018.zip` — complete project (not changed-files-only). Its SHA-256, size, file manifest (path, size, SHA-256), exclusions and the independent-extraction results are in the accompanying `…zip.sha256`, `…file-manifest.tsv` and `…CERTIFICATION.txt` (an archive cannot contain its own hash). Exclusions: `.git`, `node_modules`, `dist`, `coverage`, logs, `*.sqlite` runtime databases, any non-template env file (none present). Earlier ZIPs are untouched.
