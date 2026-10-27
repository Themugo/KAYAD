# Deployment plan & rollback — two INDEPENDENT operations

**Status: NOTHING IN THIS DOCUMENT HAS BEEN EXECUTED.** No hosted data, flag, environment variable, account or deployment was changed. Each operation needs its own explicit approval message; approving one does not approve the other. Reply `approve Operation A` and/or `approve Operation B` separately.

Recommended order: A first (restores access without new code), then B (so it cannot recur).

---
## Operation A — immediate recovery (single data change)

Hosted state (read-only check made earlier): `system_settings.system_status` = `{isMaintenanceMode:true, ...}` with no scope/version (legacy row), set 2026-10-27 06:17:02 UTC by the owner's own Panic Room action. The currently deployed code answers 503 to sign-in and to the recover endpoint, so the app cannot be used to escape.

```sql
-- PRECONDITION (read-only): must return isMaintenanceMode = true
select value from system_settings where key='system_status';

-- OPERATION (one jsonb key; every other key preserved)
update system_settings
   set value = jsonb_set(value, '{isMaintenanceMode}', 'false'::jsonb), updated_at = now()
 where key='system_status' and (value->>'isMaintenanceMode')='true';
-- expected: UPDATE 1

-- AUDIT (attributable; actor = the owner's existing user id)
insert into audit_logs (actor_id, action, details)
values ('dad5a03a-8181-45d7-b540-798c01874a21', 'System recovered: maintenance (incident 20261027, operator-approved SQL)', '{"via":"sql","incident":"20261027"}'::jsonb);
```
Effect: within ~10 s (per-instance cache) the marketplace and sign-in return. No session, user, password, owner, MFA or financial row is touched. The row stays legacy-shaped; the new code (Operation B) reads it correctly (no scope + inactive = normal; version 0).

Verification after A: (1) `select value->>'isMaintenanceMode' from system_settings where key='system_status'` = `false`; (2) `/api/health` 200 and a public listing endpoint 200; (3) the owner signs in with their own password; (4) audit row present. If sign-in then says the account is not recognised as owner, that is a different issue (see Operation B preconditions); stop and report, do not change roles.

Rollback of A: `update system_settings set value=jsonb_set(value,'{isMaintenanceMode}','true'::jsonb), updated_at=now() where key='system_status';`

---
## Operation B — deploy the verified code

**Exact version:** the project ZIP `KAYAD-MAINTENANCE-SCOPES-20261027-OWNER-RECOVERY.zip`; its SHA-256 is in the sidecar `...zip.sha256` and in the delivery message. Deploy only from a tree whose re-extracted hash matches. Changed files are listed in `KAYAD_MAINTENANCE_SCOPES_20261027_CHANGE_LEDGER.md`. Backend and frontend (build) both deploy; backend and frontend must go out together (the Panic Room calls the new endpoints).

**Dependencies to migrate / configure**
| Item | Needed? |
|---|---|
| Database migration | **None.** The state lives in the existing `system_settings.system_status` JSON (new optional keys `maintenanceScope`, `maintenanceVersion`, `maintenanceMeta`). Old code ignores unknown keys |
| Environment variables | **None new.** Existing owner configuration must already be correct: legacy mode needs `WEBHOIST_EMAIL` to start with the owner's address (`jimmythemugo@gmail.com`) **or** the owner-governance migrations applied. **Unverified on hosted** — I cannot read hosted env. Confirm before B; if it is wrong, owner recognition (and therefore the recovery lane) will not work |
| `OWNER_MFA_ENCRYPTION_KEY` | Only if the owner has/enrols an authenticator. If the hosted owner has MFA enrolled, the key must be the one used at enrolment |
| `platform_recovery` grant | Optional, after deploy: the System Owner grants it to named engineers via Staff Permissions. No grant = no technical recovery (owner only) |
| PostgREST | The CAS update uses a JSON-path filter (`value->>maintenanceVersion`). Verified against local PostgREST only; run the post-deploy test #4 below on hosted |

**Preconditions (all must hold before approving B)**
1. Operation A completed, or the owner accepts that B's first sign-in occurs under maintenance (B alone also works: the owner signs in through the recovery lane and ends maintenance with password step-up).
2. ZIP hash re-verified; the previous production build identified and retained (rollback target).
3. Hosted owner configuration confirmed (table above).
4. A quiet window; the owner available to sign in immediately after deploy.

**Deploy steps:** build/deploy backend and frontend from the verified tree → wait for health green.

**Health checks:** `GET /api/health` 200 with `database: ok`; `GET /api/cars` (public) 200; response headers/bundle show the new build id.

**Post-deployment login tests (owner must run, with their own password)**
1. Sign in as `jimmythemugo@gmail.com`; `/auth/me` returns the owner; Super Admin dashboard opens.
2. If MFA is enrolled, the sign-in demands the code (must NOT be skipped).
3. Panic Room shows "Maintenance not active" and four scopes (state from the server).
4. Rehearsal that proves the lane on hosted without disturbing buyers: activate scope **Dealers** (reason "post-deploy rehearsal") → status shows server-confirmed active; a dealer test account is refused, a buyer is not; then **Recover** (password step-up) → inactive. Skip the dealer-account check if no test dealer exists; do NOT rehearse the global scope on production.
5. Public marketplace pages load for an anonymous visitor throughout.

**Rollback of B**
1. **First make sure maintenance is inactive** (Panic Room recover, or the Operation A SQL). Reason: the previous build only understands `isMaintenanceMode` and would treat a still-active *scoped* state as a GLOBAL shutdown (restoring the original incident).
2. Redeploy the previous backend and frontend builds. No data rollback is needed (unknown JSON keys and `platform_recovery` grants are ignored by old code).
3. Re-run the login test #1. If sign-in is blocked, apply Operation A's SQL.

**Independent safety net:** the Operation A SQL works on both old and new code and is the break-glass path if the app is unreachable.
