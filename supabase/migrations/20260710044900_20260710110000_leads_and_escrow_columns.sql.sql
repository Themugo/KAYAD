/*
# leads — real table, but the feature has a separate CODE bug too

services/leadService.js's createLead() (called from real, live code -
controllers/chatController.js's findOrCreateLeadFromChat and
controllers/escrowController.js's findOrCreateLeadFromEscrow) does
create("leads", { buyer, dealer, vehicle, source, sourceReference,
estimatedValue, lastActivityAt }) - a genuinely real, connected feature.
The frontend even has a working "Inquiries" UI for it
(src/features/DealersView/components/DealerBusinessView.tsx, fixed
earlier in this engagement) displaying leads data.

IMPORTANT - flagging, not fixing, a separate bug found alongside this:
leadService.js's updateLeadStage() calls `lead.updateStage(newStage,
actorId)`, and leadTimelineService.js's addTimelineEvent() calls
`LeadActivity.createActivity(...)`. Neither method exists anywhere in
this codebase - not on models/Lead.js or models/LeadActivity.js (both
just re-export the generic createModel() factory with no custom
methods), not in models/_base.js's factory itself. Both calls would
throw "... is not a function" if actually invoked. This is a code-level
bug, not a schema gap - no CREATE TABLE or ALTER TABLE fixes it, since
even with every column present the method calls fail before any SQL
runs. Fixing it means implementing real business logic (what should a
stage transition actually validate or trigger?) rather than
reverse-engineering column names from existing evidence, which is a
meaningfully different kind of change than everything else in this
migration set. Left for a deliberate decision/implementation pass
rather than guessed at here.

Column list is exactly what createLead() writes, since that's the only
call site with unambiguous evidence.
*/

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer UUID REFERENCES users(id),
  dealer UUID REFERENCES users(id),
  vehicle UUID REFERENCES cars(id),
  source TEXT,
  source_reference TEXT,
  estimated_value NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'new',
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_buyer ON leads(buyer);
CREATE INDEX IF NOT EXISTS idx_leads_dealer ON leads(dealer);
CREATE INDEX IF NOT EXISTS idx_leads_vehicle ON leads(vehicle);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════
-- ESCROWS: more real columns, found by re-checking all 6 real
-- consumers (escrow.service.js, escrowCron.js, mpesaB2C.service.js,
-- paymentCallback.service.js, paymentService.js, resolution.service.js)
-- rather than just the 2 files checked when this table was first built.
-- timeline is a JSONB object (deposit/inspection/funds-release flags
-- and their timestamps nested inside it - confirmed via
-- `timeline: { ...escrow.timeline, fundsReleased: true, ... }` -
-- distinct from the existing `history` JSONB array of audit entries).
-- lastActionKey is an idempotency-key column (guards against
-- duplicate-processing the same webhook/request twice).
-- ═══════════════════════════════════════════════════════
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '{}';
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS "lastActionKey" TEXT;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS "autoReleaseEligibleAt" TIMESTAMPTZ;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMPTZ;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS "disputeReason" TEXT;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS "disputedAt" TIMESTAMPTZ;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS "disputedBy" UUID REFERENCES users(id);
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMPTZ;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS "refundedBy" UUID REFERENCES users(id);
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS "releasedBy" UUID REFERENCES users(id);
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS "warningSent" BOOLEAN DEFAULT false;
