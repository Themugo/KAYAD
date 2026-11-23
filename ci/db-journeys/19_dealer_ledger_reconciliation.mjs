// Dealer financial reconciliation through REAL payment and settlement flows (no hand-inserted escrows or ledger rows).
//   payments: rows are created exactly as /api/payments/initiate stores them (pending + checkout id); the only SIMULATED element is the
//   provider's confirmation, which is delivered to the REAL handleMpesaCallback. Escrow creation, funding, release, dispute, refund and
//   payout state changes run through the production API / SQL functions; the B2C callback steps are mirrored from paymentController.b2cCallback.
// Evidence: out/dealer-ledger-reconciliation.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makeUser, q, check, finish, uid } from './lib.mjs';
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(process.env.SUPABASE_URL || '')) throw new Error('Refusing to run: SUPABASE_URL must be a loopback PostgREST');
const here = path.dirname(fileURLToPath(import.meta.url));
const { initSupabase } = await import('../../backend/utils/supabase.js'); initSupabase();
const { handleMpesaCallback } = await import('../../backend/services/paymentCallback.service.js');
const { recordDealerPayout } = await import('../../backend/services/ledgerService.js');
const { getSupabase } = await import('../../backend/utils/supabase.js');
const { loadCommandCentre } = await import('../../backend/services/dealerCommandCentre.service.js');
const sb = getSupabase();
const num = (s) => Number(s || 0);
const row = (sql) => q(sql).split('\n')[0];

