# KAYAD Stage 4 of 12 — Runtime, Database Contract and Identity Integration Certification
Date: 2026-10-18 · Status: **COMPLETE WITH GATES** (code/test/disposable-DB work complete; G0 provenance gates and owner decisions open)

## 1. Provenance and gates
- Input archive: `KAYAD-STAGE3A-FULL-PROJECT-20261018.zip`, SHA-256 `706a8fe56c4de6133c040aeab8827ccfab42f932ee9359181e2b3e74c5514df8`, 5,380 entries. Byte-identical to the Stage 3A archive I produced earlier (`/home/claude/out`).
- **Mismatch**: the reference checkpoint named in the brief (`…-VERIFIED.zip`, `85f70c3a…83ed`, 5,382 entries) is **not** this file. The `-VERIFIED` file was never supplied. I used the Stage 3A archive as the baseline and make no claim about the reference.
- **G0 (open)**: the Windows working tree (`C:\Users\hp\Desktop\kayad-fresh`) was not reachable from this session, so (a) the working-tree-vs-ZIP provenance comparison, (b) search for the five previously reported files, (c) inspection of `"t proxy…"` / `tatus --short`, and (d) backup verification **were not performed**. The five files were not found in the supplied archive; nothing was recreated. The brief supplied to me was truncated at Workstream I item 5 ("Backend Vit…"); items after it were not seen.
- Node: shell default was 22.22.0 (below the 22.22.2 contract); a 22.22.2 toolchain was used for the certifying runs below.

## 2. Evidence tiers
Static · local runtime (mocks) · disposable local PostgreSQL 16 (own cluster, socket only) · staging — **none** · production — **none**. No hosted database, account, payment or secret was touched. No commit/push/deploy.

## 3. Findings and changes
| ID | Workstream | Finding | Change |
|---|---|---|---|
| S4-B-01 | B audit | 26 admin/announcement/bulk handlers awaited `AuditLog.create` **after** the mutation committed; an audit failure returned 500 for a completed action | `utils/auditAfterCommit.js`: failure is logged loudly (`AUDIT_WRITE_FAILED_AFTER_COMMIT`), never swallowed silently, never fails the committed action. governanceController keeps its strict contract. Policy D9 open |
| S4-C-01..03 | C listing | bulk moderate, bulk delete and duplicate-removal could reject/remove **sold** listings (bypassing `moderationBlockedReason`) | Eligible/skipped partition; 409 `LISTING_MODERATION_BLOCKED` when nothing eligible; duplicate removal checks before marking reviewed |
| S4-C-04 | C listing | `Model.softDelete` did not exist; four delete paths would throw; bulk delete wrote invalid status `deleted` | `softDelete` in `models/_base.js` (cars, users only; `deleted_at IS NULL` guard) |
| S4-F-01 | F authz | `deleteOwnReview` admin override used a role alias inversion | uses `isRoleAllowed(['admin','superadmin'])` |
| S4-F-02 | F authz | dispute endpoints returned the raw escrow row to buyer/seller (private notes, mediator notes, platform fee) | `utils/disputeView.js` party projection; staff keep full row |
| S4-F-03 | F authz | dispute list/stats open to any authenticated user | staff-only |
| S4-H | root package.json | stray top-level key `certify:phase5:browser-contract` | removed (script retained) |
Verified and pinned without change: identity registration/session lifecycle (duplicates, role escalation, deactivated, revoked sessions; no promotion path), register-function static contract, escrow release/approval separation, finance permission matrix, feature-flag subsystem (not mounted, schema undefined — table structure **not guessed**).

## 4. Tests and detection proof
Added 6 suites (`backend/tests/regression/stage4*.test.js`, incl. `stage4RunbookGuard`). Against a baseline copy (neutral helpers only) the new suites produced 31 assertion failures; on the final tree they pass.

| Suite (Node 22.22.2) | Baseline (Stage 3A) | Final |
|---|---|---|
| `tsc --noEmit` | 0 | 0 |
| `vite build` | 0 | 0 |
| Frontend Vitest | 81 files / 643 pass, 1 skip | identical |
| Backend Jest | 102 suites / 1,423 | **108 suites / 1,538**, 0 fail |
| Backend Vitest | 6 / 36 | 6 / 36 |
| `node --test` | 1 pass | 1 pass |
| 134 npm validators | 8 non-zero | **identical set of 8** |
The 8 non-zero validators need live credentials/hosts (`certify:*:live`, `verify:backup`, `verify:production`, `validate:live-runtime`, `validate:communications:providers`, `certify:buyer-portal:staging`); they were not run live and are **not certified**. Logs: `evidence/stage4-20261018/convergence/`.

## 5. Database / migration (disposable DB only)
- Chain analysis: 8 onboarding migrations, no cross-dependency with other pending migrations, 0 inversions (`stage4_dependency_inversions.tsv`); risk matrix in `stage4_migration_risk_matrix.tsv`. **20260930110000 is destructive/irreversible** (drops plaintext refresh tokens). 14 unique-index migrations, 11 non-rerunnable.
- Disposable rehearsal: onboarding double-apply, execute-privilege matrix, G2 low-lock candidate (23/23 checks), preflight SQL validity. Logs in `evidence/stage4-20261018/`.
- Runbook: `runbooks/stage4-rehearsal-20261018/STAGE4_MIGRATION_REHEARSAL_RUNBOOK.md`; read-only preflight `01_…`; G2 candidate `03B_…` (NOT APPLIED). Nothing was placed in `supabase/migrations`; no hosted rehearsal.
- Risky data migrations needing pre-listing: `20261008120000` (bulk escrow capability grant to all `individual_seller`) and `20261011121000` (profiles.role reconciliation).

## 6. Owner decisions required (none applied)
- **D3** `rejected` canonical listing status → apply 03B (until then admin moderation / duplicate removal / report queue writes of `rejected` violate `cars_status_check`; bulk reject writes `hidden`).
- **D5/D6** `adminOnly` admits every staff role; ledger reads need VIEW_FINANCE or MANAGE_FINANCE — confirm intent.
- **D7** dead role aliases (executive, staff, super_admin, manager, engineer): retire or introduce.
- **D8** `feature_flags`: build table + service properly or retire routes (service fails open).
- **D9** audit outage policy: fail-open-with-alert (implemented) vs strict single-transaction RPC.
- **D10** several admin-only checks (leadController ×6, paymentController:430, bidLogController:192) exclude superadmin.
- Also open: four package scripts point at missing backend scripts (seed-depts, monitor, health-check, notify-deployment); stale `bun.lock` (npm is canonical); `GET /ledger/seed` mutates on GET; owner exemption differs between login and refresh; revoke-all documentation mismatch; referral-bonus abuse surface.

## 7. Not done / not claimed
Hosted/staging/production verification; live validators; working-tree provenance; recovery of the five files; backup verification; Workstream I items after "Backend Vit…" (prompt truncated).

## 8. Deliverable
`KAYAD-STAGE4-FULL-PROJECT-20261018.zip` (full project, not changed-files-only) with SHA-256 file and file manifest. Earlier ZIPs preserved.
