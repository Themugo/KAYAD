/*
# Payment architecture extension - KAYAD Phase 6

Adds the entities requested for a provider-agnostic payment
architecture (PaymentProvider, PaymentAttempt, PaymentEvent, Refund,
WebhookEvent), designed additively on top of the existing, already
substantial payment infrastructure rather than replacing it - the
existing `payments` table (gari_motors_full_schema.sql.sql) and
`escrows` table already implement most of the real transaction/escrow
flow (services/paymentCallback.service.js: idempotent callback
claiming, amount verification, escrow creation, seller-verification
gating - all confirmed real by direct code read, not assumed missing).
Restructuring those tables now, with no live database to verify a
migration against, would be exactly the kind of large, unverifiable,
high-risk change this program has consistently avoided for financial
tables. Extending additively is the smaller, safer correction.

## Bug fixed: mpesa_transactions table never existed
services/paymentService.js's initiateStkPush() calls
create("mpesa_transactions", {...}) on every single STK push
initiation (confirmed by direct code read). No CREATE TABLE for
mpesa_transactions exists anywhere in this migrations directory or in
backend/db (any .sql file there). The call is wrapped in .catch() so it does not crash
the STK push flow (payments row still gets created successfully), but
every mpesa_transactions insert has been silently failing - a real,
confirmed defect, not a hypothetical one. Column list below matches
exactly what services/paymentService.js writes: checkoutRequestID,
phone, amount, status, carId (via mapKeyOut's camelToSnake fallback,
these become checkout_request_id, phone, amount, status, car_id - no
new FIELD_ALIASES entry needed since none of these collide with an
existing alias or need one, confirmed against
backend/utils/fieldMap.js).

## New entities, mapped to this project's actual domain
The requested architecture describes a generic "checkout -> order"
flow; KAYAD's actual domain is vehicle bids/purchases with escrow, not
retail orders - "order" below means a `payments` row (a bid payment or
a purchase payment), and "fulfillment" means escrow funding/release,
matching what paymentCallback.service.js already does for real.

- payment_providers: a real provider registry (currently only M-Pesa,
  future-ready for card processors etc.) - genuinely absent before
  this migration; the app is hardcoded to M-Pesa everywhere with no
  data-layer provider concept at all.
- payment_attempts: one row per STK-push attempt, distinct from the
  final payments row - lets a customer retry after a timeout/failure
  without losing the history of each individual attempt. Additive:
  payments.id is unaffected, existing code paths continue to work
  unchanged; a payment_attempts row is a new, optional enrichment.
- payment_events: an explicit, append-only audit trail (STK initiated,
  callback received, amount verified, marked paid, escrow created,
  etc.) - genuinely absent before this migration. audit_logs exists
  (Phase 1) but is a generic cross-domain table; a dedicated,
  queryable payment timeline is a real, distinct need for the
  reconciliation tooling this phase also requires.
- refunds: genuinely absent before this migration (confirmed - no
  Refund model, no refunds table anywhere) despite
  escrowRoutes.js/escrowVaultRoutes.js already referencing refund
  concepts in their route paths.
- webhook_events: the Webhook model (backend/models/Webhook.js) has
  existed with no backing table at all (confirmed - no CREATE TABLE
  webhooks anywhere). Named webhook_events here (not webhooks) to
  match this phase's own requested entity name and to signal it's an
  append-only received-event log, not a webhook-subscription-config
  table (which is a different, not-yet-needed concept).

## What this migration deliberately does NOT do
Does not touch payments, escrows, or any existing table's columns or
constraints. Does not attempt to backfill payment_attempts/
payment_events for historical payments rows (there is no live database
with historical data to backfill from). Does not implement replay
protection or reconciliation logic here - that's application code
(backend/services/), not schema; this migration only adds the tables
that code needs to exist.
*/

-- ═══════════════════════════════════════════════════════
-- FIX: mpesa_transactions (confirmed missing, actively written to)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_request_id TEXT,
  phone TEXT,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  car_id UUID REFERENCES cars(id) ON DELETE SET NULL,
  mpesa_receipt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_checkout_request_id
  ON mpesa_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status
  ON mpesa_transactions(status);

-- ═══════════════════════════════════════════════════════
-- payment_providers
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,           -- e.g. 'mpesa_daraja'
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_sandbox BOOLEAN DEFAULT false,    -- sandbox/test mode flag, per this phase's own requirement
  -- Deliberately NO credential columns here (api_key, secret, etc.) -
  -- per this phase's own explicit instruction ("do not store
  -- unnecessary sensitive credentials in the database... use
  -- environment secrets"). Real M-Pesa credentials already live in
  -- environment variables (confirmed: backend/services/
  -- mpesaAuth.service.js reads process.env directly) - this table is
  -- a registry/config record, never a credential store.
  config JSONB DEFAULT '{}',           -- non-sensitive config only (callback URLs, timeouts) - enforced by convention, not a DB constraint
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO payment_providers (code, display_name, is_active, is_sandbox)
VALUES ('mpesa_daraja', 'M-Pesa Daraja', true, false)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- payment_attempts
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES payment_providers(id),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated', 'pending', 'success', 'failed', 'timeout', 'cancelled')),
  checkout_request_id TEXT,
  provider_reference TEXT,             -- e.g. Daraja's MerchantRequestID, kept distinct from checkout_request_id
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_payment_id ON payment_attempts(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_checkout_request_id ON payment_attempts(checkout_request_id);

-- ═══════════════════════════════════════════════════════
-- payment_events (append-only audit trail)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES payment_attempts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,            -- e.g. 'stk_initiated', 'callback_received', 'amount_verified', 'marked_paid', 'escrow_funded', 'duplicate_callback_ignored'
  payload JSONB DEFAULT '{}',          -- the actual event data (callback body, validation result, etc.) for reconciliation/audit
  created_at TIMESTAMPTZ DEFAULT now()
  -- No updated_at: this table is append-only by design, matching this
  -- phase's own "payment audit logs" requirement - events are never
  -- edited after the fact, only inserted.
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events(created_at);

-- ═══════════════════════════════════════════════════════
-- refunds
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  escrow_id UUID REFERENCES escrows(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  initiated_by UUID REFERENCES users(id),
  provider_reference TEXT,             -- e.g. Daraja B2C ConversationID, once a refund is actually submitted to M-Pesa
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_escrow_id ON refunds(escrow_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

-- ═══════════════════════════════════════════════════════
-- webhook_events (replaces the previously-tableless Webhook model)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES payment_providers(id),
  event_source TEXT NOT NULL DEFAULT 'mpesa_daraja',
  -- Replay protection: the same idea as idempotency_keys.key (Phase 1)
  -- but scoped specifically to raw inbound webhook payloads, which can
  -- arrive before any payment row is even resolvable (e.g. a
  -- malformed or unrecognized callback) - idempotency_keys alone
  -- cannot log those, since middleware/idempotency.js's key is
  -- request-header-derived, not payload-derived. dedupe_key is a hash
  -- of the raw payload + provider reference, computed by the
  -- application layer (not this migration), so a byte-identical
  -- replayed webhook is detected even if no idempotency header was
  -- sent by the provider.
  dedupe_key TEXT NOT NULL UNIQUE,
  raw_payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_dedupe_key ON webhook_events(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
