# KAYAD — Stage 2 Entry Correction and Certification Report (2026-10-18)

Foundation: `KAYAD-FOUNDATION-RECONCILIATION-20261018.zip`, SHA-256 `6dc8d83fe0ae102efc5e7b6a0248fd07eacefb9572cc2b89ff2f7c7022b666e3`.
This report is new and dated. No earlier report was edited.

## 1. Executive summary and decision

> **DECISION: READY FOR STAGE 2 WITH EXPLICIT GATES — and NOT CERTIFIED for any live, database, staging or production behaviour.**
>
> All source-level and locally testable prerequisites pass against the verified artifact. **Gate G0 blocks all Stage 2 work.** The artifact does not contain the five recovered files that the owner reports exist in `kayad-fresh`, and the working tree could not be reached. These corrections must be merged into `kayad-fresh` and re-verified there first. Gates G1–G3 then block the dependent database work (§11).

**What this pass did**
- Confirmed and fixed **7 defects**: 1 critical, 3 high, 2 medium, 1 low. Each fix has a behavioural regression test.
  - **13 of the 19 new tests fail on the unmodified baseline** and pass afterwards.
  - The other 6 are controls that pass on both versions.
- Identified **3 database-contract contradictions** that cannot be resolved without live schema evidence. They are recorded as gates, not "fixed".

**Final verification, run locally under Node 22.22.2**

| Check | Result |
|---|---|
| `tsc` | PASS |
| `vite build` | PASS |
| Frontend Vitest | 643 passed, 1 skipped |
| Backend Jest | **1403/1403** (baseline 1384) |
| Backend Vitest | 36/36 |
| node:test | 1/1 |
| Validators | 205 pass, 1 blocked (provider credentials), 7 skipped (network or live runtime) |
| Playwright (Chromium) | **20/20** backend-free journeys pass; 12 backend-dependent spec files **not run** |

**Advisories:** production `npm audit` reports 0 vulnerabilities for both root and backend.

**Not performed:** no commit, push, deployment, migration, production or staging access, account change, or financial or provider transaction.

## 2. Artifact versus working-tree reconciliation

| Item | Evidence | Result |
|---|---|---|
| ZIP SHA-256 | `sha256sum` | `6dc8d83f…66e3`, matching the value at delivery |
| ZIP integrity | `unzip -tq` | No errors. 5,277 entries; no `.git`, `node_modules` or `.env`. |
| ZIP vs prior session tree | Per-file SHA-256 diff of 4,911 files | **Byte-identical** |
| ZIP vs original foundation (`d1fb0497…`) | File list comparison | Foundation plus only the Stage 1 additions; no deletions or renames |
| **`kayad-fresh` working tree** | `get_device_info` ×3 | **NOT ACCESSIBLE** ("device not connected to the bridge"). Branch, HEAD, status and hashes not obtained. |
| Five recovered files | Searched the ZIP listing for each exact path | **All five absent from the ZIP**, and absent from the original foundation archive too. Classification: **working-tree-only** (as stated by the owner, not verified). |
| `"t proxy\357\200\242"` (tracked) / `tatus --short` (untracked) | Searched the ZIP listing | **Absent from the ZIP.** Not inspected; preserve them in `kayad-fresh` until inspected (`git log --all -- <exact path>`). |

The five files are:
- `KAYAD_STAGE3_CHANGE_LEDGER_20261013.md`
- `KAYAD_STAGE3_SHA256_MANIFEST_20261013.txt`
- `backend/tests/regression/leadControllerPersistence.test.js`
- `backend/tests/regression/logoutBehavior.test.js`
- `runbooks/APPROVED_READONLY_SCHEMA_REHEARSAL_20261013.md`

**Consequence.** Extracting this ZIP over `kayad-fresh`, or replacing it, would drop those files. Apply the **patches** (§12) to `kayad-fresh` instead. Never extract over it.

## 3. Git status (local-only baseline repository; no remote)

- **Initial:** baseline commit `097f4601` is the ZIP, unmodified, with a clean tree.
- **Final:**
  - 9 tracked files modified, plus 2 untracked new test files.
  - This report and `evidence/stage2-entry-20261018/` were then added.
  - No deletions and no renames.
  - Run artifacts (`dist`, `logs`, `backend/data/uploads.sqlite`, `e2e/test-results`) were created by my runs, absent from the baseline manifest, and removed.
  - `git diff --check` is clean.

## 4–5. Confirmed findings and corrections

