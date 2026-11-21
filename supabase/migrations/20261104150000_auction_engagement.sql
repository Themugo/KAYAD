-- KAYAD Auction engagement: follows, likes, public comments, privacy-safe visit counts, live-watch peaks and an owner insights RPC.
-- OWNER-RUN. Not applied by Claude. Idempotent. Service-role only (RLS on, no public policies); the backend is the only writer/reader.

CREATE TABLE IF NOT EXISTS auction_follows (
  auction_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (auction_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_auction_follows_user ON auction_follows(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS auction_likes (
  auction_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (auction_id, user_id)
);

CREATE TABLE IF NOT EXISTS auction_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_tag TEXT NOT NULL,                 -- anonymous public name (bidder ID, or 'Seller' for the organizer); never the real name
  is_organizer BOOLEAN NOT NULL DEFAULT false,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auction_comments_auction ON auction_comments(auction_id, created_at DESC) WHERE status = 'visible';
CREATE INDEX IF NOT EXISTS idx_auction_comments_user ON auction_comments(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS auction_comment_reports (
  comment_id UUID NOT NULL REFERENCES auction_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, reporter_id)
);
ALTER TABLE auction_comment_reports ENABLE ROW LEVEL SECURITY;

-- One row per visitor per day. visitor_hash is a salted hash (never an IP or account id in the clear).
CREATE TABLE IF NOT EXISTS auction_daily_visits (
  auction_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  visitor_hash TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (auction_id, day, visitor_hash)
);

CREATE TABLE IF NOT EXISTS auction_watch_peaks (
  auction_id UUID PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,
  peak_watchers INTEGER NOT NULL DEFAULT 0,
  peak_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE auction_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_daily_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_watch_peaks ENABLE ROW LEVEL SECURITY;

-- Replay-safe visit recording: first hit of the day inserts, later hits only bump the counter.
CREATE OR REPLACE FUNCTION kayad_record_auction_visit(p_auction_id UUID, p_visitor_hash TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO auction_daily_visits(auction_id, day, visitor_hash) VALUES (p_auction_id, (now() AT TIME ZONE 'Africa/Nairobi')::date, p_visitor_hash)
  ON CONFLICT (auction_id, day, visitor_hash) DO UPDATE SET hits = auction_daily_visits.hits + 1;
$$;

CREATE OR REPLACE FUNCTION kayad_record_auction_watch_peak(p_auction_id UUID, p_watchers INTEGER)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO auction_watch_peaks(auction_id, peak_watchers) VALUES (p_auction_id, p_watchers)
  ON CONFLICT (auction_id) DO UPDATE SET peak_watchers = EXCLUDED.peak_watchers, peak_at = now()
  WHERE EXCLUDED.peak_watchers > auction_watch_peaks.peak_watchers;
$$;

-- Public-safe counters (no identities).
CREATE OR REPLACE FUNCTION kayad_auction_engagement_counts(p_auction_id UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'follows', (SELECT count(*) FROM auction_follows WHERE auction_id = p_auction_id),
    'likes', (SELECT count(*) FROM auction_likes WHERE auction_id = p_auction_id),
    'comments', (SELECT count(*) FROM auction_comments WHERE auction_id = p_auction_id AND status = 'visible'),
    'visits', COALESCE((SELECT sum(hits) FROM auction_daily_visits WHERE auction_id = p_auction_id), 0),
    'unique_visitors', (SELECT count(DISTINCT visitor_hash) FROM auction_daily_visits WHERE auction_id = p_auction_id)
  );
$$;

-- Owner/admin insights: counters, peak watchers, funnel and a daily trend. Aggregates only.
CREATE OR REPLACE FUNCTION kayad_auction_engagement_insights(p_auction_id UUID, p_days INTEGER DEFAULT 14)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT kayad_auction_engagement_counts(p_auction_id) || jsonb_build_object(
    'peak_watchers', COALESCE((SELECT peak_watchers FROM auction_watch_peaks WHERE auction_id = p_auction_id), 0),
    'registered', COALESCE((SELECT count(*) FROM auction_registrations WHERE auction_id = p_auction_id AND status = 'active'), 0),
    'bidders', COALESCE((SELECT count(DISTINCT user_id) FROM bids WHERE car_id = p_auction_id), 0),
    'daily', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', d.day, 'visits', d.visits, 'unique', d.uniq) ORDER BY d.day)
      FROM (SELECT day, sum(hits) AS visits, count(*) AS uniq FROM auction_daily_visits
            WHERE auction_id = p_auction_id AND day >= ((now() AT TIME ZONE 'Africa/Nairobi')::date - GREATEST(p_days,1)) GROUP BY day) d
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION kayad_record_auction_visit(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION kayad_record_auction_watch_peak(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION kayad_auction_engagement_counts(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION kayad_auction_engagement_insights(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_record_auction_visit(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION kayad_record_auction_watch_peak(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION kayad_auction_engagement_counts(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION kayad_auction_engagement_insights(UUID, INTEGER) TO service_role;
