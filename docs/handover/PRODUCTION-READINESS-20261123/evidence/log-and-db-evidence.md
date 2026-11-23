# Hosted read-only evidence (2026-11-23, project ubvgixwhfybbyjuvxboj). No writes; SQL wrapped in `begin read only … rollback`.
## Recovery-related settings
archive_mode=on · archive_timeout=120 · wal_level=logical · max_wal_senders=5 · server_version=17.6 · archiver last_archived_time=2026-11-23 07:25:20 UTC · archived_count=6167 · failed_count=0 · db_size=30 MB · pg_cron not installed. Dashboard (owner paste): plan Free, "No backups", badge "Production".
## Aggregates (no personal data)
users_total=3 · locked_accounts=0 · accounts_with_failed_attempts=0 · users_email_unverified=0 · banned/deactivated/deleted=0 · users_created_last_7d=0 · latest_user_created=2026-11-09 07:17 UTC · system_status record present.
## Edge-log findings (ClickHouse over `logs`, source=edge_logs; user ids/emails not recorded here)
- POST /rpc/kayad_register_identity_atomic → 400 ×2 (2026-11-22 13:11 UTC).
- POST /rpc/kayad_dealer_listing_lifecycle_atomic → 404 ×2 (2026-11-22 07:47 and 11:30 UTC).
- 2026-11-23 04:06:40 UTC single burst of 404s: marketplace_offers, marketplace_offer_settlements, auction_outcomes, dealer_listing_lifecycle_events (the four command-centre sources).
- Top 404s/24 h: error_budgets (2,927 + 583), rpc/kayad_owner_snapshot (489), featured_vehicle_campaigns (116), hero_slides (88), rpc/kayad_claim_chat_outbox (11), marketplace_healths (10), dealer_payment_accounts (6), auction_setups (3), private_seller_capabilities (2).
- 400s: dealers?or=(updated_at.eq.[object Object],created_at.eq.[object Object]) ×10 (client-side filter bug); cars select incl. listing_number ×5 (column absent on hosted).
- Login pattern: see REPORT §4. 06:20–07:30 UTC 2026-11-23: no email-keyed lookups, no refresh_tokens inserts; session validation 200s and one rotate 200.
- No call to rpc/kayad_create_dealer_listing_atomic within the log retention window.
## Local reproductions (replica copies of the hosted dump; loopback only)
- PostgREST, 4-arg listing RPC → PGRST202; 3-arg → executes; registration RPC → 2F005/HTTP 400.
- Offers core + `20261121160000` applied; `kayad_dealer_listing_lifecycle_atomic` → `relation "public.purchase_outcomes" does not exist`.
