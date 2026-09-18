-- READ-ONLY RLS preflight. No DDL and no data mutation.

SELECT
  t.table_name,
  c.relrowsecurity AS rls_enabled,
  COALESCE(p.policy_count,0) AS policy_count,
  CASE WHEN c.relrowsecurity THEN 'RLS_ON' ELSE 'RLS_OFF' END AS state
FROM information_schema.tables t
JOIN pg_class c
  ON c.oid = ('public.' || quote_ident(t.table_name))::regclass
LEFT JOIN (
  SELECT tablename, count(*) AS policy_count
  FROM pg_policies
  WHERE schemaname='public'
  GROUP BY tablename
) p ON p.tablename=t.table_name
WHERE t.table_schema='public'
  AND t.table_name IN (
    'vehicle_inspections',
    'inspection_bookings',
    'inspection_reports',
    'inspection_settlements',
    'inspection_staff',
    'inspection_status_history',
    'inspection_reviews',
    'inspection_disputes',
    'inspection_refunds',
    'inspection_transactions',
    'inspection_quality_audits',
    'inspection_report_amendments'
  )
ORDER BY t.table_name;

-- Dependency/column safety checks for the proposed policy predicates.
SELECT
  x.table_name,
  x.column_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema='public'
      AND c.table_name=x.table_name
      AND c.column_name=x.column_name
  ) AS column_exists
FROM (VALUES
 ('vehicle_inspections','requester_id'),
 ('vehicle_inspections','inspector_id'),
 ('inspection_bookings','customer_id'),
 ('inspection_bookings','provider_id'),
 ('inspection_bookings','assigned_staff_id'),
 ('inspection_reports','booking_id'),
 ('inspection_staff','user_id'),
 ('inspection_staff','provider_id'),
 ('inspection_providers','user_id'),
 ('inspection_status_history','booking_id'),
 ('inspection_status_history','staff_id'),
 ('inspection_reviews','reviewer_id'),
 ('inspection_reviews','provider_id'),
 ('inspection_reviews','booking_id'),
 ('inspection_disputes','raised_by'),
 ('inspection_disputes','against_provider_id'),
 ('inspection_disputes','booking_id'),
 ('inspection_refunds','requested_by'),
 ('inspection_refunds','booking_id'),
 ('inspection_settlements','provider_id'),
 ('inspection_transactions','provider_id'),
 ('inspection_quality_audits','auditor_id'),
 ('inspection_report_amendments','amended_by'),
 ('inspection_report_amendments','report_id')
) x(table_name,column_name)
ORDER BY x.table_name,x.column_name;
