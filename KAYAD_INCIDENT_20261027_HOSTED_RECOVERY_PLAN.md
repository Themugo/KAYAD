# Hosted recovery plan — AWAITING YOUR EXPLICIT APPROVAL (nothing has been executed)

## Root cause
`system_settings.system_status.isMaintenanceMode = true` (set 2026-10-27 06:17:02 UTC by the owner's own Panic Room action) + the deployed code 503s sign-in and recover. See the root-cause report.

## Two separable operations
**Op 1 — end maintenance now (data change, one row, one key).** Needed because the *deployed* code cannot be escaped from the app.
```sql
-- PRECONDITION (read-only): must return isMaintenanceMode = true
select value from system_settings where key='system_status';

-- OPERATION (single jsonb key; all other keys and the message are preserved)
update system_settings
   set value = jsonb_set(value, '{isMaintenanceMode}', 'false'::jsonb), updated_at = now()
 where key='system_status' and (value->>'isMaintenanceMode')='true';
-- expected: UPDATE 1

-- AUDIT (so the change is attributable; actor = the owner's existing user id, no other rows touched)
insert into audit_logs (actor_id, action, details)
values ('dad5a03a-8181-45d7-b540-798c01874a21', 'System recovered: maintenance (incident 20261027, operator-approved SQL)', '{"via":"sql","incident":"20261027"}'::jsonb);
```
Before: `isMaintenanceMode:true`. After: `false`; `isAuctionActive/isPaymentsActive/isGhostCheckActive` unchanged (`true`), message unchanged.
Effect: the backend caches the flag ~10 s per instance, so sign-in and the marketplace return within ~10 s. No sessions are created, revoked or altered; existing sessions simply work again. No user rows, passwords, owner rows or financial rows are touched. (I will use `execute_sql` only after you approve this exact text.)

**Rollback of Op 1:** `update system_settings set value=jsonb_set(value,'{isMaintenanceMode}','true'::jsonb), updated_at=now() where key='system_status';` (~10 s to take effect).

**Op 2 — deploy the code patch (separate approval, not executed).** Files: `backend/middleware/maintenanceLane.js` (new), `systemCheck.js`, `auth.js`, `controllers/authController.js`, `src/pages/admin/PanicRoom.jsx` (frontend build). Backend + frontend redeploy; no migration, no env change. Rollback: redeploy the previous build (the pre-fix ZIP is retained). Until Op 2 is deployed, pressing ACTIVATE GLOBAL MAINTENANCE again will lock you out again — **please do not press it** on the current deployment.

Recommended order: Op 1 (restores access immediately) → Op 2 (so it cannot recur).

## Verification after Op 1 (what I would run / you can run)
1. `select value->>'isMaintenanceMode' from system_settings where key='system_status';` → `false`.
2. `curl https://<api>/api/health` → 200; a public listing endpoint → 200 (not 503).
3. Sign in as `jimmythemugo@gmail.com` in the browser with your own password. Expect normal sign-in; then open Super Admin dashboard and confirm owner recognition.
4. If sign-in then says the account is not recognised as owner, that is a *different* issue (legacy mode needs the deployment's `WEBHOIST_EMAIL` to equal your address, or the owner migration applied); stop and report — do not change roles.
5. Audit row present: `select action, created_at from audit_logs order by created_at desc limit 3;`.

## Not part of this plan (explicitly untouched)
Your password, email, user id, role label (`dealer`/`pending`), owner tables, MFA, other accounts, sessions, migrations, env vars, financial records.

## Approval needed
Reply "approve Op 1" (and separately "approve Op 2" when you want the deploy). I will not run anything on hosted until then.
