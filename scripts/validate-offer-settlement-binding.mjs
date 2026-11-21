// Static guard for GAP-OFFER-TXN (P2). Executable proof: ci/db-journeys/05_offer_payment.mjs on a migrated disposable database.
import fs from 'node:fs';
const rd = (p) => fs.readFileSync(p, 'utf8');
const mig = rd('supabase/migrations/20261121110000_offer_settlement_binding.sql');
const routes = rd('backend/routes/leadRoutes.js');
const schema = rd('backend/validation/offerNegotiation.schema.js');
const pay = rd('backend/controllers/paymentController.js');
const svc = rd('backend/services/offerSettlement.service.js');
const checks = [
  ['one active settlement per vehicle (partial unique index)', /CREATE UNIQUE INDEX[^;]*uq_offer_settlement_active_vehicle[^;]*\(vehicle_id\)\s+WHERE status IN \('awaiting_payment','paid'\)/.test(mig)],
  ['agreed amount is whole shillings (bigint) and positive', /agreed_amount BIGINT NOT NULL CHECK \(agreed_amount > 0\)/.test(mig)],
  ['payment backstop trigger on payments (BEFORE INSERT)', /CREATE TRIGGER trg_offer_settlement_payment_guard BEFORE INSERT ON public\.payments/.test(mig)],
  ['backstop enforces buyer and amount', /OFFER_SETTLEMENT_WRONG_BUYER/.test(mig) && /OFFER_SETTLEMENT_AMOUNT_MISMATCH/.test(mig) && /OFFER_SETTLEMENT_ALREADY_PAID/.test(mig)],
  ['settlement key fields immutable; events append-only', /trg_offer_settlement_immutable/.test(mig) && /trg_offer_settlement_events_append_only/.test(mig)],
  ['RLS enabled and client roles revoked on both tables', /ENABLE ROW LEVEL SECURITY/.test(mig) && /REVOKE ALL ON public\.marketplace_offer_settlements, public\.marketplace_offer_settlement_events FROM PUBLIC, anon, authenticated/.test(mig)],
  ['all settlement functions are SECURITY DEFINER with pinned search_path', (mig.match(/SECURITY DEFINER SET search_path = public/g) || []).length >= 8],
  ['public functions are service_role only', /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/.test(mig) && !/GRANT EXECUTE[^;]*TO (anon|authenticated)/.test(mig)],
  ['pay route accepts a phone only (strict schema, no amount field)', /payOfferSchema = z\.object\(\{ phone:.*\}\)\.strict\(\)/.test(schema) && !/payOfferSchema[^\n]*amount/.test(schema)],
  ['pay route is rate limited like the generic payment route', /"\/:leadId\/offers\/:offerId\/pay", protect, paymentLimiter/.test(routes)],
  ['service never reads an amount from the request', /amount: Number\(data\.agreedAmount\)/.test(svc) && !/req\.body\.amount/.test(rd('backend/controllers/offerNegotiationController.js'))],
  ['generic payment route honours the agreed settlement', /getActiveSettlementForVehicle/.test(pay) && /agreedSettlement\.agreed_amount/.test(pay)],
  ['accept branch opens the settlement inside kayad_offer_action', /v_settlement := public\.kayad_offer_settlement_open\(v_new, p_actor_id\)/.test(mig)],
];
let failed = 0;
for (const [n, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}`); if (!ok) failed++; }
if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log('Offer settlement binding guard passed');
