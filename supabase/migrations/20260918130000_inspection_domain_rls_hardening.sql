-- KAYAD inspection-domain RLS policy migration
-- Target: Supabase project ubvgixwhfybbyjuvxboj
-- Certified application: 9e2b3dfcf248306a8f84e2beda7c66246856be94
--
-- DESIGN:
--   Buyer/customer: read and initiate customer-owned inspection actions.
--   Inspector: read/update only inspections assigned to that inspector and
--              create/update the corresponding report/history.
--   Provider: read operational/financial records belonging to that provider;
--             no direct financial mutation.
--   Admin/superadmin: full inspection-domain access through the admin role model.
--
-- IMPORTANT:
--   1. This file is NOT applied by this reconciliation.
--   2. It deliberately does not touch the broader 80-FK / 26-permissive-policy backlog.
--   3. Existing RLS is preserved. No DROP POLICY is used.
--   4. SECURITY DEFINER is not introduced by this migration.
--   5. Financial mutation remains behind existing canonical atomic functions/service role.
--
-- STAGE 13 CORRECTION (2026-10-08): every policy below calls
-- `public.is_admin()`. An EARLIER migration,
-- 20260909073141_production_advisor_hardening.sql, revoked EXECUTE on
-- that function from `authenticated` as well as `anon`/`public` --
-- overshooting the function's own defining migration
-- (20260907240500_canonical_authorization_helpers.sql), which explicitly
-- grants EXECUTE to `authenticated` and revokes only from bare `public`.
-- That overshoot made every policy below fail with `permission denied
-- for function is_admin` for every real request -- proven against a real
-- local PostgreSQL engine, not a test artifact; not just for
-- non-admins, for every authenticated role, including the legitimate
-- owner of their own record.
--
-- The fix is at the SOURCE: 20260909073141 now revokes only from
-- `public, anon`, restoring exactly the EXECUTE grant to `authenticated`
-- that this function's own defining migration already intended. An
-- earlier attempt to fix this HERE instead, by inlining
-- `EXISTS (SELECT 1 FROM public.profiles ...)` in place of
-- `is_admin()` (mirroring the Sept 9 migration's own `ad_slots_admin_all`
-- replacement), was tried and found to be the WRONG fix: `profiles` has
-- row-level security enabled with zero policies on it, so a plain
-- inline EXISTS against `profiles` -- evaluated with the INVOKING
-- role's own privileges -- can never see any row for anon/authenticated,
-- permanently and silently defeating the admin-bypass branch (proven:
-- an admin fixture resolved `public.is_admin()` to `true` but the
-- inlined EXISTS form of the identical check to `false`, in the same
-- session). `is_admin()` is SECURITY DEFINER specifically so it can see
-- `profiles` rows regardless of that lockout, which is exactly why it
-- exists as a function instead of being inlined everywhere. Calling
-- `is_admin()` directly, now that its EXECUTE grant is corrected at the
-- source, is therefore the right fix -- not a reversion for its own
-- sake.

BEGIN;

-- ------------------------------------------------------------
-- vehicle_inspections: canonical execution record
-- ------------------------------------------------------------
CREATE POLICY inspection_vehicle_select_buyer
ON public.vehicle_inspections
FOR SELECT TO authenticated
USING (
  requester_id = (select auth.uid())
  OR (select public.is_admin())
);

CREATE POLICY inspection_vehicle_select_inspector
ON public.vehicle_inspections
FOR SELECT TO authenticated
USING (
  inspector_id = (select auth.uid())
  OR (select public.is_admin())
);

CREATE POLICY inspection_vehicle_update_inspector
ON public.vehicle_inspections
FOR UPDATE TO authenticated
USING (
  inspector_id = (select auth.uid())
  OR (select public.is_admin())
)
WITH CHECK (
  inspector_id = (select auth.uid())
  OR (select public.is_admin())
);

-- ------------------------------------------------------------
-- inspection_bookings: customer/provider scheduling and lifecycle
-- ------------------------------------------------------------
CREATE POLICY inspection_booking_select_customer
ON public.inspection_bookings
FOR SELECT TO authenticated
USING (
  customer_id = (select auth.uid())
  OR (select public.is_admin())
);

