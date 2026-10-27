# Incident 2026-10-27 — Owner sign-in answers "System under maintenance."

## Verdict
Class 1 of the brief: **an intentional configured state** (maintenance flag ON in the hosted database) combined with a **code defect that made the state un-escapable by the owner**. It is not a database outage, not a schema/migration mismatch, not an MFA/session defect, not a frontend-masked error. The message is truthful: the server really answers 503 to every `/api` request.

## Evidence (hosted, read-only SELECTs only — nothing was changed)
| Fact | Evidence |
|---|---|
| Flag is ON | `system_settings.key='system_status'` → `isMaintenanceMode:true`, `emergencyMessage:"System under scheduled maintenance."`, `updated_at 2026-10-27 06:17:02.938545+00` |
| Who/when | `audit_logs` (actor = account `jimmythemugo@gmail.com`): 06:16:43 "Kill-switch activated: auctions"; 06:16:49 "System recovered: auctions"; **06:17:02 "Kill-switch activated: full_maintenance"** (POST /api/admin/system/kill-switch, HTTP 200). No later "System recovered: maintenance". |
| Owner account intact | One row, id `dad5a03a-…`, email verified, `is_banned=false`, legacy label `dealer`/`pending` (unchanged; owner authority is not derived from this label). |
| Not a ban/lockout | `is_banned=false`; nothing in audit after 06:17:03. |
| Owner tables | Hosted is in legacy owner mode (owner_memberships / MFA tables not applied) — consistent with the 16C readiness findings; not the cause. |

So the Panic Room "ACTIVATE GLOBAL MAINTENANCE" button was pressed from the owner's own session (most likely while testing the buttons: auctions on/off were exercised 14 s earlier). Its confirm text only said "stop full_maintenance", not that it blacks out the whole platform including sign-in.

## Code defect
`backend/middleware/systemCheck.js` ran on all of `/api` before authentication and answered 503 to everything while `isMaintenanceMode` was true — including `POST /auth/login` and `POST /admin/system/recover`, the only endpoint that can switch it off. The only writer of the flag is the superadmin-only Panic Room, so the person who can end maintenance is exactly the person locked out. Fail-open on read errors was already in place (a database outage never produced this message).

Reproduced locally before the fix (disposable DB, real app stack): owner login → 503; recover → 503 (`/home/claude/inc/repro_before_fix.log`, `e2e_before_fix.log`).

## Fix (smallest supported by the evidence)
1. `maintenanceLane.js` (new, dependency-free): an explicit allow-list of 7 requests that are let past the maintenance gate: `GET /auth/me`, `POST /auth/login|refresh|logout`, `GET /auth/csrf|profile`, `POST /admin/system/recover` (`/v1` aware).
2. Let through is **not** authorised: login, `protect` and refresh call `enforceMaintenanceOwnerLane` and answer 503 to everyone who is not a platform owner (`isOwnerUser`: active owner membership, or verified WEBHOIST_EMAIL in legacy mode). In login the check runs after the password is verified (wrong password stays 401 — no oracle) and before email-verification, MFA and session issue, so **MFA is not skipped**.
3. Every other endpoint (including `/admin/users`, listings, auctions) stays 503 for everybody, owners included.
4. Responses now carry `code:"SYSTEM_MAINTENANCE"`, `maintenance:true`, `Retry-After: 60`.
5. Panic Room confirm dialog now states the total blackout and how it is ended.

A defect in my first version was caught by the real-browser check: the SPA verifies the session with `GET /auth/me`, which I had not allow-listed. It is now on the lane (E2E checks M3b/N2b).

## Not changed / preserved
Password auth, owner membership and rank protection, MFA (enrol/challenge/lockout/recovery), refresh/expiry, CSRF, rate limiting, dealer/staff separation, audit logging, financial/auction protections, design and public pages. No hosted data, env var, migration or deployment was touched.

## Verified locally vs not verified
Locally verified (disposable PostgreSQL + PostgREST + real backend + built SPA + Playwright): see REGRESSION-EVIDENCE. **Not verified:** real hosted login; hosted `WEBHOIST_EMAIL` setting (legacy-mode owner recognition depends on it); real authenticator-app interoperability; deployed build identity.
