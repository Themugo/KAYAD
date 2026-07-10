/*
# Seed Initial Data — System Settings + Sample Vehicles

## What This Does
1. Inserts default system settings (platform config)
2. Inserts sample vehicle listings for the marketplace
Note: Vehicles reference a demo dealer profile that must be created first via auth signup.
Since we cannot create auth users via SQL, we insert settings only and let
the frontend seed sample data through the Supabase client after signup.
*/

-- System Settings
INSERT INTO system_settings (key, value, description) VALUES
  ('platform_name', '"Gari Motors"', 'Platform display name'),
  ('support_email', '"support@gari.co.ke"', 'Support email address'),
  ('support_phone', '"254700100200"', 'Support phone number'),
  ('dealer_commission_pct', '5', 'Commission percentage for dealers'),
  ('bid_commitment_pct', '5', 'Bid commitment percentage'),
  ('escrow_release_days', '3', 'Days before escrow auto-releases'),
  ('max_listing_images', '8', 'Maximum images per vehicle listing'),
  ('allow_guest_browsing', 'true', 'Allow unauthenticated users to browse'),
  ('require_dealer_approval', 'true', 'Require admin approval for dealer accounts'),
  ('min_bid_increment', '5000', 'Minimum bid increment in KES')
ON CONFLICT (key) DO NOTHING;
