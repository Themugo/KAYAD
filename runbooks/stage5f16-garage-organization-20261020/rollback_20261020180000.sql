/*
 Rollback for 20261020180000_garage_organization_branch_membership.sql  (NON-DESTRUCTIVE)

 Restores the previous staff-facing RLS policies and removes every function, trigger, index and constraint that the
 migration created. DATA IS KEPT: the added columns (inspection_branches.status / is_head_office ..., inspection_staff.
 access_role / branch_id ..., inspection_bookings.branch_id) and every row in them remain, so a later re-apply loses nothing.
 After this script the application must be the PREVIOUS release (owner-only authorization); the new release's membership
 and branch endpoints will not work without the functions.

 Refuses to run if any membership is 'suspended', because the previous schema cannot represent that state; resolve or end
 those memberships first (suspended members would otherwise silently become 'confirmed' or violate the old constraint).
 Run inside a transaction on a disposable copy first.
*/
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM inspection_staff WHERE affiliation_status = 'suspended') THEN
    RAISE EXCEPTION 'ROLLBACK_REFUSED: % membership(s) are suspended; end or reactivate them first', (SELECT count(*) FROM inspection_staff WHERE affiliation_status = 'suspended');
  END IF;
END $$;

-- 1. previous policies (verbatim from the pre-migration database)
DROP POLICY IF EXISTS inspection_booking_select_provider ON public.inspection_bookings;
CREATE POLICY inspection_booking_select_provider ON public.inspection_bookings FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1 FROM inspection_providers p WHERE ((p.id = inspection_bookings.provider_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))
    OR (EXISTS ( SELECT 1 FROM inspection_staff s WHERE ((s.id = inspection_bookings.assigned_staff_id) AND (s.user_id = ( SELECT auth.uid() AS uid)))))
    OR ( SELECT is_admin() AS is_admin)));
DROP POLICY IF EXISTS inspection_report_select_inspector ON public.inspection_reports;
CREATE POLICY inspection_report_select_inspector ON public.inspection_reports FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1 FROM (inspection_bookings b JOIN inspection_staff s ON ((s.id = b.assigned_staff_id)))
    WHERE ((b.id = inspection_reports.booking_id) AND (s.user_id = ( SELECT auth.uid() AS uid))))) OR ( SELECT is_admin() AS is_admin)));
DROP POLICY IF EXISTS inspection_report_select_provider ON public.inspection_reports;
CREATE POLICY inspection_report_select_provider ON public.inspection_reports FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1 FROM (inspection_bookings b JOIN inspection_providers p ON ((p.id = b.provider_id)))
    WHERE ((b.id = inspection_reports.booking_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))) OR ( SELECT is_admin() AS is_admin)));
DROP POLICY IF EXISTS inspection_settlement_select_provider ON public.inspection_settlements;
CREATE POLICY inspection_settlement_select_provider ON public.inspection_settlements FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1 FROM inspection_providers p WHERE ((p.id = inspection_settlements.provider_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))
    OR ( SELECT is_admin() AS is_admin)));
DROP POLICY IF EXISTS inspection_staff_select_member_provider ON public.inspection_staff;
CREATE POLICY inspection_staff_select_member_provider ON public.inspection_staff FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1 FROM inspection_providers p
    WHERE ((p.id = inspection_staff.provider_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))) OR ( SELECT is_admin() AS is_admin)));
DROP POLICY IF EXISTS inspection_transaction_select_provider ON public.inspection_transactions;
CREATE POLICY inspection_transaction_select_provider ON public.inspection_transactions FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1 FROM inspection_providers p WHERE ((p.id = inspection_transactions.provider_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))
    OR ( SELECT is_admin() AS is_admin)));
DROP POLICY IF EXISTS inspection_branches_select_member ON public.inspection_branches;
REVOKE SELECT ON public.inspection_branches FROM authenticated;

