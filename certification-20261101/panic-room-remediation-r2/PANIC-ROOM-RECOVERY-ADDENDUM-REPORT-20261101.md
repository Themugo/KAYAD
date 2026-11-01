# KAYAD — Panic Room recovery path: real-chain verification and addendum (2026-11-01, round 2)

**Production maintenance is still active. Nothing was changed in production; nothing was committed, pushed, merged or deployed by this work.** Hosted database access in this round: none.

## 0. Correction to the previous report

The previous round's "owner recovery works" evidence (`maintenanceOwnerRecoveryHttp.test.js`) replaced `protect()` with a stand-in, so it did **not** exercise the real authentication and identity-aware maintenance gate. That claim was therefore weaker than stated. This round adds `maintenanceRecoveryRealChain.test.js`, which runs the real chain, and the conclusions below rest on it.

## 1. Evidence-based findings

| # | Finding | Evidence |
|---|---|---|
| R1 | **The recovery endpoints are reachable during GLOBAL maintenance by the owner, and the middleware does not block them.** Order in `server.js`: `checkSystemStatus` (pre-auth; control routes pass because they authenticate themselves) → `csrfProtection` → `/api/admin/system/maintenance` router (registered **before** `/api/admin`) → `protect()` → `enforceMaintenance` (control routes allowed for owner / `platform_recovery`). The status read, state change and a restart-proof recovery all succeed through the real chain using the live account's row shape (role `dealer`, status `pending`, verified e-mail) and the hosted "owner store not installed" condition. | `maintenanceRecoveryRealChain.test.js` — "the owner (role dealer, status pending) reads the persisted state through protect()", "the owner ends maintenance with the real password check…" |
| R2 | **Defect found and fixed: authorization failures were disguised as maintenance 503s under GLOBAL maintenance.** `middleware/maintenanceEnforcement.js` answered `503 SYSTEM_MAINTENANCE` to an authenticated caller who is not permitted to use the controls (any non-owner, a `superadmin`-labelled non-owner, technical staff trying to *activate*), but only returned 403 for scoped maintenance. They now get `403 MAINTENANCE_CONTROL_FORBIDDEN` in every scope. All non-control routes stay 503 under GLOBAL. | `maintenanceRecoveryRealChain.test.js` "…refused 403 … not a maintenance failure"; `maintenanceEnforcementPolicy.test.js` (assertions updated to the corrected status; the requests are still refused) |
| R3 | **Every other refusal on the recovery request has its own, non-503 status**: no token 401; missing CSRF 403; missing `expectedVersion` 428; stale version 409; wrong/missing password **403 `STEP_UP_FAILED`** (not 401); `OWNER_MFA_POLICY=required` with no factor 403 `OWNER_MFA_ENROLLMENT_REQUIRED`; authenticator enrolled but no code 403 `OWNER_MFA_REQUIRED`. The only code paths that can return 503 on a recovery request are: the maintenance gate for a non-owner on non-control routes (not this endpoint), `MAINTENANCE_STORE_UNAVAILABLE`/`AUTH_TEMPORARILY_UNAVAILABLE`/`MAINTENANCE_POLICY_UNAVAILABLE` (genuine database errors) and `OWNER_STORE_UNAVAILABLE` (owner store present but unreadable). | same test file; `services/ownerGovernance.service.js`, `ownerMfa.service.js` |
| R4 | **I could not reproduce a 503 on END MAINTENANCE from the code.** The real response of the failing click is the missing evidence. The UI previously hid the status and code. It now appends `[HTTP <status> · <code>]` to every refusal, so the next attempt identifies the exact cause. | `MaintenanceControlPanel.test.jsx` "refusals are identifiable…" |
| R5 | **Version 0 / unknown operator / generic message are a legacy row, not a defect** (unchanged finding). The reader reports what the row holds; nothing is invented. After the first owner action the version, operator, reason, incident reference and timestamps are written and read back. | `maintenanceRecoveryRealChain.test.js` (state 0 → 1, audit with actor, reason, incident ref, version) |
| R6 | **No duplicated or conflicting maintenance logic exists**: one policy module (`config/maintenancePolicy.js`) used by `systemCheck.js`, `maintenanceEnforcement.js` and `maintenanceControlRoutes.js`; the only other readers of the flags are the freeze policy and the legacy kill-switch handlers, which now delegate to the same writer. | grep of `SYSTEM_MAINTENANCE` / `isMaintenanceMode` across `backend/` |
| R7 | **New: the status response now states what confirmation the server will require** (`confirmation.authenticator`: `not_required` / `required` / `enrollment_required` / `unknown` / `not_applicable`) and the form shows it. This makes the "optional authenticator" ambiguity and the `OWNER_MFA_POLICY=required` trap visible *before* a request is sent. Read-only; it decides nothing. | real-chain test "status tells the owner what confirmation the server will ask for"; UI tests |

## 2. Recovery endpoint allowlist (server-enforced, authenticated, unchanged by this round except R2)

| Endpoint | Who | Confirmation | Notes |
|---|---|---|---|
| `GET /api/admin/system/maintenance/status` | System Owner, or staff with explicit `platform_recovery` | session only (read) | Returns persisted state, scope catalogue, capabilities, freeze states (`featureSwitches`), unavailable controls, confirmation requirement. `Cache-Control: no-store`. |
| `POST /api/admin/system/maintenance/recover` | System Owner, or `platform_recovery` | reason ≥ 8, `expectedVersion`, CSRF, password (+ authenticator when enrolled) | Ends maintenance. Idempotent; audited. |
| `POST /api/admin/system/maintenance/activate` | System Owner only | same + typed `GLOBAL SHUTDOWN` for global | Starts / changes scope. Never delegated to technical staff. |
| `GET /api/auth/me`, `/auth/csrf`, `/auth/profile`, `POST /auth/login`, `/auth/refresh`, `/auth/logout` | session routes | — | Needed to sign in / keep a session; owner / `platform_recovery` only after authentication under global. |

