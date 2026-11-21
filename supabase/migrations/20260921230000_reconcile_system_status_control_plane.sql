-- KAYAD forward-only reconciliation: restore the active system_status control-plane
-- state after migration-history convergence. Idempotent by key.
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'system_status',
  '{"isAuctionActive": true, "isPaymentsActive": true, "isGhostCheckActive": true, "isMaintenanceMode": false, "emergencyMessage": "System under scheduled maintenance."}'::jsonb,
  'Canonical marketplace kill-switch and maintenance state'
)
ON CONFLICT (key) DO NOTHING;
