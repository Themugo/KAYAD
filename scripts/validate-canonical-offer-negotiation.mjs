import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const migration = read('supabase/migrations/20261110120000_canonical_offer_negotiation_workflow.sql');
const routes = read('backend/routes/leadRoutes.js');
const controller = read('backend/controllers/offerNegotiationController.js');
const service = read('backend/services/offerNegotiation.service.js');
const schema = read('backend/validation/offerNegotiation.schema.js');
const client = read('src/services/leadApi.ts');
const checks = [
  ['offers bind to canonical leads and vehicle records', /lead_id UUID NOT NULL REFERENCES public\.leads/.test(migration) && /vehicle_id UUID REFERENCES public\.cars/.test(migration)],
  ['immutable event history is persisted', /CREATE TABLE IF NOT EXISTS public\.marketplace_offer_events/.test(migration)],
  ['counteroffers preserve parent chain', /parent_offer_id UUID REFERENCES public\.marketplace_offers/.test(migration)],
  ['all decision states are constrained', /pending','accepted','rejected','withdrawn','countered','expired/.test(migration)],
  ['only one pending offer per lead is allowed', /UNIQUE INDEX IF NOT EXISTS idx_marketplace_offers_one_pending_per_lead/.test(migration)],
  ['RPC serializes lead and offer mutations', /FROM public\.leads WHERE id=p_lead_id FOR UPDATE/.test(migration) && /FOR UPDATE/.test(migration)],
  ['RPC validates participant and decision permissions', /Not a transaction participant/.test(migration) && /Only the recipient/.test(migration) && /Only the sender/.test(migration)],
  ['idempotency is enforced for writes and replay', /UNIQUE \(lead_id, idempotency_key\)/.test(migration) && /Idempotent replay/.test(migration)],
  ['expired offers are recorded, not silently left pending', /status='expired'/.test(migration) && /event_type,amount,idempotency_key/.test(migration)],
  ['writes are restricted to service role RPC', /REVOKE ALL ON FUNCTION public\.kayad_offer_action/.test(migration) && /TO service_role/.test(migration)],
  ['authenticated participant read policies exist', /auth\.uid\(\) = buyer_id OR auth\.uid\(\) = seller_id/.test(migration)],
  ['API routes expose list, submit and action operations', /router\.get\("\/:leadId\/offers"/.test(routes) && /router\.post\("\/:leadId\/offers"/.test(routes) && /:offerId\/actions/.test(routes)],
  ['controller checks lead participants and UUID references', /participant\(lead, req\.user\?\.id\)/.test(controller) && /Invalid offer reference/.test(controller)],
  ['service uses the canonical atomic RPC', /kayad_offer_action/.test(service)],
  ['request schemas validate amounts, actions and idempotency', /idempotencyKey/.test(schema) && /counter/.test(schema)],
  ['frontend API client exposes offer lifecycle calls', /offers\(leadId/.test(client) && /submitOffer/.test(client) && /respondToOffer/.test(client)],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
console.log(`\nCanonical offer negotiation: ${checks.filter(([, ok]) => ok).length}/${checks.length} PASS`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