-- 2. functions created by the migration
DROP FUNCTION IF EXISTS public.kayad_org_report(uuid, uuid, uuid, date, date);
DROP FUNCTION IF EXISTS public.kayad_org_booking_transition(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.kayad_org_booking_assign(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.kayad_org_booking_route(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.kayad_org_member_set_status(uuid, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.kayad_org_member_change(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.kayad_org_member_confirm(uuid, uuid);
DROP FUNCTION IF EXISTS public.kayad_org_member_accept(uuid, uuid);
DROP FUNCTION IF EXISTS public.kayad_org_member_invite(uuid, uuid, uuid, text, text, uuid, integer);
DROP FUNCTION IF EXISTS public.kayad__org_release_assignments(uuid, uuid, text, uuid, boolean);
DROP FUNCTION IF EXISTS public.kayad_org_branch_set_status(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.kayad_org_branch_update(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.kayad_org_branch_create(uuid, uuid, text, text, text, text, text, numeric, numeric, boolean);
DROP FUNCTION IF EXISTS public.kayad_policy_can_view_member(uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.kayad_policy_can_view_branch(uuid, uuid);
DROP FUNCTION IF EXISTS public.kayad_policy_org_role(uuid, text[]);
DROP FUNCTION IF EXISTS public.kayad_policy_can_view_booking(uuid);
DROP FUNCTION IF EXISTS public.kayad__org_can_manage_member(boolean, text, uuid, text, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.kayad__org_valid_scope(text, uuid, uuid);
DROP FUNCTION IF EXISTS public.kayad__org_actor(uuid, uuid);
DROP FUNCTION IF EXISTS public.kayad__org_fail(text, text);
DROP FUNCTION IF EXISTS public.kayad__org_audit(text, uuid, text, text, uuid, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.kayad_org_booking_access(uuid, uuid);
DROP FUNCTION IF EXISTS public.kayad_org_context(uuid, uuid);
DROP FUNCTION IF EXISTS public.kayad_org_role_rank(text);

-- 3. constraints / indexes / trigger created by the migration (the data columns stay)
DROP TRIGGER IF EXISTS trg_inspection_branches_sync_active ON public.inspection_branches;
DROP FUNCTION IF EXISTS public.kayad_branch_sync_active();
ALTER TABLE public.inspection_bookings DROP CONSTRAINT IF EXISTS fk_inspection_bookings_branch;
ALTER TABLE public.inspection_staff DROP CONSTRAINT IF EXISTS fk_inspection_staff_branch;
ALTER TABLE public.inspection_staff DROP CONSTRAINT IF EXISTS chk_inspection_staff_role_scope;
ALTER TABLE public.inspection_staff DROP CONSTRAINT IF EXISTS chk_inspection_staff_access_role;
ALTER TABLE public.inspection_staff DROP CONSTRAINT IF EXISTS chk_inspection_staff_affiliation_status;
ALTER TABLE public.inspection_staff ADD CONSTRAINT chk_inspection_staff_affiliation_status CHECK (affiliation_status IN ('pending', 'confirmed', 'ended'));
ALTER TABLE public.inspection_branches DROP CONSTRAINT IF EXISTS chk_inspection_branches_status;
ALTER TABLE public.inspection_branches DROP CONSTRAINT IF EXISTS chk_inspection_branches_name_len;
DROP INDEX IF EXISTS public.uq_inspection_branches_head_office;
DROP INDEX IF EXISTS public.uq_inspection_branches_provider_name;
DROP INDEX IF EXISTS public.uq_inspection_branches_id_provider;
DROP INDEX IF EXISTS public.idx_inspection_staff_branch;
DROP INDEX IF EXISTS public.idx_inspection_bookings_branch;
-- inspection_branches.name was made NOT NULL and de-duplicated; relaxing NOT NULL restores the old shape without touching data
ALTER TABLE public.inspection_branches ALTER COLUMN name DROP NOT NULL;
