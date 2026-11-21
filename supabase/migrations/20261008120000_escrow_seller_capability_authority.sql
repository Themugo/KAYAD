-- KAYAD AUCTION 360 — Stage 9: Escrow Capability Administration
--
-- Closes the gap documented in Stage 8's
-- ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md ("No per-seller /
-- per-vehicle admin grant mechanism exists"): escrow eligibility today is
-- hard-coded purely to `users.role` (individual_seller=true, dealer=false),
-- enforced identically in two places (backend/controllers/carController.js
-- createCar/updateCar) with no admin override possible.
--
-- This migration adds the canonical, admin-grantable SELLER-level
-- capability authority. It does NOT create a second escrow engine, a
-- second admin system, or a second financial/bank-account system — it is
-- consumed by the existing `cars.escrow_enabled` vehicle flag and by the
-- existing `escrows` table purchase flow via a single new shared service
-- (backend/services/escrowCapability.service.js), replacing the old
-- role-hardcode and the dead-write-path `users.escrow_approved` /
-- `users.escrow_forced` fields (which remain in place, unused, since
-- dropping columns that something may still read defensively is its own
-- source of risk and is out of this stage's scope).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS escrow_capability_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS escrow_capability_granted_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS escrow_capability_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escrow_capability_reason TEXT;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_escrow_capability_status_check;

ALTER TABLE users
  ADD CONSTRAINT users_escrow_capability_status_check
  CHECK (escrow_capability_status IN ('none', 'granted', 'suspended', 'revoked'));

COMMENT ON COLUMN users.escrow_capability_status IS
  'Admin-controlled escrow capability for this seller: none (default, no admin action taken) | granted | suspended (temporary, admin-reversible) | revoked (deliberate, admin-reversible). The single authority consumed by backend/services/escrowCapability.service.js for both the public ESCROW badge and the real purchase-time escrow decision. Superseded, unused legacy fields: escrow_approved, escrow_forced.';
COMMENT ON COLUMN users.escrow_capability_granted_by IS 'Admin user id that set the current escrow_capability_status (auditability — who, not just what).';
COMMENT ON COLUMN users.escrow_capability_updated_at IS 'When escrow_capability_status was last changed by an admin.';
COMMENT ON COLUMN users.escrow_capability_reason IS 'Optional admin-supplied reason for the current escrow_capability_status (shown in the audit trail).';

-- Backfill: preserve exactly today's production behavior. Every private
-- seller already has real, working escrow eligibility (role-hardcoded
-- `escrowEnabled = true` on every car they list) — without this backfill,
-- the moment the application code switches from the role-hardcode to
-- reading escrow_capability_status, every existing private seller would
-- silently lose escrow eligibility (status would read 'none', not
-- 'granted'), which is a real regression, not a neutral default. Dealers
-- are intentionally NOT backfilled to 'granted' — today no dealer can
-- ever have escrow_enabled=true (hard-forced false), so leaving dealers at
-- 'none' (not granted) preserves that exact behavior until an admin
-- deliberately grants a specific dealer the capability.
UPDATE users
SET escrow_capability_status = 'granted',
    escrow_capability_updated_at = now(),
    escrow_capability_reason = 'Stage 9 backfill: preserves pre-existing role-hardcoded private-seller escrow eligibility'
WHERE role = 'individual_seller'
  AND escrow_capability_status = 'none';

CREATE INDEX IF NOT EXISTS idx_users_escrow_capability_status ON users (escrow_capability_status);
