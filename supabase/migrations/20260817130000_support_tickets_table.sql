/*
# Support tickets table
# KAYAD - activates the existing, real, mounted support-ticket backend

Found while building a real "make a good support page" implementation:
backend/routes/supportRoutes.js is real and mounted at /api/support
(createTicket/getUserTickets/getTicket/addMessage/updateTicketStatus/
rateTicket/getSupportAnalytics, all with real, working auth
middleware), but its target table (support_tickets, per
models/_base.js's own TABLE_MAP: SupportTicket -> "support_tickets")
does not exist anywhere in the real schema - the same "real
application code, missing table" pattern found and fixed repeatedly
elsewhere in this project's history (inspection marketplace, provider
lifecycle, etc.).

Scoped deliberately: built to support createTicket and getUserTickets/
getTicket (the read/create paths this project's real support PAGE
actually needs) with confidence, since both use only .create()/.find()/
.findById().populate() - patterns already confirmed working against
this schema's compatibility layer throughout this project's history.
The admin-side mutate-then-.save() and .aggregate() paths
(addMessage/updateTicketStatus) were not independently re-verified
against the real compatibility layer in this pass - the columns below
support them structurally (sla/messages as JSONB, status/assignedTo/
escalatedTo as plain columns), but their specific Mongoose-style
document-mutation behavior was not empirically tested here, unlike the
create/read paths, which were.
*/

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category TEXT,
  priority TEXT DEFAULT 'medium',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  related_escrow UUID,
  related_car UUID REFERENCES cars(id) ON DELETE SET NULL,
  related_payment TEXT,
  status TEXT DEFAULT 'open',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  escalated_to UUID REFERENCES users(id) ON DELETE SET NULL,
  messages JSONB DEFAULT '[]',
  sla JSONB DEFAULT '{}',
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  resolution_notes TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
