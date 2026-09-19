-- KAYAD hardening: the dispute resolution SECURITY DEFINER RPC is service-role-only.
-- The function is an internal financial mutation boundary and must not be callable
-- directly by authenticated clients through the Supabase Data API.
REVOKE EXECUTE ON FUNCTION public.kayad_resolve_dispute_atomic(
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  text,
  text
) FROM authenticated;
