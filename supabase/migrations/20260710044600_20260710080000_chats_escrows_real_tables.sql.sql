/*
# Chats & Escrows — the real tables (not conversations/escrow_transactions)

## Background
TABLE_MAP routes Chat -> "chats" and Escrow -> "escrows". The one
already-applied migration (gari_motors_full_schema.sql.sql) instead
created "conversations"+"messages" (normalized) and
"escrow_transactions" (a flatter shape than what the app actually uses).
Confirmed directly with the project owner: chatController.js's and
escrow.service.js's designs are the real ones. conversations/messages/
escrow_transactions are left exactly as they were (harmless - nothing in
the real application code queries them; they exist only so the
already-applied migration's own internal FK references resolve).

## chats
Reverse-engineered from controllers/chatController.js, the only real
consumer. This is a genuinely different (denormalized/MongoDB-era)
design from the conversations+messages pair: messages live as a JSONB
array directly on the chat row, not a separate table. Confirmed by
getUnreadCount() and getChatMessages(), which both do
`.select("messages")` and iterate `chat.messages` as an array of
`{ id, sender, text, createdAt, seenBy: [] }` objects - there is no
separate messages table for this design.

## escrows
Reverse-engineered from services/escrow.service.js and
services/escrowStateMachine.js (the real state-machine implementation)
plus controllers/escrowController.js. Also uses an embedded JSONB
`history` array (`{ action, by?, at }` objects) rather than a separate
audit table - same denormalized pattern as chats.messages, and for the
same reason: this backend's models/_base.js createModel() factory is a
Mongoose-compatibility shim (.find/.findById/.populate/.lean all appear
verbatim in escrowController.js) built on top of Supabase so pre-existing
Mongoose-era controller code didn't need rewriting when this project
moved off MongoDB - explains the embedded-array pattern, which is a
natural, idiomatic MongoDB shape that has nothing to do with Postgres
normalization conventions.

## cars.sold / cars.is_paid
Found while reading escrow.service.js's release flow, which does
update("cars", car.id, { sold: true, status: "sold", isPaid: true }) -
2 more real columns the earlier cars migration was missing.
*/

-- ═══════════════════════════════════════════════════════
-- CHATS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participants UUID[] NOT NULL,
  car UUID REFERENCES cars(id) ON DELETE SET NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  "lastMessage" TEXT,
  "lastMessageAt" TIMESTAMPTZ,
  "isBlocked" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats USING GIN (participants);
CREATE INDEX IF NOT EXISTS idx_chats_car ON chats(car);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════
-- ESCROWS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer UUID NOT NULL REFERENCES users(id),
  seller UUID NOT NULL REFERENCES users(id),
  car UUID REFERENCES cars(id) ON DELETE SET NULL,
  payment UUID REFERENCES payments(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  commission NUMERIC DEFAULT 0,
  "sellerAmount" NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','funded','vehicle_confirmed','delivered','disputed','refunded','released','closed')),
  history JSONB NOT NULL DEFAULT '[]',
  "fundedAt" TIMESTAMPTZ,
  "vehicleConfirmedAt" TIMESTAMPTZ,
  "deliveredAt" TIMESTAMPTZ,
  "releasedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escrows_buyer ON escrows(buyer);
CREATE INDEX IF NOT EXISTS idx_escrows_seller ON escrows(seller);
CREATE INDEX IF NOT EXISTS idx_escrows_car ON escrows(car);
CREATE INDEX IF NOT EXISTS idx_escrows_payment ON escrows(payment);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);

ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════
-- CARS: 2 more real columns found via escrow.service.js's release flow
-- ═══════════════════════════════════════════════════════
ALTER TABLE cars ADD COLUMN IF NOT EXISTS sold BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN DEFAULT false;