CREATE POLICY inspection_booking_select_provider
ON public.inspection_bookings
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.inspection_providers p
    WHERE p.id = inspection_bookings.provider_id
      AND p.user_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.inspection_staff s
    WHERE s.id = inspection_bookings.assigned_staff_id
      AND s.user_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

CREATE POLICY inspection_booking_insert_customer
ON public.inspection_bookings
FOR INSERT TO authenticated
WITH CHECK (
  customer_id = (select auth.uid())
  OR (select public.is_admin())
);

-- Customer may update only their own booking while provider/admin may update
-- operational fields through the backend/service layer. We intentionally do not
-- grant provider UPDATE directly here because the table contains payment,
-- assignment and internal-note fields.
CREATE POLICY inspection_booking_update_customer
ON public.inspection_bookings
FOR UPDATE TO authenticated
USING (
  customer_id = (select auth.uid())
  OR (select public.is_admin())
)
WITH CHECK (
  customer_id = (select auth.uid())
  OR (select public.is_admin())
);

-- ------------------------------------------------------------
-- inspection_reports: customer read; assigned inspector/provider read/write;
-- admin full access. Report financial consequences remain server-controlled.
-- ------------------------------------------------------------
CREATE POLICY inspection_report_select_customer
ON public.inspection_reports
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inspection_bookings b
    WHERE b.id = inspection_reports.booking_id
      AND b.customer_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

CREATE POLICY inspection_report_select_inspector
ON public.inspection_reports
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.inspection_bookings b
    JOIN public.inspection_staff s ON s.id = b.assigned_staff_id
    WHERE b.id = inspection_reports.booking_id
      AND s.user_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

CREATE POLICY inspection_report_select_provider
ON public.inspection_reports
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.inspection_bookings b
    JOIN public.inspection_providers p ON p.id = b.provider_id
    WHERE b.id = inspection_reports.booking_id
      AND p.user_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

CREATE POLICY inspection_report_insert_inspector
ON public.inspection_reports
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.inspection_bookings b
    JOIN public.inspection_staff s ON s.id = b.assigned_staff_id
    WHERE b.id = inspection_reports.booking_id
      AND s.user_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

CREATE POLICY inspection_report_update_inspector
ON public.inspection_reports
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.inspection_bookings b
    JOIN public.inspection_staff s ON s.id = b.assigned_staff_id
    WHERE b.id = inspection_reports.booking_id
      AND s.user_id = (select auth.uid())
  )
  OR (select public.is_admin())
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.inspection_bookings b
    JOIN public.inspection_staff s ON s.id = b.assigned_staff_id
    WHERE b.id = inspection_reports.booking_id
      AND s.user_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

-- ------------------------------------------------------------
-- inspection_status_history: customer/provider/assigned inspector read;
-- creation is service/admin controlled to preserve lifecycle integrity.
-- ------------------------------------------------------------
CREATE POLICY inspection_status_history_select_customer
ON public.inspection_status_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inspection_bookings b
    WHERE b.id = inspection_status_history.booking_id
      AND b.customer_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

CREATE POLICY inspection_status_history_select_staff
ON public.inspection_status_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.inspection_staff s
    WHERE s.id = inspection_status_history.staff_id
      AND s.user_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.inspection_bookings b
    JOIN public.inspection_providers p ON p.id = b.provider_id
    WHERE b.id = inspection_status_history.booking_id
      AND p.user_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

-- ------------------------------------------------------------
-- inspection_reviews: customer writes own review; provider/admin reads.
-- ------------------------------------------------------------
CREATE POLICY inspection_review_select_customer
ON public.inspection_reviews
FOR SELECT TO authenticated
USING (
  reviewer_id = (select auth.uid())
  OR (select public.is_admin())
  OR EXISTS (
    SELECT 1
    FROM public.inspection_providers p
    WHERE p.id = inspection_reviews.provider_id
      AND p.user_id = (select auth.uid())
  )
);

