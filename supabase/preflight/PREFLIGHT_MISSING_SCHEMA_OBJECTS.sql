-- READ-ONLY preflight. No DDL, no data mutation. Run in STAGING (and, by a human, in production) to decide whether the
-- objects that no migration in supabase/migrations creates exist out-of-band on the hosted project.
-- Context: docs/audits/03-SECURITY-BOUNDARY-AUDIT-REPORT-20261011.md section 4. Do not create these objects from the
-- audit: their column contracts must be taken from the hosted catalog, not guessed.
select o.obj,
       case when o.kind = 'table'    then to_regclass('public.' || o.name) is not null
            when o.kind = 'function' then exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = o.name)
            when o.kind = 'column'   then exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = split_part(o.name, '.', 1) and c.column_name = split_part(o.name, '.', 2))
       end as present,
       o.consumer
from (values
  ('table',    'transactions',        'public.transactions',        'paymentCallback.service, bidSecurityService, reconciliationService, dealerHealthScoreService (REAL consumers)'),
  ('table',    'disputes',            'public.disputes',            'fraudDetectionService, disputeCron (cron/fraud; user dispute API reads escrows)'),
  ('table',    'config_entries',      'public.config_entries',      '/api/config/entries via models/ConfigEntry (admin only after this change)'),
  ('table',    'config_audit_logs',   'public.config_audit_logs',   'models/ConfigAuditLog'),
  ('table',    'vehicle_master_data', 'public.vehicle_master_data', '/api/config/vehicle/* (used by InspectionMarketplace makes lookup)'),
  ('table',    'error_budgets',       'public.error_budgets',       'sliTrackingService burn-rate job (non-fatal log noise)'),
  ('function', 'rls_auto_enable',     'public.rls_auto_enable()',   'REVOKE/ALTER in 2 migrations; Supabase platform helper (event trigger) on hosted projects'),
  ('column',   'escrows.warningSent', 'escrows."warningSent"',      'created by 20260710044900 (camelCase). The audit looked for snake_case warning_sent: STALE'),
  ('column',   'bids.bid_count',      'bids.bid_count',             'no backend consumer; UI bidCount is derived: STALE')
) as o(kind, name, obj, consumer)
order by o.kind, o.name;
