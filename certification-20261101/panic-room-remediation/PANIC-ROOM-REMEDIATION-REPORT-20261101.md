# KAYAD — Panic Room, Maintenance & Emergency Freeze Controls: Remediation Report (2026-11-01)

**Status: code fixed and tested locally. Production maintenance is STILL ACTIVE.** No production state was changed, nothing was committed, pushed, merged or deployed. The live flag can only be cleared by an authorised System Owner (procedure in section 8). Hosted database access during this work was read-only `SELECT`s.

## 1. Root-cause findings

| # | Finding | Evidence |
|---|---------|----------|
| F1 | **The 503s are the maintenance flag working as designed.** Hosted `system_settings.system_status` has `isMaintenanceMode=true`, no `maintenanceScope`, no `maintenanceVersion`. `normalizeSystemStatus` treats a flag with no scope as a **GLOBAL** shutdown. Under GLOBAL, every route except session endpoints and the maintenance control plane is refused for everyone, including the owner (`config/maintenancePolicy.js` `decide`). Nothing in code ever clears it automatically (by design). | Hosted SELECT; `maintenanceOwnerRecoveryHttp.test.js` "every ordinary and admin route is refused 503" |
| F2 | **"Version 0" and "unknown operator" are legacy-row normalisation, not corruption.** A row written before scoped maintenance has no version or metadata; the reader reports `version: 0`, operator `null`. | `maintenanceOwnerRecoveryHttp.test.js` "owner can read the persisted state … version 0, no operator" |
| F3 | **"Refresh all status" fails because the health endpoint is an ordinary admin route** (`GET /api/admin/system/health`) and GLOBAL maintenance refuses it. The failure says nothing about platform health. The old UI gave a generic message; it now names maintenance. | `panicRoomFreezeControls.test.jsx` "health refused by maintenance …" |
| F4 | **The owner recovery flow works against this exact row shape.** At HTTP level: owner reads status → ends maintenance with reason + password + `expectedVersion: 0` → state persisted (`isMaintenanceMode:false`, version 1), audited, admin and public routes answer 200 again after a cold restart. Unauthorised callers (anonymous, buyer, a `superadmin`-labelled non-owner, technical staff without `platform_recovery`) get 401/403 and nothing changes. Wrong/missing password → 401, nothing written. Stale version → 409. Missing version → 428. | `maintenanceOwnerRecoveryHttp.test.js` (17 tests) |
| F5 | **Why recovery has not happened:** the code path is intact; it needs a verified owner to perform it. The hosted database has **no owner-governance tables** (`owner_memberships`, owner MFA tables raise "relation does not exist"), so the server runs the legacy owner mode (verified e-mail in `WEBHOIST_EMAIL(S)` = owner) and step-up is **password only** (no authenticator code is requested because none can be enrolled). If the signed-in e-mail is not in that list, the server will say 403 on `/status` — see section 8 step 1. | Hosted SELECT; `config/owners.js`; `ownerMfa.service.js isEnforcedFor` |
| F6 | **Freezes were bypassed under scoped maintenance.** `systemCheck.js` returned `next()` inside the maintenance branch, so freeze checks below it never ran whenever maintenance was active but let the request through. | D-24 |
| F7 | **Freeze enforcement was a URL substring test, not method-aware.** `path.includes("/bid")` blocked `GET /bids/admin/all`, admin payment reads and **M-Pesa callbacks** (`/payments/callback`, `/v1/payments/callback`) — which would lose payment confirmations during a freeze — while missing auction-winner payment, subscription, dealer upgrade, bidder commitment and deposit payments. | D-25 |
| F8 | **Registrations, Pre-Inspection, Escrow, Messaging were presented but not enforceable.** No code consulted any such flag. | D-26, D-27 |
| F9 | The Panic Room offered freeze/re-enable buttons that the server refuses while GLOBAL maintenance is active (they live under `/api/admin`), with no reason captured. | D-28 |

## 2. What changed (behaviour)

