# KAYAD Foundation Reconciliation Report — 2026-10-18

Stage 1: foundation reconciliation, deep audit, root-cause correction and maintainability convergence.
This is a new dated report. No historical report was edited.

**Stage 1 status: BLOCKED.** The local source work passes with direct evidence. One acceptance gate could not be completed: comparing the archive against your live working tree (`C:\Users\hp\Desktop\kayad-fresh`) and its Git HEAD. The linked computer was unreachable. See §A.4 and §G.

---

## Executive summary

1. **Foundation used.** `KAYAD-CONTINUATION-IDENTITY-GOVERNANCE-FIXES-20261017.zip`, with SHA-256 `d1fb0497d0813ad4de810074a62855087d6f3accc527defa52c5a210abb5dd52`. The hash was verified and matches the expected value. The archive has 4,474 files and no `.git` directory.
2. **Toolchain blocker cleared.** Node **22.22.2** (the required version) was obtained from the npm registry package `node-linux-x64@22.22.2`. `npm ci` succeeded for both the root and the backend using the committed lockfiles. This was the main blocker in the previous continuation.
3. **Baseline was already green.** Before any edit:
   - `tsc --noEmit` passed.
   - Frontend Vitest: 643 passed, 1 skipped.
   - `vite build` passed.
   - Backend: Jest 1344/1344, Vitest 36/36, node:test 1/1.
   - Validators: 205 of 213 passed. 1 is blocked by design (no provider credentials) and 7 were skipped (network or live runtime).
   - The historical owner, identity/authz and governance results (7/7, 14/14 and 53/53) **re-ran and passed under Node 22.22.2**.
4. **Eight defects confirmed and fixed**, all in authorization and listing-integrity code. Each fix has a behavioural regression test, and each test was **shown to fail on the unmodified baseline** before passing on the corrected tree:
   - 29 of 40 new tests failed on the baseline.
   - The other 11 are negative or positive controls that pass on both versions.
   - The tests use mocked persistence and drive the real middleware, controller and route code.
5. **No existing file was renamed, deleted or overwritten.**
   - 6 source files were modified and 2 test files added, plus this report, an evidence folder and 3 documentation edits.
   - No production, database, provider, Git push or deployment action was performed.

---

## A. Baseline and preservation record

| Item | Value |
|---|---|
| Archive | `/mnt/user-data/uploads/KAYAD-CONTINUATION-IDENTITY-GOVERNANCE-FIXES-20261017.zip` (31,795,686 bytes, read-only) |
| SHA-256 | `d1fb0497…dd52` — **matches expected** |
| Archive contents | 4,474 files; **no `.git`** → branch/HEAD not derivable from the archive |
| Pristine copy | extracted to an isolated directory and never modified |
| Work copy | separate copy with a **local-only** Git baseline commit `c68eac41` = archive, unmodified. Not pushed and not connected to any remote. |
| Per-file baseline hashes | `evidence/foundation-reconciliation-20261018/baseline_file_sha256.txt` (4,474 entries) |
| Runtime | Node `v22.22.2`, npm `10.9.4`, git `2.43.0`, Linux container |
| Package manager | npm (`package-lock.json`, `backend/package-lock.json`). `bun.lock` also exists at the root and is unresolved (see §G). |
| Env files | Only `.env.example`, `.env.production.example` and `backend/.env.example` are present. No real `.env` was found. |
| Missing referenced evidence | `KAYAD-COMPREHENSIVE-READINESS-AUDIT-20261017.md` is **not in the archive** and was not supplied. Reconciliation used the in-archive reports instead (§C). |

**A.4 — Working-tree comparison: NOT PERFORMED (BLOCKED).** Two attempts to reach the linked computer failed ("device not connected to the bridge"). The following were therefore not checked:

- whether `kayad-fresh` contains changes newer than this archive;
- its branch and HEAD;
- its untracked files.

The corrected tree must be reconciled against that working tree before anything is committed (§G, gate S2-0).

**Final state.** `git status` against the local baseline shows:

