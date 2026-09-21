-- Canonical system status control-plane state.
-- Replaces the removed canonical legacy document model with the existing
-- system_settings key/value store.
INSERT INTO system_settings (key, value, description)
VALUES (
  'system_status',
  '{"isAuctionActive": true, "isPaymentsActive": true, "isGhostCheckActive": true, "isMaintenanceMode": false, "emergencyMessage": "System under scheduled maintenance."}'::jsonb,
  'Canonical marketplace kill-switch and maintenance state'
)
ON CONFLICT (key) DO NOTHING;