* **Maintenance policy unchanged and still enforced server-side.** No bypass, no admin-route exemption, no auto-clear, owner requirement untouched.
* **New `backend/config/featureFreezePolicy.js`** — single pure definition of each freeze: method + anchored route table; reads, callbacks, refunds, releases, payouts are never frozen.
* **`systemCheck.js`** — freeze check now runs for every maintenance scope and when maintenance is off. Frozen request → `503 {code:"FEATURE_FROZEN", feature}` + `Retry-After`. The inbound SMS bid webhook gets 200 (operation not performed) so the provider does not retry-storm.
* **`maintenanceControl.service.js`** — `applyFeatureFreeze` (validates, requires reason ≥ 8 chars, idempotent, audited only on effective change with actor, role, IP, reason, version); `publicState` now reports `registrations` and `messaging` and lists unavailable controls; re-enable-all covers the new flags.
* **`adminRoutes.js`** — `/system/kill-switch` and `/system/recover` delegate to the service (still `authorize("superadmin")`), return typed errors (`FREEZE_REASON_REQUIRED`, `FREEZE_UNAVAILABLE` 409, `FREEZE_INVALID_TYPE`).
* **`PanicRoom.jsx`** — four live controls (Auction Bid Gate, Financial Gateway, User Registrations, Messaging); Pre-Inspection and Escrow shown as **UNAVAILABLE** with no buttons; required reason field; actions disabled with the cause named while GLOBAL maintenance is active; state shown as **STATE UNKNOWN** unless the server answered with a complete, valid state; only the valid transition is enabled; every action is confirmed by re-reading server state; health failure names maintenance (or the real classified cause) and never reports "healthy".

## 3. Maintenance scope × role × route matrix (enforced by `maintenancePolicy.js`, unchanged; proven by `maintenancePolicyMatrix.test.js`, `maintenanceEnforcementPolicy.test.js`, `maintenanceOwnerRecoveryHttp.test.js`)

| Route family → | Public browsing | Sign-in / session / safe logout | New buyer registration | Buyer / private seller signed-in | Dealer / dealer team signed-in | Staff / admin reads & ops | Maintenance status & recover | Maintenance activate |
|---|---|---|---|---|---|---|---|---|
| **No maintenance** | open | open | open | open | open | open | owner or `platform_recovery` | owner only |
| **global** | **refused** | pre-auth open; after auth only owner / `platform_recovery` | refused | refused | refused | **refused for everyone incl. owner** | owner, `platform_recovery` | owner only (typed `GLOBAL SHUTDOWN`) |
| **ordinary_users** | open | open (restricted users refused after auth) | open | refused | refused | open | owner, `platform_recovery` | owner only |
| **buyers_sellers** | open | open (restricted users refused) | **refused** | refused | open | open | owner, `platform_recovery` | owner only |
| **dealers** | open | open (restricted users refused) | open | open | refused | open | owner, `platform_recovery` | owner only |

Notes: a `superadmin` role label alone never confers owner or recovery rights. Under GLOBAL the owner reaches only session routes and the control plane (documented behaviour; changing it is an owner decision, section 9). Every control route requires reason ≥ 8 chars, `expectedVersion`, and password step-up.

## 4. Freeze-control matrix