- **modified (6):** `backend/config/roles.js`, `backend/controllers/carController.js`, `backend/controllers/eipController.js`, `backend/controllers/governanceController.js`, `backend/middleware/auth.js`, `backend/routes/dealerRoutes.js`
- **added:** 2 regression tests, this report, and `evidence/foundation-reconciliation-20261018/`
- **docs edited (additive only):** `README.md`, `docs/architecture/SYSTEM_AND_MODULE_BOUNDARIES.md`, `docs/runbooks/TECHNICAL_TEAM_HANDOVER.md`

My own runs produced build output (`dist/`), `logs/` and `backend/data/uploads.sqlite`. None of these existed in the baseline manifest, and all were removed. `git diff --check` is clean.

---

## B. Architecture and ownership map (canonical implementations)

| Concern | Canonical implementation | Notes |
|---|---|---|
| Frontend entry | `index.html` → `src/main.tsx` → `src/App.tsx` (React 19 + Vite, port 3000) | API clients live in `src/api/` (`api.exports.ts`) and `src/services/` |
| Backend entry | `backend/bootstrap.js` (loads env, creates dev-only ephemeral secrets when `NODE_ENV≠production`) → `backend/server.js` | Express on port 5000. Routes are mounted in `server.js` and `routes/v1.js` (`/api/*` and `/api/v1/*` aliases). |
| Data access | Supabase/PostgREST. `backend/db/index.js` provides functional helpers; `backend/models/_base.js` provides the Mongoose-shaped model adapter. | Both exist and are used. They share `utils/fieldMap.js`. No third abstraction exists. |
| Schema | `supabase/migrations/` (181 files, unique 14-digit versions) | Live parity is **not** certified (§G) |
| Authentication | `backend/middleware/auth.js` → `protect` (JWT HS256, fresh security row, `tokenVersion`, refresh-session check) | `optionalAuth` is the same module and now applies the same revocation rules |
| Owner identity | `backend/config/owners.js` (`WEBHOIST_EMAIL`/`WEBHOIST_EMAILS`) | The owner is attached as `{role:"superadmin", effectiveRole:"webhoist"}` |
| Roles and permissions | `backend/config/roles.js` (hierarchy, `STAFF_ROLES`, `ROLE_PERMISSIONS`, grants/revokes) | **New canonical helpers:** `isRoleAllowed(user, roles)` for in-controller role checks, and `canManageAnyListing(user)` for cross-owner listing authority |
| Route guards | `auth.js`: `adminOnly`, `allowRoles`, `dealerOnly`, `requireApproved`, `requireRole`. `rbac.js`: `requirePermission`, `requireRole`, `requireAtLeast`. `role.js`: `authorize`. | The two `requireRole` functions now have **identical semantics**: owner and superadmin pass. |
| Listing writes | `controllers/carController.js` (create/update/delete/images), `routes/dealerRoutes.js` (bulk status, mark sold) | Moderation: `POST /admin/cars/:id/moderate`. Verification: `POST /admin/cars/:id/verify`. Promotion: `PATCH /cars/:id/promote`. |
| Governance | `routes/governanceRoutes.js` (route policy) + `controllers/governanceController.js` (`ensure` now delegates to `isRoleAllowed`) | Audit failures propagate. Write and audit are not atomic (§G). |
| Tests | Frontend: Vitest (`npm test`). Backend: Jest + Vitest + node:test (`cd backend && npm test`). Validators: `scripts/validate-*.mjs` (213). | Most validators are **source-string contracts**, not behavioural tests. |
| Deployment | `.github/workflows/deploy.yml` (Vercel frontend) and `render.yaml` (backend) | k8s/Helm manifests exist. Which path serves production is unconfirmed (§G). |

---

## C. Reconciled audit register

### C.1 Historical findings

