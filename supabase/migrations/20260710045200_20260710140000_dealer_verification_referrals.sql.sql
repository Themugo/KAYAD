/*
# Dealer Verification & Referral Flow — 3 missing tables + a JS bug

Found by continuing the systematic "does every model with a real write
call site have a matching table" sweep from earlier this session, this
time checking every remaining TABLE_MAP entry not yet confirmed real.
Dealer and Referral stood out because they're used directly in
controllers/authController.js - the same file whose registration flow
this whole schema-repair effort is built around - and tracing them led
to controllers/verificationController.js, a large (696-line), genuinely
real dealer-verification workflow (document submission, OTP, admin
review, suspend/reinstate) that was completely unbacked by any table.

## A real JavaScript-level bug, not just a missing table
controllers/verificationController.js did `new DealerVerification({...})`
in 2 places (a Mongoose "construct then .save()" pattern). Verified
directly before assuming: models/_base.js's createModel() returns a
plain object, not a class - `new` on it throws
"X is not a constructor" immediately, completely independent of
whether any table exists. This would have crashed on every first-time
verification submission (the most common case) even after adding the
table. Fixed by changing both to `await DealerVerification.create({...})`,
which returns a wrapped document supporting the same later `.save()`
calls the rest of the function relies on - confirmed nothing in this
flow depends on Mongoose's "not yet persisted until .save()" semantics,
so immediate creation is behaviorally equivalent here. Grepped the rest
of the codebase for the same `new <Model>(` pattern: found 2 more
(ConversionFunnel, KAYAD) in unrelated, already-flagged orphaned-
platform controllers - not fixed here, out of scope for this pass.

## dealers
Column list from every Dealer.* usage in authController.js and
verificationController.js: user, businessName, location (confirmed via
.populate("dealer", "businessName location approved") - genuinely
separate fields from users.business_name/location, not just an alias,
since Dealer is queried and saved as its own document throughout),
approved, verifiedAt, isSuspended, suspensionReason.

## dealer_verifications
Column list from every DealerVerification.* usage: user, dealer,
verificationStatus, documents (JSONB - a nested object with
governmentId/kraPin/businessRegistration/physicalAddress/
phoneVerification sub-keys, each themselves an object with a `verified`
boolean), submittedAt, rejectionReason, rejectionDetails (JSONB),
reviewedAt, reviewedBy, adminNotes, suspensionReason,
suspensionExpiresAt.

## referrals
Column list from authController.js's Referral.create() and
verificationController.js's Referral.findOneAndUpdate(): referrer,
referee, status, bonusAmount, creditedAt.
*/

CREATE TABLE IF NOT EXISTS dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT,
  location TEXT,
  approved BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  is_suspended BOOLEAN DEFAULT false,
  suspension_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dealers_user ON dealers("user");

ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_dealers_updated_at ON dealers;
CREATE TRIGGER trg_dealers_updated_at BEFORE UPDATE ON dealers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_snake();

CREATE TABLE IF NOT EXISTS dealer_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dealer UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  documents JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  rejection_details JSONB DEFAULT '{}',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  admin_notes TEXT,
  suspension_reason TEXT,
  suspension_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dealer_verifications_user ON dealer_verifications("user");
CREATE INDEX IF NOT EXISTS idx_dealer_verifications_dealer ON dealer_verifications(dealer);
CREATE INDEX IF NOT EXISTS idx_dealer_verifications_reviewed_by ON dealer_verifications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_dealer_verifications_status ON dealer_verifications(verification_status);

ALTER TABLE dealer_verifications ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_dealer_verifications_updated_at ON dealer_verifications;
CREATE TRIGGER trg_dealer_verifications_updated_at BEFORE UPDATE ON dealer_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_snake();

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'expired')),
  bonus_amount NUMERIC DEFAULT 0,
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