| Control | State field | Stops (only NEW operations) | Never stopped | Actors | Confirmation | Audit | Re-enable | Status |
|---|---|---|---|---|---|---|---|---|
| Auction Bid Gate | `isAuctionActive` | `POST /bids/:id/bid`; inbound SMS bid webhook | bid reads, `/bids/admin/*`, auction closing, settlement, `/bids/mpesa/callback` | `superadmin` | reason ≥ 8, server read-back | `Kill-switch activated: auctions` (actor, role, IP, reason, version) | `POST /system/recover {type:"auctions", reason}` idempotent | **Enforced** |
| Financial Gateway | `isPaymentsActive` | `POST /payments/initiate`; `POST /auctions/:id/outcome/payment`; commitment and high-value deposit; `POST /subscriptions/upgrade|reactivate`; `POST /dealer/upgrade` | all provider callbacks (`/payments/callback`, `/v1/payments/callback`, b2c), status/history reads, refunds, escrow release, outbound payouts | `superadmin` | same | same | same | **Enforced** |
| User Registrations | `isRegistrationsActive` | `POST /auth/register` (and `/v1`) | login, refresh, existing users | `superadmin` | same | same | same | **Enforced (new)** |
| Messaging | `isMessagingActive` | `POST /chat`, `POST /chat/:id/message` | reading, seen, delete, notifications | `superadmin` | same | same | same | **Enforced (new)** |
| Pre-Inspection Detection | `isGhostCheckActive` | nothing — no request path consults it | — | — | — | — | — | **UNAVAILABLE** (API 409) |
| Escrow Transactions | none | nothing — freezing release/refund would strand customer funds | — | — | — | — | — | **UNAVAILABLE** (API 409) — owner decision |
| Maintenance mode & scope | `isMaintenanceMode`, `maintenanceScope`, `maintenanceVersion`, `maintenanceMeta` | per section 3 | — | activate: owner only; end: owner or `platform_recovery` | reason, incident ref, `expectedVersion`, password (+ authenticator when enrolled), typed phrase for global | `Maintenance activated/scope changed/recovered` | `POST /admin/system/maintenance/recover` | **Enforced** |

In-flight and completed records are untouched: freezes only reject new requests and never write business data. Freeze flags and maintenance share one compare-and-swap writer, so they cannot clobber each other; a freeze change bumps `maintenanceVersion` (the UI re-reads).

## 5. File-by-file change summary

Backend: `config/featureFreezePolicy.js` (new), `config/maintenancePolicy.js` (defaults for two new flags), `middleware/systemCheck.js` (freeze after maintenance, all scopes), `services/maintenanceControl.service.js` (`applyFeatureFreeze`, public state, re-enable all), `routes/adminRoutes.js` (kill-switch / recover).
Frontend: `src/pages/admin/PanicRoom.jsx`.
Scripts: `scripts/validate-panic-room-end-to-end.mjs` (updated to the new truth and extended with 4 checks; 25/25).
Tests added: `backend/tests/regression/featureFreezeEnforcement.test.js` (89), `backend/tests/regression/maintenanceOwnerRecoveryHttp.test.js` (17), `src/__tests__/pages/admin/panicRoomFreezeControls.test.jsx` (10).
Docs: this report, `defect-register.csv` (D-24…D-29), logs in this folder.

## 6. Tests and results (logs and exit codes in this folder)

| Command | Exit | Result |
|---|---|---|
| `npm run lint` (`tsc --noEmit`) | 0 | clean |
| `npx vitest run` (frontend) | 0 | 138 files, 1197 passed, 1 skipped |
| `npm run build` | 0 | built (chunk-size warning only) |
| `node scripts/validate-panic-room-end-to-end.mjs` | 0 | 25/25 |
| `node scripts/validate-business-command-centre-phase04.mjs` | 0 | pass |
| `cd backend && node --experimental-vm-modules jest --forceExit` | **1** | 183 of 184 suites passed; 3397 of 3398 tests passed; **1 failure = `stage5f5RoleRouteMatrix` ghost_checker on `GET /api/admin/stats`** (D-11) |
| `cd backend && npx vitest run --config vitest.config.js` | 0 | 6 files, 36 passed |
| `cd backend && node --test tests/response-lifecycle.test.js` | 0 | 1 passed |

The single backend failure is the **pre-existing D-11**, byte-for-byte the same failure recorded in the previous task's baseline (181/182 suites then; 183/184 now — the 106 new backend tests all pass). It was not touched, because resolving it means choosing whether `ghost_checker` may read admin stats (owner decision).

Coverage of the requested areas: every scope × audience × route family (policy matrix tests); owner recovery during active maintenance on the legacy row; unauthorised read/change/end; password required, wrong, and MFA code forwarded; persistence, version, metadata, audit; health success/failure rendering; every freeze's activate → enforce → re-enable → restored; freeze surviving restart and unreadable store (fail-static); reads under permitted scopes; failed reads never rendered as empty/zero (previous task's suites, re-run green); audit for every state-changing emergency action.