| ID (source report) | Status | Evidence |
|---|---|---|
| AUTHZ-01 `/auth/me` owner predicate (2026-10-15) | **VERIFIED FIXED** | `routes/authRoutes.js` imports `isOwnerEmail`. Validator re-run passed 14/14 on Node 22.22.2. |
| `/me` safe serializer (2026-10-17) | **VERIFIED FIXED** | Same validator; full backend suite green |
| Governance audit errors swallowed (2026-10-17) | **VERIFIED FIXED** (failures propagate) / **PARTIALLY FIXED** overall | `governanceController.audit` awaits `AuditLog.create`. Write and audit atomicity is still open (§G). |
| Governance reserved-field and risk-status allowlist (2026-10-17) | **VERIFIED FIXED** | `validate-governance-lifecycle` passed 53/53. The behavioural owner path is exercised in the new test. |
| AUTHZ-03 governance dual policy (2026-10-15) | **PARTIALLY FIXED** — the controller now uses the canonical helper, so the owner is no longer denied (S1-AUTH-02) | Two layers still exist by design, with route roles narrower per action. Aliases `executive`/`manager` are not in `ROLE_HIERARCHY` (§G). |
| AUTHZ-02 auction-fulfilment route roles | **NOT RE-VERIFIED** beyond the existing passing suite and `validate-auction-*` (28/28, 24/24) | Service-level party checks were documented on 2026-10-15. A per-action policy decision is still pending. |
| AA-A1 role breadth (`adminOnly` = any staff) | **PARTIALLY FIXED** — listing edit/delete/images now require MANAGE_CARS (S1-LIST-03) | `adminOnly` itself is unchanged. The ledger/fraud/disputes/communications role matrix still needs an owner decision (§G). |
| Owner-identity convergence (7/7) | **VERIFIED** (re-run passed) | `evidence/.../final_validators.tsv` |
| Prior "no full runtime certification / Node 22.16" | **SUPERSEDED BY VERIFIED EVIDENCE** for local tests, typecheck and build | §E |
| Backend scripts reference absent files (handover P1) | **STILL PRESENT** | `seed-depts` → `scripts/seed-departments.js`; `monitor`/`health-check`/`notify-deployment` → `scripts/deploymentMonitor.js`. These files are absent (checked 2026-10-18). |
| npm + bun lockfiles coexist | **STILL PRESENT** (policy decision) | Both files are present at the root |
| Production migration drift, missing `kayad_register_identity_atomic`, COMMS-1/7, R12/R14 | **BLOCKED BY EXTERNAL ACCESS OR APPROVAL** | No staging or production access was used in Stage 1 |
| Live M-Pesa, providers, owner recovery, socket/session certification | **BLOCKED BY EXTERNAL ACCESS OR APPROVAL** | `validate-communications-provider-certification` fails without credentials, by design |

### C.2 Newly confirmed in Stage 1 (all fixed)

| ID | Sev | Defect and root cause | Impact |
|---|---|---|---|
| S1-AUTH-01 | High | `middleware/auth.js#requireRole` compared `effectiveRole \|\| role`, so the owner (`webhoist`) and `superadmin` were denied on `['admin']` routes. `rbac.js#requireRole`, which has the same name, admits both. | The owner and superadmins were locked out of inspection settlement payout and inspector assignment/availability |
| S1-AUTH-02 | High | `governanceController.ensure()` and `eipController.admin()` repeated the same `effectiveRole`-first comparison. There was no canonical in-controller role helper. | The owner passed route guards but was denied by 8 governance mutations and all EIP admin actions |
| S1-AUTH-03 | Medium | `protect()` replaced the cached profile with a security-only row that has no `name`, so `req.user.name` was always undefined | Audit `actorName` was empty across 32 call sites, and dealer team-invite emails fell back to "KAYAD Dealer" |
| S1-AUTH-04 | High | `optionalAuth()` skipped the `tokenVersion` and refresh-session checks that `protect()` enforces | A logged-out or revoked staff token still unlocked non-public listing visibility (`GET /cars/:id`) and caller identity until JWT expiry |
| S1-LIST-01 | **Critical** | On PUT, `validateCar` *merges* (does not strip) a non-strict schema, so `allowedFields` was the only gate. It included `status`, `ntsaVerified`, `logbookVerified`, `dutyStatus`, `isPromoted` and `promotionExpiresAt`. | A seller could self-publish a pending listing without moderation, self-certify NTSA/logbook/duty trust badges, and self-grant front-page promotion |
| S1-LIST-02 | High | `updateCar` computed `escrowEnabled` from the owner's capability, then the allowedFields loop overwrote it from the request | A seller without escrow capability could switch escrow on, breaking the Stage 9 invariant enforced on create |
| S1-LIST-03 | High | Cross-owner edit/delete/image authority was `STAFF_ROLES.includes(role)`, which included `ghost_checker`, `marketing`, `hr`, `accounts` and others | Any staff account, including external inspectors, could edit or soft-delete any listing |
| S1-LIST-04 | High | `PATCH /dealer/cars/bulk-status` wrote any status string and swallowed DB errors | A dealer could set admin-only `rejected` (freezing bidding, which bypasses R15) and re-publish moderation-rejected listings. Invalid values returned `success:true, modified:0`. The UI "Mark Active" sends `active`, which is not in the `cars.status` CHECK. |