| ID | Sev | Evidence / root cause | Correction | Test |
|---|---|---|---|---|
| **S2-ESC-01** | **Critical** | `services/auctionFulfilment.service.js#releaseAuctionEscrowAndComplete` is reachable by the auction **organizer (seller)**. It called `escrow.service.releaseEscrow()`, which calls `kayad_transition_escrow_atomic` with **`p_role='admin'`**. Per `20261002180000_escrow_live_operations_hardening.sql:205`, admin may release from `delivered` **and `disputed`**; the seller role may never release. So a seller could skip `APPROVE_ESCROW_RELEASE` governance and release a disputed escrow to themselves (the outcome-level `disputed` check does not cover escrow-level disputes). | The organizer may complete the outcome **only after** a governed release: the escrow route (`escrowAdminOnly` + `escrowReleaseOnly`) or the database auto-release. Otherwise it returns **409 `ESCROW_RELEASE_REQUIRES_APPROVAL`**. The unused import was removed, and the service now documents its caller-authority contract. | `stage2EntryCorrections` S2-ESC-01 (4 states refused, no write; completes after release; non-organizer 403) |
| **S2-FIN-01** | High | `routes/ledgerRoutes.js`: create entry, reverse entry and seed accounts were `adminOnly` (**any staff role**, e.g. `ghost_checker`, `marketing`, `hr`). The documented matrix grants finance (`MANAGE_FINANCE`) to `accounts`, `admin` and `superadmin` only. | Added `requirePermission(PERM.MANAGE_FINANCE)` to the 3 write routes. Reads unchanged (decision D2). | S2-FIN-01 (ghost/marketing 403 with no service call; accounts, admin and owner pass) |
| **S2-SCOPE-01** | High | `routes/marketRoutes.js` `/dealer/insights` used `req.user._id`, but `protect` sets only `id`. The `undefined` filter is skipped by `db/index.js#applyFilters`, so **a dealer received insights computed over all dealers' 50 newest listings**, including pending and hidden ones. | `req.user.id` | S2-SCOPE-01 |
| **S2-AUTH-08** | High | `controllers/disputeController.js` derived the role as `effectiveRole \|\| role`. The owner (`webhoist`) was **denied** dispute resolution and appeal review, and `'webhoist'` would be sent as `p_role` to dispute DB functions that accept only `admin`/`superadmin`/`escrow_officer`. This is the same root cause as Stage 1's S1-AUTH-02, in a controller Stage 1 did not reach. A codebase-wide search found no other instance. | `role = req.user.role` (canonical; the owner is `superadmin`) | S2-AUTH-08 (owner resolves; owner sends `p_role='superadmin'`; ghost denied with no RPC) |
| **S2-AUTH-07** | Medium | `/auth/refresh` issued new tokens to suspended (`isBanned`) or deactivated accounts. `protect` blocks them on every request, but refresh did not. | Same account-state gate as `protect` (owner exempt): 403 `AUTH_FORBIDDEN` | `stage2RefreshAccountState` (control rotates; banned and deactivated return 403 with no rotation or cookie) |
| **S2-FIN-02** | Medium | `ledgerController.reverseLedgerEntry` passed `req.user._id`, which is always `undefined`, so every reversal recorded no actor | `req.user.id` | S2-FIN-01/02 (asserts the actor id reaches the service) |
| **S2-ATTR-01** | Low | `featureFlagController` `createdBy`/`updatedBy` used `req.user._id`, which is always `undefined` | `req.user.id` (the `feature_flags.created_by`/`updated_by` UUID columns exist in source) | Static inspection, plus the full suite |

**Validator contract change (transparent).** `scripts/validate-auction-phase10.mjs` asserted the insecure behaviour: that fulfilment calls `releaseEscrow(` with an `auction-release:` idempotency key. The two checks were replaced with assertions of the corrected contract: fulfilment does not import the admin release service, and completion requires `ESCROW_RELEASE_REQUIRES_APPROVAL`. The new checks were run against the baseline sources and **fail there**, as intended. The validator passes 32/32 on the final tree.

### Deliberately not changed (with reason)

- **9 `admin: req.user._id` fields in `routes/adminRoutes.js` `AuditLog.create`** (referral credits, etc.). Today `undefined` is dropped from the insert. The source `audit_logs` table has **no `admin` column** (§9). Writing a value could turn a silent attribution gap into a 500 **after** money has been credited. This is held for G1.
- **`queueController` DLQ resolve/retry.** These call `JobFailure#markAsResolved`, which does not exist on the generic model, so the endpoints throw regardless of `_id`. This is an operational defect; implementing the method needs an owner decision.
- **Shared audit helpers** (`logAuditEvent`, `logSecurityAction`) are best-effort by contract: they catch and `logError`. They were left unchanged, because forcing them to throw after committed writes would report failure for successful money movements (the 2026-10-15 audit warned against this). The escrow, ledger and fulfilment transitions keep their own atomic DB history (`escrows.history`, `auction_fulfilment_events`, ledger RPCs).