**Not covered / honest limits:** no browser end-to-end run against a live backend; no run against the hosted database (compare-and-swap is proven against an emulation of the PostgREST calls, as before); the real password/MFA verifier and session layer are stand-ins in the HTTP test (their own suites exist).

## 7. Remaining risks

1. **Production is still in global maintenance** until an owner ends it.
2. Owner step-up on the hosted database is password-only (governance tables absent).
3. `platform_recovery` technical staff have no second factor in this repository.
4. Freeze endpoints require `superadmin` + reason, but no password step-up and no `expectedVersion`.
5. A freeze applies to everyone including the owner; there is no per-audience freeze.
6. Hero-placement routes exist but are not mounted; if mounted later they initiate payments and must be added to the freeze table (the inventory test will not see them until they are mounted — it scans route files, so it currently lists them as exempt-with-reason and will need review).
7. `npm audit` findings (D-23) are unchanged.

## 8. Production recovery procedure (System Owner performs this; do not run it from automation)

1. **Sign in** at the normal login page with the System Owner account. The server decides ownership from the verified e-mail (`WEBHOIST_EMAIL(S)` environment value), not from the "Super Admin" label. If the Panic Room's maintenance panel says only a System Owner may use it (HTTP 403), the account is not recognised as owner: fix the environment list or sign in with the correct account — do not work around it.
2. Open **Admin → Panic Room**. Press **Refresh all status**. Expected now: "Global maintenance is active" banner, health "could not be checked … maintenance is refusing admin requests (HTTP 503)", and the maintenance panel showing **Active · Global shutdown · version 0**. Record the version shown (0 for the legacy row).
3. Decide: **end** maintenance, or **narrow** it (select the narrower scope — dealers / buyers_sellers / ordinary_users — in the maintenance panel). Narrowing keeps the named audience restricted and restores everyone else (including staff admin screens).
4. Enter **reason** (≥ 8 characters), **incident reference** (optional), your **account password**, and the authenticator/recovery code only if the panel asks for one (not expected on the hosted database today). Press **END MAINTENANCE** (or select the narrower scope and press **APPLY NEW SCOPE**). Do not close the page before the result.
5. **Verify persisted state**: the panel re-reads the server and must show **Inactive** (or the new scope) with a version of **1** (previous + 1), your name as operator, your reason and incident ref, and `lastRecovery` details. If it shows a conflict (409) or "could not verify", nothing is assumed — refresh and read the state again before retrying.
6. **Verify the screens recover**: Dashboard, Users, Private Seller Applications, Listings, Auctions/Bids, Escrows, NTSA queue, Inspections, Dealer Verifications, Inspector Applications load. If a screen still shows a notice, it now states the true cause (maintenance / permission / server / network). Optionally confirm the audit log has `Maintenance recovered: global`.
7. **If a regression appears**: Panic Room → freeze the affected control (Bid Gate / Financial Gateway / Registrations / Messaging) with a reason; or re-activate maintenance with the narrowest scope that contains the problem (global needs the typed phrase `GLOBAL SHUTDOWN`). Freezes are reversible with the matching re-enable button and a reason. Existing records are not changed by any of this.

After the deploy of this code, **no step runs automatically**: startup, deployment and database connection never change the flag.

## 9. Owner decisions needed

1. Whether to end or narrow the live global maintenance (and when).
2. Whether admin reads should stay unavailable to the owner under GLOBAL (current documented policy) or a narrower "owner can read admin data during global" rule should be designed and approved. No such exemption was added.
3. Whether to install the owner-governance/MFA tables so owner step-up includes an authenticator.
4. Whether `platform_recovery` staff require a second factor.
5. Whether freeze endpoints should require owner-only access and password step-up.
6. Whether to build Pre-Inspection and Escrow freezes (and what an escrow pause is allowed to block).
7. D-11 `ghost_checker` access to `/api/admin/stats`; D-23 backend dependency advisories.