### C.3 Observed but deliberately not changed (decision or later stage)

- **Inspection manual payment and refund routes.** `POST /inspection(s)/bookings/:id/payment|refund` use `requireRole(['admin'])` **without** `requireAuth`. They are therefore unreachable for everyone (fail-closed 401), and no frontend calls them. Making them reachable would activate a manual money-recording path, so this is left to the financial gate.
- **`PATCH /cars/:id/promote` lets the listing owner set `isPromoted`.** This is documented as "dealer owns it OR admin". Whether promotion is a paid entitlement is a product decision.
- **Schema contradiction.** Admin moderation and `bidController` use `status = 'rejected'`, but the source `cars.status` CHECK (`20260710043200_…foundational_tables.sql:207`) does not allow `rejected`. The live constraint is unverified. This belongs to the database reconciliation stage.
- **`backend/routes/mediaEventRoutes.js` is not mounted anywhere.** It is dead route code: retained and documented, not deleted.
- **`optionalAuth` reads the `Authorization` header only**, while `protect` also reads the `token` cookie. This is a pre-existing behaviour difference and was left unchanged.

---

## D. Correction ledger

| File (sha256/16 before → after) | Change | Resolves | Contract effect | Tests |
|---|---|---|---|---|
| `backend/config/roles.js` (`1f2370…` → `87fa3e…`) | Added `isRoleAllowed(user, roles)` (owner passes) and `canManageAnyListing(user)` (owner, or staff role holding MANAGE_CARS including grants/revokes; never a seller) | S1-AUTH-02, S1-LIST-03 | Additive exports | `stage1AuthzConvergence` S1-AUTH-02/05 |
| `backend/middleware/auth.js` (`7fb75e…` → `dc9c2a…`) | `protect`: `req.user.name` comes from the cached profile row, while security state stays fresh. `optionalAuth`: enforces `tokenVersion` and session revocation and adds `effectiveRole`/`email`. `requireRole`: owner and superadmin pass. | S1-AUTH-01/03/04 | **Authorization contract.** Owner and superadmin gain access to `['admin']` routes. Revoked tokens become anonymous on public routes. | S1-AUTH-01/03/04 |
| `backend/controllers/governanceController.js` (`611b68…` → `9d3050…`) | `ensure()` delegates to `isRoleAllowed`. The unused `role` helper was removed. | S1-AUTH-02 | Owner admitted, matching the route guard | S1-AUTH-02 (owner allowed, ghost denied, no write) |
| `backend/controllers/eipController.js` (`e274b0…` → `eeb2b0…`) | `admin()` delegates to `isRoleAllowed` | S1-AUTH-02 | Owner admitted | Helper covered by `isRoleAllowed` tests |
| `backend/controllers/carController.js` (`5379fb…` → `34bc93…`) | Cross-owner authority uses `canManageAnyListing` (update/delete/addImages/deleteImage). Non-authorised editors get **403 `LISTING_FIELD_ADMIN_ONLY`** for changed moderation, verification or promotion fields; unchanged round-trips are allowed. `escrowEnabled` was removed from client-assignable fields. | S1-LIST-01/02/03 | **API contract.** PUT `/cars/:id` can now return 403 `LISTING_FIELD_ADMIN_ONLY`. Staff without MANAGE_CARS lose cross-owner edit/delete. | `stage1ListingWriteBoundaries` S1-LIST-01/02/03 |
| `backend/routes/dealerRoutes.js` (`84fb11…` → `968f83…`) | bulk-status changes: <ul><li>allowlist `available,sold,pending,hidden,draft`</li><li>`active` is mapped to `available`</li><li>400 `INVALID_LISTING_STATUS` for any other value</li><li>moderation-`rejected` rows are skipped</li><li>DB errors propagate as 5xx instead of returning false success</li></ul> | S1-LIST-04 | **API contract**, plus a fix to the UI's "Mark Active" | S1-LIST-04 |
| `backend/tests/regression/stage1AuthzConvergence.test.js` (new, `d04f89…`) | 20 behavioural tests | — | — | — |
| `backend/tests/regression/stage1ListingWriteBoundaries.test.js` (new, `739ba4…`) | 20 behavioural tests | — | — | — |

