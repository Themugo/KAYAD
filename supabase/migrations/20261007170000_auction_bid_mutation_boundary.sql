-- KAYAD Auction 360 hardening: bid mutations are server-authoritative.
-- The browser must never be able to insert, update or delete a bid directly
-- through Supabase. All bid creation, payment confirmation, auto-bidding and
-- winner transitions go through the protected backend + service-role atomic
-- functions. Public/customer reads remain governed by the existing RLS policy.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.bids FROM anon, authenticated;

-- Keep authenticated read access governed by the existing SELECT policies.
-- The service role retains its backend mutation grants.
GRANT SELECT ON TABLE public.bids TO authenticated;

COMMENT ON TABLE public.bids IS
  'Server-authoritative auction bid ledger. Client-side INSERT/UPDATE/DELETE is intentionally revoked; mutations must use KAYAD backend atomic auction functions.';
