# Operation A — `OP-A-FLAG-OFF-20261027` — end the hosted maintenance flag

**STATUS: NOT EXECUTED. Waiting for your exact approval message:** `approve OP-A-FLAG-OFF-20261027`
Nothing else (a different wording, "approve A", approval of Operation B) authorises it.

## Read-only recheck made for this document (this session, SELECT only)
`select key,value,updated_at from system_settings where key='system_status'` →
`{"isAuctionActive":true,"emergencyMessage":"System under scheduled maintenance.","isPaymentsActive":true,"isMaintenanceMode":true,"isGhostCheckActive":true}`, `updated_at 2026-10-27 06:17:02.938545+00` (checked 12:43 UTC). Still **ON**.

## Target
Project `ubvgixwhfybbyjuvxboj` (KAYAD EA), table `public.system_settings`, **one row**: `id d1326586-d074-49ab-b68f-669fd6386b23`, `key 'system_status'` ("Canonical marketplace kill-switch and maintenance state"). Table has no triggers. Columns touched: `value` (one JSON key) and `updated_at`. `updated_by` stays NULL as today.

## Exact SQL (one statement = one transaction; the audit row is written only if the update matched)
```sql
with upd as (
  update public.system_settings
     set value = jsonb_set(value, '{isMaintenanceMode}', 'false'::jsonb),
         updated_at = now()
   where id = 'd1326586-d074-49ab-b68f-669fd6386b23'
     and key = 'system_status'
     and (value->>'isMaintenanceMode') = 'true'
  returning id
)
insert into public.audit_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
select 'dad5a03a-8181-45d7-b540-798c01874a21', 'owner', 'Primary owner (operator-approved SQL)',
       'System recovered: maintenance (incident 20261027, operator-approved SQL)',
       'system_settings', upd.id,
       jsonb_build_object('via','sql','operation','OP-A-FLAG-OFF-20261027','key','isMaintenanceMode','from',true,'to',false)
  from upd
returning id, created_at;
```
**Expected:** 1 row returned (the audit row). 0 rows returned means the flag was no longer `true` and nothing changed.

## Expected effect
`isMaintenanceMode` true → false. Every other key (`isAuctionActive`, `isPaymentsActive`, `isGhostCheckActive`, `emergencyMessage`) unchanged. The deployed backend caches the flag per instance for about 10 s, so the marketplace, sign-in and dashboard data routes return within ~10–15 s. No user, password, role, session, refresh token, secret, owner or financial row is read or written.

## Verification queries (read-only, run immediately after)
```sql
select value, updated_at from public.system_settings where key='system_status';
  -- isMaintenanceMode=false; other three switches true; message unchanged
select id, action, entity_type, details, created_at from public.audit_logs order by created_at desc limit 2;
  -- newest row = the entry above
select count(*) from public.system_settings;   -- 10 (unchanged)
select count(*) from public.audit_logs;        -- 21 (was 20)
```
Application checks: public site loads without "System under maintenance"; `GET https://api.kayad.space/health` 200; owner signs in (below).

## Rollback
```sql
update public.system_settings
   set value = jsonb_set(value,'{isMaintenanceMode}','true'::jsonb), updated_at = now()
 where id = 'd1326586-d074-49ab-b68f-669fd6386b23' and key='system_status';
```
(the audit row stays as history; it is append-only evidence of the change).

## Hosted sign-in / MFA verification after A — what is and is not possible
* **Sign-in:** I cannot do it. My sandbox has no route to `kayad.space` / `api.kayad.space` (outbound allowlist), and I do not hold and must not be given your password. **Exact blocker:** you (or a browser session I can drive with you present) must type the password on the live site.
  What you should see: sign-in succeeds (owner recognised by `WEBHOIST_EMAIL`, account email verified: confirmed read-only), then `/admin` shows the Super Admin dashboard with real figures instead of "Unavailable".
* **MFA:** **there is no MFA step to verify on hosted today.** The hosted database has no `owner_memberships` / `owner_mfa_factors` tables (checked read-only). The owner MFA lives in the 5B/16 migration candidates, which are not applied. Until Gate 2/3 of the Phase 16C operation sequence run (separately approved) the hosted owner signs in with password only. Do not read a successful hosted login as MFA verification.
* If sign-in fails after A (e.g. "not recognised as owner"), stop and report; do not change roles. The cause would then be the deployed `WEBHOIST_EMAIL` setting, which I cannot read.
