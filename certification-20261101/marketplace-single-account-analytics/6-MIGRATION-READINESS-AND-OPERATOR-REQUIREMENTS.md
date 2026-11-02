# 6. Migration readiness and operator requirements

Nothing was applied, committed, pushed or deployed. No production data was touched. The hosted database state remains unverified (see D-33).

## Before analytics will collect anything
1. **Apply** `supabase/migrations/20261101120000_visitor_analytics.sql` (creates 3 tables, indexes, RLS, revokes). It is additive and idempotent (`IF NOT EXISTS`); no existing table changes. Until applied, `/collect` fails safely (202, nothing stored) and the dashboard shows the "no analytics collected yet" state.
2. **Set `ANALYTICS_HASH_SECRET`** on the backend (long random value). Without it the service derives a key from `JWT_SECRET`; rotating the secret later makes new hashes unlinkable to old ones (visitors would appear as new once).
3. **Make the CDN pass the visitor country** (`cf-ipcountry` on Cloudflare, `x-vercel-ip-country` on Vercel, or `x-country-code`). Without it geography shows "Unknown". Ensure the proxy chain preserves the real client IP for rate limiting (`trust proxy`) - the IP is used for rate limiting only and is not stored.
4. **Schedule the retention purge** (`POST /api/admin/analytics/purge`, superadmin session or a scheduled task). No scheduler was added; retention is only enforced when this is called.
5. **Privacy / consent decision (owner):** collection is first-party, cookie-less, anonymous and honours DNT/GPC, so no consent banner was added. If your legal advice requires opt-in consent or a notice in your jurisdiction (e.g. Kenya DPA), add a notice and wire `setAnalyticsOptOut` to it, or set `analytics_settings.enabled=false`. The `analytics_settings` entry (`{enabled, retentionDays}`) lives in `system_settings`; there is no admin UI for it yet.
6. Confirm the shared HTTP client can obtain a CSRF token for **guests** on the hosted site (the collect route sits under `/api` CSRF protection). If it cannot, events from guests are silently dropped - verify after deploy with one guest page view and the Live card.
7. Inspector change: no migration. Existing pending applications with `user` null keep the guest path.

## Verification to run after the operator applies the above (not possible here)
Open the site as a guest -> within ~1 minute Live shows 1 active session; sign in in the same tab -> still 1 session, registered; refresh repeatedly -> visitor count unchanged; Dashboard "Tracking began" shows the first event time.

## Rollback
Drop the three `analytics_*` tables and revert the files; no other table depends on them.
