# Migration rollback & recovery plan — Stage 5B owner governance

**Status: candidate only. Not applied anywhere shared. Applying it requires Decision D1 (OWNER_DECISION_REGISTER_STAGE5B.md).**

## Application order
1. Run MIGRATION_PREFLIGHT_READONLY_5B.sql; review.
2. Deploy the Stage 5B application code **first or together**: with the store absent the registry stays in *legacy mode* (Stage 5A behaviour, owners continue to work), so code-before-migration is safe.
3. Apply the candidate (single transaction; re-runnable/idempotent — verified twice on disposable PG).
4. Within ~1 s (registry TTL) the application switches to *database mode*. **From that moment the `WEBHOIST_EMAIL` list stops granting privilege** — and nobody has a membership yet. Existing owner sessions therefore lose owner authority at once. Do step 5 immediately.
5. Run `owner:bootstrap --plan`, then `--apply` (runbook §1); owners accept the e-mailed links.
   *To avoid any gap, schedule step 3–5 in one sitting with both owners reachable.* If anything fails, use the rollback below.

## Rollback (fastest first)
- **Switch, no data change:** set `OWNER_STORE_MODE=legacy` and restart/redeploy → Stage 5A behaviour (designated address + verified mailbox). Takes effect on next request cycle. The tables remain, unused.
- **Remove the functions** (re-enables legacy by itself because `kayad_owner_snapshot` disappears):
  1. Export the audit ledger first: `\copy (select * from public.owner_membership_events order by at) to 'owner_membership_events.csv' csv header` and keep it with the incident record.
  2. `drop function if exists public.kayad_owner_snapshot(), …` for each `kayad_owner_*` function (list: snapshot, issue_invitation, resend_invitation, revoke_invitation, accept_invitation_atomic, revoke_membership_atomic, bootstrap_close, log_event, and helpers usable/usable_count/event).
- **Drop tables** only after the export and only on explicit owner decision: `owner_invitations`, `owner_memberships`, `owner_bootstrap_state`, then `owner_membership_events` (append-only triggers block UPDATE/DELETE; DROP TABLE is the intended exit). Delete the two `communication_event_controls` rows (`owner.invitation`, `owner.security_notice`).
- Data safety: the migration adds objects only; it alters no existing table.

## Recovery after a failed cut-over
No usable owner and the store unreadable → runbook §3/§4. A mistakenly revoked owner → the other owner re-invites; if none, emergency procedure.
