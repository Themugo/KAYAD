/*
# refresh_tokens — the most critical gap found this session

controllers/authController.js's sendAuthResponse() - called
unconditionally by register, login, demoLogin, AND refreshToken, i.e.
every single authentication touchpoint in the app - does
`await RefreshToken.create({...})` with no table backing it anywhere in
this repo's schema. Confirmed directly: models/RefreshToken.js is (was)
just the generic createModel("RefreshToken") factory with no table ever
defined for it, in any of the SQL files across this whole schema-repair
effort. Every register/login/refresh call would have failed at this
exact line.

Also found and fixed (see models/RefreshToken.js) that
controllers/authController.js calls 3 static methods on RefreshToken -
revokeToken, revokeAllForUser, getActiveSessions - that don't exist
anywhere either. Fixed there since they have clear, standard,
unambiguous session-management semantics; this migration provides the
table those methods (and the rest of the refresh-token flow) need.

Column list is the complete set of fields actually read/written across
every RefreshToken.* call site in authController.js: user, token,
tokenVersion, deviceId, userAgent, ipAddress, expiresAt (all set at
creation), isRevoked (set true on revoke, checked on every lookup),
lastUsedAt (updated on every successful refresh). RefreshToken.create()
goes through the standard model layer (models/_base.js's generic
create()), which translates camelCase to snake_case automatically
(mapKeyOut/camelToSnake) - unlike chats/escrows elsewhere in this
migration set, which bypass that layer with raw sb.from() calls and
need quoted camelCase columns to match. Columns here are plain
snake_case to match what the real create()/findOneAndUpdate()/
updateMany() calls actually produce. "user" is still quoted (but kept
lowercase) since it's a reserved word in Postgres, not for casing
preservation.
*/

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  token_version INTEGER DEFAULT 0,
  device_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  is_revoked BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens("user");
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
