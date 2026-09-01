/*
# Seed Initial Platform Settings

## What This Does
Inserts only baseline platform settings. No marketplace records are seeded.
*/

-- System Settings
INSERT INTO system_settings (key, value, description) VALUES  ('platform_name', '"KAYAD"', 'Platform display name'),  ('dealer_commission_pct', '5', 'Commission percentage for dealers'),
  ('bid_commitment_pct', '5', 'Bid commitment percentage'),
  ('escrow_release_days', '3', 'Days before escrow auto-releases'),
  ('max_listing_images', '8', 'Maximum images per vehicle listing'),
  ('allow_guest_browsing', 'true', 'Allow unauthenticated users to browse'),
  ('require_dealer_approval', 'true', 'Require admin approval for dealer accounts'),
  ('min_bid_increment', '5000', 'Minimum bid increment in KES')
ON CONFLICT (key) DO NOTHING;
