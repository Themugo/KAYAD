/*
# platform_config: remaining fields from the real admin config routes

Found via a broader, TABLE_MAP-driven sweep for the same `new <Model>(`
construction bug fixed for DealerVerification: routes/adminRoutes.js had
3 more instances, all `if (!config) config = new PlatformConfig();` -
same crash (createModel() returns a plain object, "new" on it throws
"is not a constructor"), gated behind real admin authorization
(adminOrSuper) across /config, /config/packages, and a branding/logo
upload endpoint. Currently dormant in practice (the earlier
platform_config migration's own seed INSERT guarantees a row always
exists, so `!config` is never actually true against the current
schema), but still a real bug waiting to happen against any fresh
database without that seed, or if the one row is ever deleted. Fixed
alongside the same 3 call sites in this migration's own PR.

Column list is the complete `allowed` fields array from the /config PUT
route (the actual admin settings form), plus branding.logoType/
logoUrl confirmed via the third call site. Kept dealerCommission/
packages/freeMarket/waivePayments out of this list - already added to
platform_config earlier this session, this only adds what's still
missing. daraja/bank/reconciliation/activePromos/branding are JSONB -
their names indicate structured config objects (Safaricom Daraja/M-Pesa
API settings, banking details, reconciliation settings, a list of
active promotions, logo/brand assets respectively) and nothing in
adminRoutes.js accesses sub-properties in a way that reveals a simpler
shape, so JSONB safely accommodates whatever structure actually gets
assigned without guessing wrong at a stricter type.
*/

ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS platform_name TEXT;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS support_email TEXT;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS support_phone TEXT;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS gallery_title TEXT;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS gallery_subtitle TEXT;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS bid_commitment_pct NUMERIC;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS escrow_release_days INTEGER;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS max_listing_images INTEGER;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS allow_guest_browsing BOOLEAN DEFAULT true;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS require_dealer_approval BOOLEAN DEFAULT false;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS dealer_trial_days INTEGER;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS demo_mode BOOLEAN DEFAULT false;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS font_display TEXT;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS font_body TEXT;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS font_size_pct NUMERIC;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS base_font_size NUMERIC;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS line_height NUMERIC;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS listing_fee NUMERIC;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS auction_registration_fee NUMERIC;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS ghost_check_fee NUMERIC;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS platform_vat NUMERIC;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS buyer_premium_pct NUMERIC;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS active_promos JSONB DEFAULT '[]';
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS daraja JSONB DEFAULT '{}';
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS bank JSONB DEFAULT '{}';
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS reconciliation JSONB DEFAULT '{}';
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}';
