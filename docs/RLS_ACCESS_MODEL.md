# KAYAD Inspection Domain RLS Access Model

Target: `ubvgixwhfybbyjuvxboj`
Certified application: `9e2b3dfcf248306a8f84e2beda7c66246856be94`

## Roles

**Buyer/customer**
- Read own bookings, canonical vehicle inspection execution, reports and status history.
- Create own booking/refund/dispute/review records where ownership can be proven.
- Update own booking/review.
- Cannot mutate provider settlement, transactions, quality audit or report financial consequences.

**Inspector**
- Read canonical inspections assigned to the inspector.
- Update assigned canonical inspection execution.
- Read/create/update the report attached to an assigned booking.
- Read relevant status history.
- No direct settlement/ledger mutation.

**Provider**
- Read bookings belonging to the provider.
- Read inspection reports, settlements, transactions and relevant staff/status records for that provider.
- No direct financial mutation.
- Workforce management remains backend/provider-control-plane controlled.

**Admin/superadmin**
- Existing `public.is_admin()` predicate (`profiles.role IN ('admin','superadmin')`) provides full access in the proposed policies.

## Security posture

- No new SECURITY DEFINER functions.
- No `user_metadata` authorization.
- UPDATE policies contain both USING and WITH CHECK.
- Financial writes remain behind canonical atomic/service operations.
- No policy is added to unrelated tables.
- Existing RLS stays enabled.
- No existing policy is dropped or rewritten.

## Deliberate scope boundary

This migration does not address:
- the project-wide 80 unindexed foreign keys;
- the project-wide 26 multiple-permissive-policy findings;
- the exposed `kayad_resolve_dispute_atomic` SECURITY DEFINER warning.

Those are separate hardening workstreams.
