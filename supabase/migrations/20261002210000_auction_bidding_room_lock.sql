-- KAYAD Auction Phase 7: hard registration cutoff when bidding starts.
-- Existing active registrations are preserved; only new registrations are blocked.

CREATE OR REPLACE FUNCTION prevent_late_auction_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  auction_status TEXT;
  starts_at TIMESTAMPTZ;
BEGIN
  SELECT COALESCE(c.auction_status, '')
    INTO auction_status
  FROM cars c
  WHERE c.id = NEW.auction_id;

  IF lower(COALESCE(auction_status, '')) IN ('live', 'closing') THEN
    RAISE EXCEPTION 'BIDDING_ROOM_CLOSED';
  END IF;

  SELECT NULLIF((s.config->>'startsAt'), '')::timestamptz
    INTO starts_at
  FROM auction_setups s
  WHERE s.car_id = NEW.auction_id
    AND s.publication_status = 'published'
  LIMIT 1;

  IF starts_at IS NOT NULL AND starts_at <= now() THEN
    RAISE EXCEPTION 'BIDDING_ROOM_CLOSED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_late_auction_registration ON auction_registrations;
CREATE TRIGGER trg_prevent_late_auction_registration
BEFORE INSERT ON auction_registrations
FOR EACH ROW EXECUTE FUNCTION prevent_late_auction_registration();

REVOKE ALL ON FUNCTION prevent_late_auction_registration() FROM PUBLIC;