CREATE POLICY inspection_review_insert_customer
ON public.inspection_reviews
FOR INSERT TO authenticated
WITH CHECK (
  reviewer_id = (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.inspection_bookings b
    WHERE b.id = inspection_reviews.booking_id
      AND b.customer_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

CREATE POLICY inspection_review_update_customer
ON public.inspection_reviews
FOR UPDATE TO authenticated
USING (
  reviewer_id = (select auth.uid())
  OR (select public.is_admin())
)
WITH CHECK (
  reviewer_id = (select auth.uid())
  OR (select public.is_admin())
);

-- ------------------------------------------------------------
-- inspection_disputes: customer/provider participant read; customer creates;
-- resolution remains atomic/service/admin controlled.
-- ------------------------------------------------------------
CREATE POLICY inspection_dispute_select_participant
ON public.inspection_disputes
FOR SELECT TO authenticated
USING (
  raised_by = (select auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.inspection_providers p
    WHERE p.id = inspection_disputes.against_provider_id
      AND p.user_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

CREATE POLICY inspection_dispute_insert_customer
ON public.inspection_disputes
FOR INSERT TO authenticated
WITH CHECK (
  raised_by = (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.inspection_bookings b
    WHERE b.id = inspection_disputes.booking_id
      AND b.customer_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

-- ------------------------------------------------------------
-- inspection_refunds: requester/provider/admin read; requester may initiate;
-- approval/processing remains service/admin controlled.
-- ------------------------------------------------------------
CREATE POLICY inspection_refund_select_participant
ON public.inspection_refunds
FOR SELECT TO authenticated
USING (
  requested_by = (select auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.inspection_bookings b
    JOIN public.inspection_providers p ON p.id = b.provider_id
    WHERE b.id = inspection_refunds.booking_id
      AND p.user_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

CREATE POLICY inspection_refund_insert_customer
ON public.inspection_refunds
FOR INSERT TO authenticated
WITH CHECK (
  requested_by = (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.inspection_bookings b
    WHERE b.id = inspection_refunds.booking_id
      AND b.customer_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

-- ------------------------------------------------------------
-- inspection_settlements: provider/admin read only.
-- No direct client INSERT/UPDATE/DELETE: settlement is canonical financial
-- workflow/service controlled.
-- ------------------------------------------------------------
CREATE POLICY inspection_settlement_select_provider
ON public.inspection_settlements
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.inspection_providers p
    WHERE p.id = inspection_settlements.provider_id
      AND p.user_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

-- ------------------------------------------------------------
-- inspection_transactions: provider/admin read only; financial writes remain
-- canonical atomic/service operations.
-- ------------------------------------------------------------
CREATE POLICY inspection_transaction_select_provider
ON public.inspection_transactions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.inspection_providers p
    WHERE p.id = inspection_transactions.provider_id
      AND p.user_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

-- ------------------------------------------------------------
-- inspection_staff: staff member sees own row; provider sees own workforce;
-- admin full access. No direct client mutation.
-- ------------------------------------------------------------
CREATE POLICY inspection_staff_select_member_provider
ON public.inspection_staff
FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.inspection_providers p
    WHERE p.id = inspection_staff.provider_id
      AND p.user_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

-- ------------------------------------------------------------
-- inspection_quality_audits: assigned auditor/admin; report participants read
-- only through report/booking/provider relationships.
-- ------------------------------------------------------------
CREATE POLICY inspection_quality_audit_select_auditor
ON public.inspection_quality_audits
FOR SELECT TO authenticated
USING (
  auditor_id = (select auth.uid())
  OR (select public.is_admin())
);

-- ------------------------------------------------------------
-- inspection_report_amendments: report owner/assigned inspector/admin read;
-- amendment creation stays server-controlled.
-- ------------------------------------------------------------
CREATE POLICY inspection_amendment_select_participant
ON public.inspection_report_amendments
FOR SELECT TO authenticated
USING (
  amended_by = (select auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.inspection_reports r
    JOIN public.inspection_bookings b ON b.id = r.booking_id
    WHERE r.id = inspection_report_amendments.report_id
      AND b.customer_id = (select auth.uid())
  )
  OR (select public.is_admin())
);

COMMIT;
