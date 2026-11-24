# 14 — Production migration runbook

> **Updated 2026-11-24 (final closure):** the reconciliation table, the six-object check, the disposable restore rehearsal and the extended runbook are in doc 30. Where this document disagrees with doc 30, doc 30 wins (for example `transition_escrow` is not the hosted function name; `kayad_transition_escrow_atomic` exists).

# PREPARED FOR REVIEW — NOT AUTHORIZED FOR EXECUTION.

Nothing here may be run without explicit written owner authorisation. This session did not and will not execute it.

## Preconditions (all must be true)
1. Owner authorisation recorded for this specific runbook and date.
2. Fresh hosted backup taken **and a restore rehearsed into a scratch project** (not yet done ⇒ BLOCKED).
3. Change window; Render API paused or traffic low; maintenance banner decided by owner.
4. Read-only pre-checks in 13 §"Pre-apply checks" completed and recorded.
5. Repository state matches the reviewed commit (clean tree, ZIP SHA-256 verified).

## Order (all idempotent, forward-only)
1. `20261123210000_lead_create_find_before_insert.sql`
2. `20261123220000_dealer_temporary_duties.sql` (after event_type check)
3. `20261124100000_admin_customer_care_and_market_tables.sql`
4. `20261124120000_dealer_suspension_requests.sql`
(Optional, owner decision: `20261025100000_private_seller_capability.sql` — page works without it.)

## Verification after each step (read-only SELECT)
Table/index/RLS existence; `NOTIFY pgrst, 'reload schema'`; hit the matching admin endpoint as Super Admin and confirm 200/empty rather than 500.

## Stop conditions / rollback
Stop on first error. Migrations are additive; rollback = restore from the rehearsed backup, or drop only the **newly created, empty** tables (owner-approved statement list prepared separately). Never use `supabase db reset` or `db push`.

## Not covered
Escrow/payment/ledger functions (no replacement of hosted financial functions), data backfills, Purity's account.