**Deliberately NOT on the allowlist (policy decision, no change):** `/api/admin/system/health`, `/api/admin/system/kill-switch`, `/api/admin/system/recover`, and every admin data route. They stay refused under GLOBAL maintenance for everyone, including the owner. Recovery does not need them (state and freezes are read from `/status`), and exempting admin routes would be the "silent exemption" the safety rules forbid. After maintenance is ended or narrowed to a user-group scope, staff admin routes work again. If you want owner-only emergency health or freeze changes *during* a global shutdown, that is a separate, explicit design decision (section 5).

## 3. Scope × role × route matrix and freeze-control matrix

Unchanged from `panic-room-remediation/PANIC-ROOM-REMEDIATION-REPORT-20261101.md` sections 3 and 4, except: an authenticated caller who may not use the controls gets **403 `MAINTENANCE_CONTROL_FORBIDDEN`** (previously 503 under global).

## 4. Production recovery procedure (System Owner)

1. Sign in with the System Owner account (the e-mail the server has in its owner configuration). If the maintenance panel says only System Owners can use it (HTTP 403 · `MAINTENANCE_CONTROL_FORBIDDEN`), the server does not recognise this login as owner: correct the owner configuration; do not look for a workaround.
2. **Admin → Panic Room → Refresh all status.** Expected: "Global maintenance is active"; health "could not be checked … maintenance is refusing admin requests"; the panel shows **Global shutdown · version 0**, and a line under the code field stating whether an authenticator is required.
3. Choose: **END MAINTENANCE**, or select a narrower scope and **APPLY NEW SCOPE**. Enter reason (≥ 8 chars), optional incident reference, your password, and an authenticator/recovery code only if the page says one is required.
4. Press the button. **If it is refused, the red message ends with `[HTTP <status> · <code>]`. Send me exactly that line** (and nothing secret). The meaning of each code:
   * `403 · STEP_UP_FAILED` wrong password · `403 · OWNER_MFA_REQUIRED` enter your code · `403 · OWNER_MFA_ENROLLMENT_REQUIRED` the server policy needs an enrolled authenticator first · `403 · MAINTENANCE_CONTROL_FORBIDDEN` the server does not recognise the login as owner/recovery · `403` with no code (CSRF) reload the page and retry · `409 · MAINTENANCE_STATE_CONFLICT` state changed, review and retry · `428` refresh the state first · `429` too many wrong passwords, wait 15 minutes · `503 · MAINTENANCE_STORE_UNAVAILABLE` / `OWNER_STORE_UNAVAILABLE` / `AUTH_TEMPORARILY_UNAVAILABLE` a database problem, nothing was changed.
5. Success is only real when the panel re-reads the server and shows **Inactive** (or the new scope) with version **1**, your name, reason and incident reference. Then open Dashboard, Users, Private Seller Applications, Listings, Auctions, Escrows, NTSA, Inspections, Dealer Verifications, Inspector Applications.
6. If a regression appears, freeze the affected control (with a reason) or re-activate the narrowest scope; global needs the typed phrase.

Nothing in this procedure runs automatically on deploy, startup or push.

## 5. Remaining risks / owner decisions

1. Live maintenance is still active until an owner performs step 3.
2. The real failing response has not been observed; R4 explains how to capture it. If it is a code not listed above, send it and I will trace it.
3. Whether the owner should be able to read health / change freezes *during* a global shutdown (currently refused, by design).
4. Owner step-up on the hosted database is password-only (owner MFA tables absent); `platform_recovery` staff have no second factor.
5. Freeze endpoints require `superadmin` + reason but no password step-up.
6. Pre-Inspection and Escrow freezes remain unavailable pending a product decision.
7. D-11 (`ghost_checker` on `/api/admin/stats`) and D-23 (backend advisories) remain open.
8. The real-chain test replaces only the data layer; it is not a run against the hosted database or a live browser.

## 6. Validation (round 2; logs and `exit-codes.txt` in this folder)

| Command | Exit | Result |
|---|---|---|
| `npm run lint` | 0 | clean |
| `npx vitest run` (frontend) | 0 | 138 files; 1201 passed, 1 skipped |
| `npm run build` | 0 | built |
| `node scripts/validate-panic-room-end-to-end.mjs` | 0 | 25/25 |
| `node scripts/validate-business-command-centre-phase04.mjs` | 0 | pass |
| `cd backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit` | **1** | 184 of 185 suites; 3412 of 3413 tests. The one failure is the pre-existing **D-11** (`stage5f5RoleRouteMatrix`, `ghost_checker` on `/api/admin/stats`), identical to the earlier baseline and untouched. |
| `cd backend && npx vitest run --config vitest.config.js` | 0 | 6 files, 36 passed |
| `cd backend && node --test tests/response-lifecycle.test.js` | 0 | 1 passed |

Tests added or changed this round: `maintenanceRecoveryRealChain.test.js` (new, 15), `maintenanceEnforcementPolicy.test.js` (two assertions corrected to 403 for unauthorised control callers; requests are still refused), `maintenanceOwnerRecoveryHttp.test.js` (stand-in aligned to real step-up status), `MaintenanceControlPanel.test.jsx` (+4).

Files changed this round: `backend/middleware/maintenanceEnforcement.js`, `backend/routes/maintenanceControlRoutes.js`, `src/components/admin/MaintenanceControl.jsx`, defect register (D-30).
