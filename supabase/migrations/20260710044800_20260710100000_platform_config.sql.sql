/*
# platform_config — a real, distinct table from system_settings

Found while auditing whether all read paths (not just writes) resolve
to real tables. services/escrow.service.js, services/paymentCallback.service.js,
and services/resolution.service.js all do
`findOne("platform_config", {})` and read `.dealerCommission` off the
result directly - a singleton config row with named fields, not the
key-value `system_settings` table (key/value/description columns)
already in the schema. The two are conceptually related (system_settings
already seeds a 'dealer_commission_pct' key with value 5) but are
genuinely different shapes in the real code - a key-value store can't
be read as `config.dealerCommission` without restructuring, and nothing
in the codebase does that restructuring. dealerCommission is the only
field actually read across all 3 real consumers.
*/

CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_commission NUMERIC DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Singleton row - findOne("platform_config", {}) fetches whichever row
-- exists first, so exactly one row should ever exist.
INSERT INTO platform_config (dealer_commission)
SELECT 5
WHERE NOT EXISTS (SELECT 1 FROM platform_config);
