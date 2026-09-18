-- READ-ONLY preflight for the canonical inspection remediation.
-- No DDL. No data mutation.

WITH checks AS (
  SELECT * FROM (VALUES
    ('canonical vehicle_inspections exists',
      to_regclass('public.vehicle_inspections') IS NOT NULL),
    ('canonical booking/order bridge function exists',
      EXISTS (
        SELECT 1 FROM pg_proc
        WHERE pronamespace='public'::regnamespace
          AND proname='kayad_bridge_inspection_execution'
      )),
    ('canonical inspection chat bridge exists',
      EXISTS (
        SELECT 1 FROM pg_proc
        WHERE pronamespace='public'::regnamespace
          AND proname='kayad_get_or_create_inspection_chat'
      )),
    ('canonical execution columns exist',
      (SELECT count(*) = 10
       FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name='vehicle_inspections'
         AND column_name IN
         ('car_id','requester_id','inspector_id','status','scheduled_at',
          'completed_at','checklist','evidence','current_stage','stage_progress'))),
    ('signature/review columns absent or compatible',
      (SELECT count(*) = 4
       FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name='vehicle_inspections'
         AND column_name IN
         ('inspector_signature','inspector_signed_at',
          'customer_reviewed_at','customer_review_notes')) OR
      (SELECT count(*) = 0
       FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name='vehicle_inspections'
         AND column_name IN
         ('inspector_signature','inspector_signed_at',
          'customer_reviewed_at','customer_review_notes'))),
    ('no existing vehicle inspection rows require backfill',
      (SELECT count(*) = 0 FROM public.vehicle_inspections)),
    ('overall score data is already valid',
      NOT EXISTS (
        SELECT 1 FROM public.vehicle_inspections
        WHERE overall_score IS NOT NULL
          AND (overall_score < 0 OR overall_score > 100)
      )),
    ('dormant digital-inspection tables are not production dependencies',
      to_regclass('public.digital_inspections') IS NULL
      AND to_regclass('public.inspection_stages') IS NULL
      AND to_regclass('public.inspection_evidence') IS NULL
      AND to_regclass('public.inspection_defects') IS NULL
      AND to_regclass('public.inspection_audit_logs') IS NULL)
  ) AS x(check_name, pass)
)
SELECT check_name, pass FROM checks ORDER BY check_name;
