-- Messaging/auth reliability audit (2026-10-11): schema-contract repair.
--
-- backend/middleware/auth.js protect() re-reads these columns on EVERY authenticated request:
--   users.deactivated_at, users.granted_permissions, users.revoked_permissions
-- No earlier migration in this chain creates them, so a database built from the chain (fresh project, staging
-- rebuild, disaster recovery) answers every protected request with a failed select. Additive and idempotent:
-- if the hosted project already has these columns (for example added by hand), this is a no-op for them.
--
-- Security note: `users` has RLS enabled and is granted to service_role only (no anon/authenticated grant or
-- policy), so these authorization columns are writable only through the backend. Keep it that way: do not add a
-- user-facing UPDATE policy or column grant on `users` without excluding these columns.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS granted_permissions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS revoked_permissions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS last_active timestamptz;  -- protect() fire-and-forget lastActive write; was failing with PGRST204 on chain-built DBs

COMMENT ON COLUMN public.users.deactivated_at IS 'Set when an administrator deactivates the account; protect() rejects the session while non-null.';
COMMENT ON COLUMN public.users.granted_permissions IS 'Per-user permission grants layered on role defaults (config/roles.js getEffectivePermissions).';
COMMENT ON COLUMN public.users.revoked_permissions IS 'Per-user permission revocations layered on role defaults (config/roles.js getEffectivePermissions).';