**Remaining risk.** Staff who legitimately edited other sellers' listings without MANAGE_CARS (for example moderators) now need an explicit grant from a superadmin. This uses the existing per-user permission UI.

---

## E. Validation matrix

All commands ran under Node v22.22.2 / npm 10.9.4 in the local container, with an **empty environment**: no DB, no provider and no secrets. Logs are in `evidence/foundation-reconciliation-20261018/`.

| Check | Command | Baseline | Final |
|---|---|---|---|
| Install (root) | `npm ci --no-audit --no-fund` | PASS (470 pkgs) | — |
| Install (backend) | `cd backend && npm ci --no-audit --no-fund` | PASS (812 pkgs) | — |
| Typecheck | `npx tsc --noEmit` | PASS | PASS |
| Frontend tests | `npx vitest run` | 643 passed, 1 skipped (81 files) | 643 passed, 1 skipped |
| Production build | `npx vite build` | PASS (chunk-size warning only) | PASS |
| Backend Jest | `npm run test:jest` | 1344/1344 (96 suites) | **1384/1384 (98 suites)** |
| Backend Vitest | `npm run test:vitest` | 36/36 | 36/36 |
| Backend node:test | `npm run test:node` | 1/1 | 1/1 |
| Validators | `node scripts/validate-*.mjs` (213) | 205 PASS · 1 BLOCKED · 7 SKIPPED | 205 PASS · 1 BLOCKED · 7 SKIPPED |
| Historical trio | owner 7/7 · identity-authz 14/14 · governance 53/53 | PASS | PASS |
| Defect detection | New tests run against the unmodified baseline | 29 fail (expected) / 11 controls pass | 40/40 pass |
| Migration static | Version uniqueness and naming (181 files) + `validate-supabase-migrations` | PASS | PASS |
| Diff hygiene | `git diff --check`; status review | — | PASS |

**Details on the BLOCKED and SKIPPED validators:**

- **BLOCKED:** `validate-communications-provider-certification` requires provider credentials.
- **SKIPPED (network or live runtime):** `canonical-csrf-route`, `local-supabase` (writes generated types and needs the Supabase CLI), `phase3-infrastructure` (live Supabase REST), `live-runtime`, `local-runtime`, `v14-next-phase`, `v14-release-candidate` (spawn servers or package scripts).

**Not executed:**

- browser E2E (Playwright);
- live HTTP/socket/session tests;
- staging or production database, RLS or migrations;
- M-Pesa or provider round trips;
- Docker, Helm or Kubernetes;
- `npm audit` against the live registry.

---

## F. Maintainability and handover

See `docs/runbooks/TECHNICAL_TEAM_HANDOVER.md` (Stage 1 status note added) and `docs/architecture/SYSTEM_AND_MODULE_BOUNDARIES.md` (canonical authorization section added). The rules for engineers are:

- **Role checks inside controllers** must use `isRoleAllowed(req.user, roles)`. Never compare `effectiveRole || role` against a list.
- **Cross-owner listing authority** is `canManageAnyListing`. Ownership is checked separately.
- **Listing moderation, verification and promotion** go through their admin or dedicated endpoints, never through PUT `/cars/:id`.
- **Seller status changes** go through `/dealer/cars/bulk-status` or mark-sold.
- **Never run** without explicit approval:
  - `bootstrap:supabase:production`, `normalize:supabase-migrations` (it writes files), or any `certify:*`/`verify:production` command against live hosts;
  - `backend/seed.js` against a shared database;
  - `supabase db push`.