## 6. Tests added

| File | Tests | Baseline behaviour |
|---|---|---|
| `backend/tests/regression/stage2EntryCorrections.test.js` | 16 | 11 fail, 5 controls pass |
| `backend/tests/regression/stage2RefreshAccountState.test.js` | 3 | 2 fail, 1 control passes |

Both files are under Jest's `testMatch` (`**/tests/**/*.test.js`) and run in `npm run test:jest`. The Stage 1 suites (`stage1AuthzConvergence`, `stage1ListingWriteBoundaries`) re-ran and passed.

## 7. Verification (command → result)

Runtime: Node v22.22.2, npm 10.9.4. Local container with an empty environment: no DB, no providers, no secrets. Logs are in `evidence/stage2-entry-20261018/`.

| Command (cwd) | Baseline | Final |
|---|---|---|
| `npm ci` (root / backend / e2e) | exit 0 / 0 / — | e2e exit 0 |
| `npx tsc --noEmit` (root) | exit 0 | exit 0 |
| `npx vitest run` (root) | 643 passed, 1 skipped | 643 passed, 1 skipped |
| `npx vite build` (root) | exit 0 | exit 0 |
| `npm run test:jest` (backend) | 1384/1384 on a **pristine worktree** | **1403/1403** (100 suites) |
| `npm run test:vitest` (backend) | 36/36 | 36/36 |
| `npm run test:node` (backend) | 1/1 | 1/1 |
| New tests on baseline | 13 fail / 6 pass (`baseline_detect_stage2.log.txt`) | 19/19 |
| `node --check` on every changed backend file | — | PASS |
| `node scripts/validate-*.mjs` (213, empty env) | 205/1/7 (prior session, same tree) | 205 pass · 1 BLOCKED (`communications-provider-certification`, needs credentials) · 7 SKIPPED (network or live runtime) |
| `npx playwright test` (Chromium, project config, external wrapper only to set the browser path) | — | **20 passed** |
| `npx eslint src` | — | 4 errors, 1,511 warnings |
| `git diff --check` | — | clean |

**Playwright scope.** 20 passed (onboarding, marketplace controls, workflow certification). The other 12 spec files (auction bidding, escrow, M-Pesa, disputes, chat and others) are filtered out by the project's own config unless `E2E_WITH_BACKEND` is set. They were **not run**.

**ESLint errors (hygiene, not functional):**
- a test-file reassignment;
- an `eslint-disable` comment referencing the uninstalled `react-refresh` rule;
- 2 unnecessary escapes in `CMSContext.tsx`.

The project's `lint` script is `tsc`, which passes.

## 8. Dependencies and advisories

- **npm is canonical** for root, backend and e2e. CI and deploy run `npm ci`, and `package-lock.json` matches all 34 root manifest entries.
- **`bun.lock` is stale.** It mismatches 29 of 34 entries (several are missing, e.g. `axios`; others are behind, e.g. `lucide-react 0.546.0` versus `1.28.0`). The recommendation is to retire it, which needs owner approval (D5). It was not deleted.
- **`npm audit`:**
  - Root: 0.
  - Backend: 3 high and 19 moderate, all in **devDependencies** (`nodemon` → `chokidar`/`braces`; the `jest` 30 chain). The only remediation offered is a semver-major downgrade.
  - Backend with `--omit=dev`: **0**.
  - Nothing was changed. Revisit when upstream non-breaking fixes ship.
- **Backend scripts pointing at missing files:** `seed-depts`, `monitor`, `health-check` and `notify-deployment` still point at absent files. Restore or retire them (D6).

## 9. Schema, RLS and migration findings (static only — no database was accessed)

