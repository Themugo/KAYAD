# Gate C — Rollback and recovery plan (for the migration candidate; nothing here has been executed)

**Principle:** the hosted database is not modified by Stage 5A. This plan exists so that the owner can authorize the migration with a way back.

## Before
1. Record a point-in-time-recovery timestamp (Supabase dashboard → Database → Backups) and export `schema_migrations`.
2. Save the output of `GATE_C_PREFLIGHT_READONLY.sql` (BEFORE).
3. Freeze onboarding: set no new registrations (the platform currently has 2 users, 0 verified — no customer data is at risk).

## Rehearse
Create a Supabase branch of the project, apply the delta there, run the preflight (all OK), run the Stage 5A acceptance scripts against it with disposable accounts. Delete the branch afterwards.

## If a step fails in the real window
| Situation | Action |
|---|---|
| A migration fails inside its own transaction | Nothing was committed for that file; stop, do not continue to the next file; capture the error; restore nothing. |
| A migration committed but the preflight shows a regression | Prefer a forward-fix migration reviewed the same way. Additive objects (new columns, new RPCs) are harmless to leave in place. |
| Data or constraint damage | Restore to the recorded PITR timestamp (hosted data at that point is 2 users and settings only, so the restore loses no customer data). |
| New RPC wrongly executable by anon/authenticated | `REVOKE EXECUTE ON FUNCTION public.kayad_register_identity_atomic(...) FROM PUBLIC, anon, authenticated;` (service role only is the intended grant). |

## Reversibility notes
* New columns / functions / indexes: reversible with `DROP` — but unneeded; leave them.
* Constraint changes (`cars_status_check`) are the only risky class; none is included in this candidate.
* The application is fail-closed: with the RPC missing, registration returns an error; with the settings row missing, restrictive defaults apply.

## After
Run the preflight (AFTER), save it with the BEFORE copy, then run the supervised-onboarding checklist. Do not create the owner account until the preflight is all OK.