---

## G. Remaining blockers and dependency register

| Pri | Item | Prerequisite / authority | Environment |
|---|---|---|---|
| **S2-0 (gate)** | Compare this corrected tree against `kayad-fresh` (HEAD, branch, untracked files) and merge before committing | Linked computer online; you review the diff | Your machine |
| P0 | Production/staging schema drift: 16 missing source tables, 24 hosted-only tables, registration RPC, COMMS-1/7, R12/R14 | Staging branch, authorised read/dump, approval for each migration | Supabase staging, then production |
| P0 | Owner account recovery: atomic, no-overwrite, audited | Verified owner identity; staging rehearsal | Staging |
| P1 | Role matrix for `adminOnly` domains (ledger, fraud, disputes, communications, reliability) — AA-A1 remainder | Owner decision; then a `requirePermission` migration with tests | Local |
| P1 | Governance write plus audit atomicity (transaction or outbox) | DB transaction capability verified in staging | Staging |
| P1 | `cars.status` CHECK vs `rejected` usage | Live constraint inspection; forward migration if needed | Staging |
| P1 | Live M-Pesa, provider, socket/session and browser certification | Credentials; staging; `MPESA_TRUSTED_PROXY_CIDRS` | Staging |
| P2 | Backend scripts pointing at absent files (`seed-depts`, `monitor`, `health-check`, `notify-deployment`) | Backend owner chooses restore or retire | Local |
| P2 | npm vs `bun.lock` policy | Tech-lead decision. Do not delete without approval. | Local |
| P2 | Inspection manual payment/refund routes unreachable; owner self-promotion policy; unmounted `mediaEventRoutes.js`; `executive`/`manager`/`engineer` aliases outside `ROLE_HIERARCHY` | Product and financial owners | Local |
| P2 | Production deployment path (Render+Vercel vs k8s/Helm) | Ops confirmation | — |

---

## H. Checkpoint package

`KAYAD-FOUNDATION-RECONCILIATION-20261018.zip` is built after validation from the corrected tree. It excludes `node_modules/`, `.git/` (the local-only baseline repository), real `.env*` files (none exist) and build output. The final SHA-256 is reported alongside the delivery, because the archive cannot contain its own hash. The original foundation archive was not modified.

---

## Final answers (prompt §9)

1. **Foundation:** the archive `d1fb0497…dd52`, verified. Your working tree could not be reached.
2. **Already correct:** the 2026-10-15/17 identity and governance fixes; the build, typecheck and all test suites; migration version hygiene.
3. **Confirmed defects:** 8 (§C.2).
4. **Root causes fixed:**
   - no canonical in-controller role helper;
   - divergent `requireRole` semantics;
   - a security re-select that dropped the profile name;
   - `optionalAuth` missing revocation checks;
   - a merge-not-strip validator combined with an over-broad `allowedFields` list;
   - a role-membership check used in place of the permission model;
   - an unvalidated bulk status write with swallowed errors.
5. **Files changed:** §D.
6. **Tests executed:** §E. All pass; 1 validator is blocked by design.
7. **Blocked or unverified:** §E "Not executed" and §G.
8. **Work lost, renamed or overwritten:** none. Evidence: the baseline per-file hash manifest, a local diff limited to 6 modified and 2 added source files plus docs and evidence, and the original archive left untouched.
9. **More coherent:** yes. There is now one role-check semantic across guards and controllers, and listing write authority follows the documented permission model.
10. **Engineer takeover:** yes, for local work, using the updated README, handover and boundaries documents plus this report.
11. **Highest risks:** live schema drift; owner recovery; the AA-A1 remainder; non-atomic governance audit; an unverified live `cars.status` constraint; and an unreconciled `kayad-fresh` working tree.
12. **Stage 1:** **BLOCKED.**
13. **Evidence:** all local acceptance criteria pass (§E). The working-tree preservation comparison required by Step 1 could not run (§A.4).
14. **Checkpoint:** see §H and the delivery message.
15. **Stage 2 entry gate:** complete S2-0 (diff this tree against `kayad-fresh` and resolve differences). Then commit after your review, and only then begin the staging schema reconciliation, with an authorised staging branch.