| ID | Finding | Why it is a gate, not a fix |
|---|---|---|
| **DB-1 (P0)** | The source `audit_logs` table has only `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `actor_role`, `actor_name` and `created_at`. The app writes `actor`, `target`, `targetModel`, `admin`, `actorEmail`, `oldValue` and others. Since the 2026-10-17 change, governance mutations **propagate** audit failures. If the live table matches the source, **every governance mutation returns 5xx after its domain write commits**. | Needs the live `audit_logs` column list. Then either add a forward migration with the columns the app writes, or map app fields to the existing columns. |
| **DB-2 (P1)** | Admin moderation (`adminRoutes.js:576`) and duplicate handling write `cars.status='rejected'`, and `bidController` checks for it. The source CHECK (`20260710043200…:207`) does not allow `rejected`. | Needs the live constraint. Then either extend the CHECK in a forward migration or change the app's status value (D3). |
| **DB-3 (P0, carried)** | `kayad_register_identity_atomic` is defined in source (`20261001090000`, `20261001220000`) but was reported absent in production. Also carried: the 16 missing and 24 hosted-only tables, and R12/R14. | Requires an approved staging rehearsal. Never use `db push --include-all`. |
| DB-4 | 181 migrations, all with unique 14-digit versions; `validate-supabase-migrations` passes | — |

## 10. Area results

| Area | Result |
|---|---|
| Identity and sessions | Registration role is allowlisted (`user`/`dealer`/`individual_seller`); profile update destructures an allowlist. Logout revokes all and bumps `tokenVersion` (existing behavioural test). Refresh rotation and reuse detection have existing tests. Refresh now also gates account state (S2-AUTH-07). Socket handshake verification, periodic revalidation, expiry downgrade and private-room drop were inspected and found sound. |
| Authorization | One canonical role semantic, now also in disputes. Escrow release governance is restored (S2-ESC-01). Ledger writes are permissioned. Dealer insights are tenant-scoped. |
| Audit | Governance audits are strict (DB-1 risk); shared helpers are best-effort with error logging (documented contract). |
| Financial | The M-Pesa callback has a fail-closed IP allowlist (bypass ignored in production), structure validation, idempotency, and B2C amount reconciliation to the cent with atomic RPCs. **No live transaction run.** |
| Auction | Fulfilment release fixed. Collection is organizer-only, while the escrow state machine requires buyer `vehicle_confirmed` before `delivered` → admin release. |
| Integrations | Provider certification is BLOCKED (no credentials). Uploads were not re-audited beyond the existing suites. |

## 11. Gates, risks and owner decisions

**Gates**
- **G0 — blocks ALL Stage 2.** Bring the computer online, or run the steps in §12 yourself. Then:
  1. Apply the cumulative patch to `kayad-fresh` with `git apply --check` first.
  2. Confirm that the five recovered files and the two oddly named files are untouched.
  3. Re-run `npm ci`, the backend tests, `tsc` and the build there.
  4. Commit only after review.
- **G1 — blocks governance and admin-audit work.** Read-only capture of the live `audit_logs` columns, then resolve DB-1.
- **G2 — blocks moderation work.** Read-only capture of the live `cars.status` constraint, then resolve DB-2.
- **G3 — blocks identity and registration work.** Staging rehearsal of the migration chain, including DB-3.

**Safe Stage 2 work after G0:** read-only schema/RLS/grants capture on an approved staging branch (the runbooks already exist), and source work not touching governance, moderation or registration.

**Owner decisions**

| ID | Decision needed |
|---|---|
| D1 | `escrow_officer` can resolve disputes (moves money) per the dispute controller and DB function, but the permission matrix withholds `APPROVE_ESCROW_RELEASE`/`APPROVE_ESCROW_REFUND` from that role. Which is intended? |
| D2 | Ledger, fraud, communications and reliability **reads** and non-money mutations remain `adminOnly` (any staff). Set the role matrix. |
| D3 | `rejected`: extend the CHECK, or change the app value? (See DB-2.) |
| D4 | Dealer self-release UX: the dealer "release escrow" action now returns 409 until KAYAD approves. Confirm this is the intended operating model. |
| D5 | Retire `bun.lock`. |
| D6 | Restore or retire the 4 missing backend scripts and the DLQ `markAsResolved`. |
| D7 | `executive`, `staff` and `super_admin` aliases appear in role lists but not in `ROLE_HIERARCHY`, and the DB rejects `executive`. Remove them, or define the roles? |

## 12. Next actions (dependency order) — owner, Windows Command Prompt, in `kayad-fresh`

```
git status --short
git log -1 --oneline
git apply --check KAYAD-CUMULATIVE-STAGE1-STAGE2-20261018.patch
git apply KAYAD-CUMULATIVE-STAGE1-STAGE2-20261018.patch
git status --short
cd backend && npm ci && npm test && cd ..
npm ci && npx tsc --noEmit && npm run build
```

- If `git apply --check` reports conflicts, **stop** and send the output. Do not force it.
- After a reviewed commit, proceed to G1–G3.

## 13. Changed-file manifest (SHA-256)

`evidence/stage2-entry-20261018/changed_files_manifest.tsv` lists the baseline and final hashes for all 11 source and test files. This report and the evidence folder are additions.

## 14. Source-level completion vs live certification

Everything marked PASS above is **static or local runtime** evidence. Category 1 is static/source; category 2 is local runtime, including Playwright with mocked APIs. **No category 3–5 evidence (disposable DB, staging, production) was produced.** Nothing here certifies live login, schema/RLS parity, M-Pesa, providers, deployment, or production readiness.
