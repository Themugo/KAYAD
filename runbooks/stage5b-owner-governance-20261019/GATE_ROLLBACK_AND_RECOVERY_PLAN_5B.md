# Migration rollback & recovery plan — Stage 5B owner governance

**Status: candidate only. Not applied anywhere shared. Applying it requires Decision D1 (OWNER_DECISION_REGISTER_STAGE5B.md).**

## Application order
0. **Hosted prerequisites first.** The candidate's `kayad_owner_usable()` is a `LANGUAGE sql` function validated at creation, so it **fails to apply** on a database lacking `users.deactivated_at` etc. Apply the Stage 5A Gate C chain (HOSTED_SCHEMA_PREREQUISITES_5B.md) and re-run the preflight until every prerequisite row is present. No hosted compatibility is claimed without fresh authorised evidence.
1. Run MIGRATION_PREFLIGHT_READONLY_5B.sql; review.
2. Deploy the Stage 5B application code **first or together**: with the store absent the registry stays in *legacy mode* (Stage 5A behaviour, owners continue to work), so code-before-migration is safe.
3. Apply the candidate (single transaction; re-runnable/idempotent — verified twice on disposable PG).
4. Within ~1 s (registry TTL) the application switches to *database mode*. **From that moment the `WEBHOIST_EMAIL` list stops granting privilege** — and nobody has a membership yet. Existing owner sessions therefore lose owner authority at once. Do step 5 immediately.
5. Run `owner:bootstrap --plan`, then `--apply` (runbook §1); owners accept the e-mailed links.
   *To avoid any gap, schedule step 3–5 in one sitting with both owners reachable.* If anything fails, use the rollback below.

## Rollback (corrected at closure — see "What rollback does NOT do")
Two different things are called rollback. Pick deliberately.

**A. Switch back to the Stage 5A rule, keep the data** — set `OWNER_STORE_MODE=legacy` and restart/redeploy. The designated address (+ verified mailbox) is owner again, as in 5A. The tables remain, unused. Re-enabling later needs `OWNER_STORE_MODE=auto` and a restart; memberships are still there.

**B. Remove the candidate** — `migration-candidate/20261019120000_stage5b_owner_governance_ROLLBACK_CANDIDATE.sql` (executable, NOT APPLIED to anything shared). It refuses to run unless you pass `-v confirm_events_exported=yes`, so export the ledger first:
1. `\copy (select * from public.owner_membership_events order by id) to 'owner_membership_events.csv' csv header` — keep it with the incident record.
2. `psql -v ON_ERROR_STOP=1 -v confirm_events_exported=yes -1 -f …ROLLBACK_CANDIDATE.sql` (single transaction; drops the 11 functions, the 4 tables, the append-only trigger function and the two `owner.*` control rows; sends `NOTIFY pgrst`).
3. Restart the application (or set `OWNER_STORE_MODE=legacy` first) — see below.

Rehearsed on disposable PG: `pg-tests/owner_governance_pg_upgrade_rollback.sh` (15 checks; refusal without export, ledger export row count, full removal, users/sessions untouched).

### What rollback does NOT do (corrected statement)
* The earlier text claimed that dropping the functions "re-enables legacy by itself". **That is wrong for a running process and is intentionally so.** A process that has already read the installed store treats a later "function not found" as an *unreadable store*: it **fails closed** (no owner privilege for anyone, owner endpoints return 503 `OWNER_STORE_UNAVAILABLE`). Otherwise a dropped function, a schema-cache glitch or a mistaken rollback would silently re-grant owner power to every address on the environment list, including addresses of owners that were removed.
* A process that **starts** against a database without the store (fresh deploy before the migration, or after rollback + restart) uses legacy mode — that is the safe "code before migration" ordering.
* Rollback never restores sessions that were revoked before it, never restores removed memberships, and never deletes user accounts. Former owners cannot be hard-deleted while their membership row exists (`ON DELETE RESTRICT`); after rollback that restriction disappears with the table.
* After rollback + restart in legacy mode the env list grants owner power again. Treat that as a deliberate break-glass state: review `WEBHOIST_EMAIL` first, record the incident, and revert with the roll-forward below.
* Roll forward after a rollback: re-apply the candidate. Memberships do **not** come back (tables were dropped): bootstrap is open again, so run `owner:bootstrap --plan/--apply` (runbook §1). Verified on the real stack (gov_closure C6).

## Recovery after a failed cut-over
No usable owner and the store unreadable → runbook §3/§4. A mistakenly revoked owner → the other owner re-invites; if none, emergency procedure.
