-- KAYAD traffic analytics setup (hosted database). Run once in the Supabase SQL editor as the project owner.
-- Source: supabase/migrations/20261101120000_visitor_analytics.sql (unchanged). Additive and idempotent: CREATE ... IF NOT EXISTS only; no existing data is touched.
-- After it runs, reload Admin > Traffic Analytics. Data accrues from the first visit after this point (nothing is back-filled).

-- Visitor analytics (2026-11-01). Additive only. First-party, privacy-conscious traffic measurement for the Super Admin Command Centre.
-- NOTHING here stores an IP address, a raw visitor/session id, a raw user id, an e-mail or a full user agent:
--   * visitor_hash / session_hash / user_hash are keyed HMACs computed by the backend (ANALYTICS_HASH_SECRET);
--   * geography is the country code supplied by the CDN header only (no city, no coordinates);
--   * only a coarse device class is kept (mobile | tablet | desktop).
-- Tables are service-role only (RLS on, no policies) - the browser can never read or write them directly.

CREATE TABLE IF NOT EXISTS public.analytics_visitors (
  visitor_hash        text PRIMARY KEY,
  first_seen_at       timestamptz NOT NULL,
  last_seen_at        timestamptz NOT NULL,
  ever_authenticated  boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_analytics_visitors_first_seen ON public.analytics_visitors (first_seen_at);
CREATE INDEX IF NOT EXISTS idx_analytics_visitors_last_seen  ON public.analytics_visitors (last_seen_at);

CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  session_hash     text PRIMARY KEY,
  visitor_hash     text NOT NULL,
  started_at       timestamptz NOT NULL,
  last_seen_at     timestamptz NOT NULL,
  authenticated    boolean NOT NULL DEFAULT false,   -- true once ANY request in the session carried a valid login (guest -> registered upgrade, one session)
  user_hash        text,
  device_class     text NOT NULL DEFAULT 'desktop' CHECK (device_class IN ('mobile','tablet','desktop')),
  country_code     text,
  source_channel   text NOT NULL DEFAULT 'direct' CHECK (source_channel IN ('direct','search','social','email','campaign','referral')),
  source_host      text,
  landing_path     text,
  page_views       integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started ON public.analytics_sessions (started_at);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last    ON public.analytics_sessions (last_seen_at);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor ON public.analytics_sessions (visitor_hash);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  event_id       uuid PRIMARY KEY,                  -- client-generated; makes retries idempotent
  occurred_at    timestamptz NOT NULL,
  session_hash   text NOT NULL,
  visitor_hash   text NOT NULL,
  event_type     text NOT NULL CHECK (event_type IN ('page_view','listing_view','auction_view','registration')),
  path           text NOT NULL,                     -- normalised: no query string except the app's `nav` section, no ids
  listing_id     uuid,                              -- public listing identifier only
  authenticated  boolean NOT NULL DEFAULT false,
  dedupe_key     text NOT NULL UNIQUE               -- session|type|path|listing|2-second bucket: collapses double fires / rapid refresh
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_time    ON public.analytics_events (occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type    ON public.analytics_events (event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_listing ON public.analytics_events (listing_id, occurred_at) WHERE listing_id IS NOT NULL;

ALTER TABLE public.analytics_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events   ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_visitors FROM anon, authenticated;
REVOKE ALL ON public.analytics_sessions FROM anon, authenticated;
REVOKE ALL ON public.analytics_events   FROM anon, authenticated;

COMMENT ON TABLE public.analytics_events IS 'Visitor analytics: hashed, de-duplicated page/listing/auction events. No IPs, no raw identifiers.';
-- Retention is enforced by the backend (POST /api/admin/analytics/purge, default 400 days; setting analytics_settings.retentionDays).

-- Verify (3 rows expected):
-- select table_name from information_schema.tables where table_schema='public' and table_name in ('analytics_visitors','analytics_sessions','analytics_events');