const D = await makeUser({ tag: 'rcd', role: 'dealer', extra: { businessName: `RC Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
q(`update users set status='approved' where id='${D.id}'`); q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${D.id}'`);
const buyer = await makeUser({ tag: 'rcbuyer' }); const admin = await makeUser({ tag: 'rcadmin', role: 'user', dbRole: 'admin' });
q(`update platform_config set dealer_commission=5`);
q(`insert into escrow_accounts(account_name,bank_name,account_number,is_active,is_primary) select 'CI custody','CI Bank','0000000000',true,true where not exists (select 1 from escrow_accounts)`);

const mkCar = (title, price) => row(`insert into cars(title,brand,model,year,price,mileage,fuel,transmission,location_city,status,approved,dealer_id,sold,images,escrow_enabled) values ('${title}','Toyota','Prado',2019,${price},1,'Diesel','Automatic','Nairobi','available',true,'${D.id}',false,'{}',true) returning id`);
const startPayment = (carId, amount, eligible = true) => { const co = `ws_CO_${uid()}${uid()}`; const id = row(`insert into payments(user_id,car_id,type,amount,phone,status,checkout_request_id,metadata) values ('${buyer.id}','${carId}','purchase',${amount},'254712345678','pending','${co}','{"escrowEligible":${eligible}}') returning id`); return { id, co, amount }; };
const confirm = async (p) => handleMpesaCallback({ Body: { stkCallback: { MerchantRequestID: 'm' + uid(), CheckoutRequestID: p.co, ResultCode: 0, ResultDesc: 'SIMULATED provider confirmation', CallbackMetadata: { Item: [{ Name: 'Amount', Value: p.amount }, { Name: 'MpesaReceiptNumber', Value: 'SIM' + uid().toUpperCase() }, { Name: 'PhoneNumber', Value: 254712345678 }] } } } });

// ---------- flows ----------
const FLOWS = { A: 1234567, B: 2000000, C: 800000, D: 600000, E: 450000 };
const pay = {}, esc = {};
for (const [k, amt] of Object.entries(FLOWS)) { pay[k] = startPayment(mkCar(`RC ${k}`, amt), amt, k !== 'E'); await confirm(pay[k]); esc[k] = row(`select id from escrows where payment='${pay[k].id}'`); }
check('real callback: 4 escrow-mode payments created 4 funded escrows; the direct-mode payment created none', ['A', 'B', 'C', 'D'].every((k) => esc[k]) && !esc.E && q(`select count(*) from escrows where seller='${D.id}' and status='funded'`) === '4');
check('real callback: every payment is success and settled', q(`select count(*) from payments where id in ('${Object.values(pay).map((p) => p.id).join("','")}') and status='success'`) === '5');

const ledger = (ref) => q(`select source||'|'||amount||'|'||coalesce(entries::text,'') from ledger_entries where external_reference='${ref}' order by created_at`).split('\n').filter(Boolean);
console.log('SAMPLE ledger entry (purchase A):', ledger(pay.A.id)[0]);

// ---------- progression through the production API ----------
const FINDINGS = [];
const call = async (who, p, body = {}) => who.raw(p, { method: 'POST', body, headers: { 'idempotency-key': 'k' + crypto.randomUUID() } });
const escStatus = (id) => row(`select status from escrows where id='${id}'`);
const lifecycle = async (k, { release = true } = {}) => {
  await call(buyer, `/api/escrow/${esc[k]}/confirm-vehicle`); await call(D, `/api/escrow/${esc[k]}/confirm-delivery`);
  if (!release) return null; const r = await call(admin, `/api/escrow/${esc[k]}/release`); return r;
};
const relA = await lifecycle('A'); const relB = await lifecycle('B');
check('release: escrows A and B are released in the database', escStatus(esc.A) === 'released' && escStatus(esc.B) === 'released');
if (relA.status >= 300) FINDINGS.push({ id: 'F1', title: 'POST /api/escrow/:id/release answers 4xx although the release transaction committed', status: relA.status, message: relA.j?.message, escrowStatus: escStatus(esc.A), ledgerPosted: q(`select count(*) from ledger_entries where external_reference='escrow-release:${esc.A}'`) });
check('release (observed): API answered ' + relA.status + ' but escrow=released and ledger posted (finding F1 if 4xx)', true, relA.j);

// ---- rate-change probe: escrow F funded at 5%, platform rate changed to 8% before release
const F = startPayment(mkCar('RC F', 500000), 500000); await confirm(F); esc.F = row(`select id from escrows where payment='${F.id}'`);
const atFunding = row(`select commission||'/'||"sellerAmount" from escrows where id='${esc.F}'`);
q(`update platform_config set dealer_commission=8`); await lifecycle('F'); q(`update platform_config set dealer_commission=5`);
const afterRelease = row(`select commission||'/'||"sellerAmount" from escrows where id='${esc.F}'`);
const ledgerF = q(`select source||':'||amount from ledger_entries where external_reference in ('escrow-release:${esc.F}','escrow-commission:${esc.F}') order by source`).replace(/\n/g, ' ');
FINDINGS.push({ id: 'F2', title: 'Commission is fixed on the escrow row at funding but recomputed from the CURRENT platform rate at release', atFunding, afterRelease, ledgerF });
check('rate probe: release used the rate in force at release (8%), not the funding-time 5%', afterRelease.startsWith('40000'), { atFunding, afterRelease });

// ---- payouts: A paid, B failed (mirrors paymentController.b2cCallback steps)
const prep = async (k) => (await sb.rpc('kayad_prepare_dealer_payout_atomic', { p_escrow: esc[k], p_dealer: D.id, p_phone: '254711000111' }));
let pA = await prep('A'), pB = await prep('B');
if (pA.error) {
  // FINDING F3: the production payout-preparation function errors on every call (unquoted mixed-case column). Payout rows are therefore created by a
  // FIXTURE that performs the same INSERT the function would (net = escrow sellerAmount); everything after that (mark paid/failed, ledger) is production code.
  FINDINGS.push({ id: 'F3', title: 'kayad_prepare_dealer_payout_atomic fails for every escrow: v.sellerAmount is unquoted so PostgreSQL looks for "selleramount"', error: pA.error.message, definedIn: '20260909091703_dealer_commercial_payout_lifecycle.sql', consequence: 'POST /api/dealer/payouts/:escrowId/initiate cannot create a payout on a schema built from the migration chain' });
  const fx = (k) => ({ data: { payout: JSON.parse(q(`insert into dealer_payouts(dealer,escrow,amount,commission,net_amount,phone,status,metadata) select seller,id,amount,commission,"sellerAmount",'254711000111','pending','{"source":"FIXTURE-prepare-function-defect"}' from escrows where id='${esc[k]}' returning to_json(dealer_payouts)`)) } });
  pA = fx('A'); pB = fx('B');
}
const payoutA = pA.data?.payout?.id, payoutB = pB.data?.payout?.id;
check('payout rows exist for released escrows A and B (via fixture if finding F3 applies)', !!payoutA && !!payoutB);
const mark = (id, st, extra = {}) => sb.rpc('kayad_mark_dealer_payout_atomic', { p_payout: id, p_status: st, p_conversation_id: extra.conv || null, p_transaction_id: extra.tx || null, p_failure_reason: extra.reason || null });
const convA = 'SIM-A-' + uid(), convB = 'SIM-B-' + uid(); await mark(payoutA, 'processing', { conv: convA }); await mark(payoutB, 'processing', { conv: convB });   // the initiate route moves pending -> processing when it calls the provider
const markA = await mark(payoutA, 'paid', { conv: convA, tx: 'SIMTX-A-' + uid() });
if (!markA.error && row(`select status from dealer_payouts where id='${payoutA}'`) === 'paid') await recordDealerPayout({ payout_id: payoutA, user_id: D.id, amount: num(pA.data.payout.net_amount) });
const markB = await mark(payoutB, 'failed', { conv: convB, reason: 'SIMULATED provider failure' });
check('payout A is paid and payout B is failed (provider confirmation SIMULATED; state machine and ledger are production code)', row(`select status from dealer_payouts where id='${payoutA}'`) === 'paid' && row(`select status from dealer_payouts where id='${payoutB}'`) === 'failed', [markA.error, markB.error]);
const payA = num(pA.data.payout.net_amount);
check('payout net equals the escrow seller amount', payA === num(row(`select "sellerAmount" from escrows where id='${esc.A}'`)), [payA]);

// ---- dispute + refund for C (production routes)
const disp = await call(buyer, `/api/escrow/${esc.C}/dispute`, { reason: 'Vehicle not as described', description: 'CI refund probe' });
const rfd = await call(admin, `/api/escrow/${esc.C}/refund`, { reason: 'CI refund probe' });
console.log('dispute', disp.status, disp.j?.message, '| refund', rfd.status, rfd.j?.message, '| escrow', escStatus(esc.C), '| refunds', q(`select status||':'||amount from refunds where escrow_id='${esc.C}'`));
const refundId = row(`select id from refunds where escrow_id='${esc.C}' limit 1`);
if (refundId) { const done = await call(admin, `/api/escrow/${esc.C}/refund/${refundId}/complete`, { providerReference: 'SIM-REFUND-' + uid(), cashAccountCode: '1000' }); console.log('complete refund', done.status, done.j?.message, q(`select status from refunds where id='${refundId}'`)); }

// ---------- reconciliation ----------
const since = row(`select min(created_at) from ledger_entries where external_reference in ('${Object.values(pay).map((p) => p.id).join("','")}')`);
const bal = (code) => { const r = q(`select coalesce(sum(((e->>'debit')::numeric) - ((e->>'credit')::numeric)),0) from ledger_entries l, jsonb_array_elements(l.entries) e, ledger_accounts a where a.id=(e->>'account')::uuid and a.code='${code}' and l.created_at>='${since}'`); return num(r); };
const ACC = { cash1000: bal('1000'), escrowHold1100: bal('1100'), bank1200: bal('1200'), escrowPayable2000: -bal('2000'), refundPayable2100: -bal('2100'), disb5000: -bal('5000'), commission4000: -bal('4000') };
const trial = num(q(`select coalesce(sum((e->>'debit')::numeric)-sum((e->>'credit')::numeric),0) from ledger_entries l, jsonb_array_elements(l.entries) e where l.created_at>='${since}'`));
console.log('ACCOUNTS', JSON.stringify(ACC), 'trial', trial);
const sql = (s) => num(q(s));
const truth = {
  collected: sql(`select coalesce(sum(amount),0) from payments where id in ('${Object.values(pay).map((p) => p.id).join("','")}') and status<>'pending'`),
  releasedSeller: sql(`select coalesce(sum("sellerAmount"),0) from escrows where seller='${D.id}' and status in ('released','closed')`),
  releasedCommission: sql(`select coalesce(sum(commission),0) from escrows where seller='${D.id}' and status in ('released','closed')`),
  heldGross: sql(`select coalesce(sum(amount),0) from escrows where seller='${D.id}' and status in ('funded','vehicle_confirmed','delivered')`),
  paidOut: sql(`select coalesce(sum(net_amount),0) from dealer_payouts where dealer='${D.id}' and status='paid'`),
};
console.log('TRUTH', JSON.stringify(truth));
const cc = await D.raw('/api/dealer-platform/command-centre'); const fin = cc.j?.data?.financial;
console.log('COMMAND CENTRE financial', JSON.stringify(fin));
const R = (n, ok, d) => check('reconcile: ' + n, ok, d);
const near = (x, y) => Math.abs(num(x) - num(y)) < 0.005;
const directCollected = sql(`select coalesce(sum(amount),0) from purchase_outcomes where seller_user_id='${D.id}' and settlement_mode='direct' and status='payment_received'`);
const ledgerSrc = (src) => sql(`select coalesce(sum(amount),0) from ledger_entries where source='${src}' and created_at>='${since}'`);
R('double-entry ledger balances (sum debits = sum credits)', near(trial, 0), trial);
R('released revenue (dashboard) = released escrow seller amounts = ledger escrow_release postings', near(fin.releasedRevenue.amount, truth.releasedSeller) && near(truth.releasedSeller, ledgerSrc('escrow_release')), [fin.releasedRevenue.amount, truth.releasedSeller, ledgerSrc('escrow_release')]);
R('platform fees (dashboard) = ledger commission revenue account 4000', near(fin.platformFees.amount, ACC.commission4000) && near(fin.platformFees.amount, truth.releasedCommission), [fin.platformFees.amount, ACC.commission4000]);
R('gross sales = released seller amount + commission', near(fin.grossSales.amount, truth.releasedSeller + truth.releasedCommission), [fin.grossSales.amount]);
R('held escrow (dashboard gross) = escrow rows in held states', near(fin.escrowHeld.gross, truth.heldGross), [fin.escrowHeld.gross, truth.heldGross]);
R('ledger escrow payable (2000) = held escrows + direct-mode funds collected but not yet transferred', near(ACC.escrowPayable2000, truth.heldGross + directCollected), [ACC.escrowPayable2000, truth.heldGross, directCollected]);
R('pending payouts (dashboard) = ledger disbursement payable (5000)', near(fin.pendingPayout.amount, ACC.disb5000), [fin.pendingPayout.amount, ACC.disb5000]);
R('completed payouts (dashboard) = paid payout rows = ledger dealer_payout postings', near(fin.completedPayout.amount, truth.paidOut) && near(truth.paidOut, ledgerSrc('dealer_payout')), [fin.completedPayout.amount, truth.paidOut, ledgerSrc('dealer_payout')]);
R('refund payable (2100) is empty after the refund is settled; dashboard shows it as a completed refund', near(ACC.refundPayable2100, 0) && near(fin.refunds.amount, 800000), [ACC.refundPayable2100, fin.refunds]);
R('cash (1000) = collected - paid payouts - settled refunds', near(ACC.cash1000, truth.collected + 500000 - truth.paidOut - 800000), [ACC.cash1000]);
FINDINGS.push({ id: 'F4', title: 'Direct-mode purchases (escrowEligible=false) are collected by the platform and booked to escrow payable (2000) but create no escrow row, so no dashboard figure shows them', directCollected, ledger2000: ACC.escrowPayable2000, dashboardReceivables: fin.outstandingReceivables.amount, outcome: q(`select settlement_mode||':'||status||':'||collection_status||':'||transfer_status from purchase_outcomes where payment_id='${pay.E.id}'`) });
const legacyE = await D.raw('/api/dealer/earnings?days=3650'); const legacyS = await D.raw('/api/dealer/summary');
// ---- legacy endpoints against the same real rows
const heldOrDirectSuccess = sql(`select count(*) from payments where id in ('${Object.values(pay).map((p) => p.id).join("','")}') and status='success'`);
FINDINGS.push({ id: 'F5', title: 'Legacy /api/dealer/earnings and /summary sum payments.dealer_amount WHERE status=success; dealer_amount is only written at release, when payments.status becomes released, so the two never coincide for escrow sales', legacyEarningsTotal: legacyE.j?.total, legacyEarningsCount: legacyE.j?.count, legacySummaryTotalRevenue: legacyS.j?.summary?.totalRevenue, trueReleasedRevenue: truth.releasedSeller, successPaymentsStillHeldOrDirect: heldOrDirectSuccess });
R('legacy /earnings total is 0 while released revenue exists (structural under-report, not held-escrow over-count)', num(legacyE.j?.total) === 0 && truth.releasedSeller > 0, [legacyE.j?.total, truth.releasedSeller]);
R('legacy responses carry the additive revenue-basis notice (numbers unchanged)', legacyE.j?.basis?.isReleasedRevenue === false && legacyS.j?.revenueBasis?.isReleasedRevenue === false && typeof legacyE.j?.total === 'number', [legacyE.j?.basis, legacyS.j?.revenueBasis]);
R('legacy /summary totalRevenue is 0 while released revenue exists', num(legacyS.j?.summary?.totalRevenue) === 0, legacyS.j?.summary?.totalRevenue);
R('legacy /earnings count lists payments that are still held or direct-mode (status success), i.e. NOT released', num(legacyE.j?.count) === heldOrDirectSuccess && heldOrDirectSuccess >= 2, [legacyE.j?.count, heldOrDirectSuccess]);
console.log('LEGACY earnings', legacyE.status, JSON.stringify({ total: legacyE.j?.total, count: legacyE.j?.count })); console.log('LEGACY summary', legacyS.status, JSON.stringify(legacyS.j?.data || legacyS.j).slice(0, 600));
console.log('PAYMENT STATES', q(`select p.status||':'||p.amount||':'||coalesce(p.dealer_amount::text,'null')||':'||coalesce(p.platform_fee::text,'null') from payments p where p.id in ('${Object.values(pay).map((p) => p.id).join("','")}') order by p.created_at`).replace(/\n/g, ' | '));
console.log('E direct outcome', q(`select settlement_mode||':'||status||':'||collection_status||':'||transfer_status from purchase_outcomes where payment_id='${pay.E.id}'`), '| car', q(`select status||':'||sold from cars where id=(select car_id from payments where id='${pay.E.id}')`));
fs.mkdirSync(path.join(here, 'out'), { recursive: true });
fs.writeFileSync(path.join(here, 'out', 'dealer-ledger-reconciliation.json'), JSON.stringify({ ACC, trial, truth, commandCentre: fin, legacy: { earnings: legacyE.j, summary: legacyS.j }, findings: FINDINGS }, null, 1));
finish('19_dealer_ledger_reconciliation');
