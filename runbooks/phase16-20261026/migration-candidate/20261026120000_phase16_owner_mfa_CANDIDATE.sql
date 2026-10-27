-- PHASE 16 - CANDIDATE ONLY. NOT in supabase/migrations. NOT applied to any shared or hosted database.
-- Owner TOTP second factor. Two private tables; the backend (service_role) is the only reader/writer. Secrets are stored encrypted
-- (AES-256-GCM, key held in the backend environment, never in the database) and recovery codes only as salted hashes.
-- Idempotent. Additive: no existing table, row, function or policy is changed. Requires public.users.
-- Apply order on a database that has NOT had the owner-governance candidate: independent of it (no foreign key to owner_* tables).
BEGIN;

CREATE TABLE IF NOT EXISTS public.owner_mfa_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  secret_enc text NOT NULL,                       -- v1:<iv>:<tag>:<ciphertext> (base64url); never the plaintext secret
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active')),
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  last_used_step bigint,                          -- highest accepted TOTP time step: a code can be used once
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  CHECK (status <> 'active' OR activated_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.owner_mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,                        -- HMAC-SHA256(server pepper, normalised code); the code itself is shown once
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  UNIQUE (user_id, code_hash)
);
CREATE INDEX IF NOT EXISTS owner_mfa_recovery_codes_user_idx ON public.owner_mfa_recovery_codes(user_id) WHERE used_at IS NULL;

ALTER TABLE public.owner_mfa_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.owner_mfa_factors, public.owner_mfa_recovery_codes FROM PUBLIC, anon, authenticated, service_role;
-- Phase 16C: service_role is also revoked first so Supabase default privileges (ALL on new tables)
-- do not leave TRUNCATE/REFERENCES/TRIGGER behind; only the CRUD below is granted.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_mfa_factors, public.owner_mfa_recovery_codes TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
