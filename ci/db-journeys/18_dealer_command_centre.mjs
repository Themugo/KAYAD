// Dealer command centre against the real backend and the disposable database: API-level role matrix, cross-dealership isolation,
// reconciliation of every figure to independent SQL over the underlying rows (never to the service's own code), read-only proof.
// Evidence: out/dealer-command-centre.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makeUser, q, check, finish, uid, B } from './lib.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const mkDealer = async (tag) => { const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `CC ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } }); q(`update users set status='approved' where id='${d.id}'`); q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`); return d; };
const A = await mkDealer('cca'), Bd = await mkDealer('ccb'), C = await mkDealer('ccempty');
const buyer = await makeUser({ tag: 'ccbuyer' }); const stranger = await makeUser({ tag: 'ccstranger' });
const seed = (sql) => q(`set session_replication_role = replica; ${sql}`); // raw operational rows (disposable DB only); the endpoint under test is read-only
const car = (dealer, title, status, auction = null) => { const id = q(`insert into cars(title,brand,model,year,price,mileage,fuel,transmission,location_city,status,approved,dealer_id,sold,images) values ('${title}','Toyota','Prado',2019,9999999999,1,'Diesel','Automatic','Nairobi','${status}',true,'${dealer.id}',${status === 'sold'},'[]'::jsonb) returning id`).split('\n')[0]; if (auction) seed(`update cars set auction_status='${auction[0]}', auction_end=${auction[1]}, current_bid=${auction[2]}, bids_count=${auction[3]} where id='${id}'`); return id; };
const esc = (dealer, status, amount, commission, funded = true) => q(`insert into escrows(buyer,seller,amount,commission,"sellerAmount",status,"fundedAt") values ('${buyer.id}','${dealer.id}',${amount},${commission},${amount - commission},'${status}',${funded ? 'now()' : 'null'}) returning id`).split('\n')[0];

// ---------- dealership A: listings
for (let i = 0; i < 6; i++) car(A, `A avail ${i}`, 'available');
car(A, 'A pend 1', 'pending'); car(A, 'A pend 2', 'pending'); car(A, 'A draft', 'draft'); car(A, 'A hidden', 'hidden'); car(A, 'A sold 1', 'sold'); car(A, 'A sold 2', 'sold');
q(`update cars set deleted_at=now() where title='A avail 5' and dealer_id='${A.id}'`);
const live = car(A, 'A live auction', 'available', ['live', `now() + interval '1 day'`, 900000, 2]);
const upc = car(A, 'A upcoming auction', 'available', ['upcoming', `now() + interval '3 days'`, 0, 0]);
const ended = car(A, 'A ended auction', 'available', ['ended', `now() - interval '1 day'`, 400000, 1]);
const adraft = car(A, 'A draft auction', 'draft', ['draft', 'null', 0, 0]);
for (const [amt, st] of [[900000, 'paid'], [850000, 'paid'], [2000000, 'failed'], [950000, 'pending'], [1000000, 'cancelled']]) seed(`insert into bids(car_id,user_id,amount,status) values ('${live}','${buyer.id}',${amt},'${st}')`);
seed(`insert into bids(car_id,user_id,amount,status) values ('${ended}','${buyer.id}',400000,'won')`);
// dealership B: large figures so any leakage is unmistakable
for (let i = 0; i < 4; i++) car(Bd, `B avail ${i}`, 'available');
esc(Bd, 'released', 99000000, 4950000); esc(Bd, 'funded', 55000000, 2750000); car(Bd, 'B live', 'available', ['live', `now() + interval '1 day'`, 77000000, 9]);

// ---------- escrow, payouts, refunds (dealership A)
const e1 = esc(A, 'released', 1000000, 50000), e2 = esc(A, 'closed', 2000000, 100000), e3 = esc(A, 'released', 500000, 25000), e4 = esc(A, 'released', 800000, 40000), e11 = esc(A, 'released', 300000, 15000);
esc(A, 'funded', 3000000, 150000); esc(A, 'delivered', 1000000, 50000); esc(A, 'vehicle_confirmed', 400000, 20000);
const e8 = esc(A, 'disputed', 700000, 35000); const e9 = esc(A, 'refunded', 900000, 45000); esc(A, 'pending', 600000, 30000, false);
for (const [e, st, net] of [[e1, 'paid', 950000], [e3, 'processing', 475000], [e4, 'failed', 760000]]) seed(`insert into dealer_payouts(dealer,escrow,amount,commission,net_amount,status) values ('${A.id}','${e}',${net},0,${net},'${st}')`);
seed(`insert into refunds(escrow_id,amount,status) values ('${e9}',900000,'completed'), ('${e8}',1000,'pending')`);
const eb = q(`select id from escrows where seller='${Bd.id}' and status='released'`); seed(`insert into dealer_payouts(dealer,escrow,amount,commission,net_amount,status) values ('${Bd.id}','${eb}',94050000,0,94050000,'paid')`);

// ---------- leads, offers, settlements
const lead = (dealer, stage, ageHours, extra = '') => q(`insert into leads(buyer,dealer,stage,archived,created_at${extra ? ',first_response_time' : ''}) values ('${buyer.id}','${dealer.id}','${stage}',${stage === 'archivedNew' ? 'true' : 'false'},now() - interval '${ageHours} hours'${extra ? ',' + extra : ''}) returning id`).split('\n')[0];
const L = [lead(A, 'new', 1), lead(A, 'new', 72), lead(A, 'new', 72, '5'), lead(A, 'contacted', 10), lead(A, 'sold', 100), lead(A, 'negotiating', 5), lead(A, 'negotiating', 5), lead(A, 'negotiating', 5), lead(A, 'negotiating', 5)];
q(`insert into leads(buyer,dealer,stage,archived,created_at) values ('${buyer.id}','${A.id}','new',true,now() - interval '200 hours')`);
for (let i = 0; i < 4; i++) lead(Bd, 'new', 100);
const offer = (leadId, st, recipient, sender, exp) => q(`insert into marketplace_offers(lead_id,buyer_id,seller_id,sender_id,recipient_id,amount,status,idempotency_key,expires_at) values ('${leadId}','${buyer.id}','${A.id}','${sender.id}','${recipient.id}',1,'${st}','k${uid()}',${exp}) returning id`).split('\n')[0];
offer(L[5], 'pending', A, buyer, `now() + interval '2 days'`); offer(L[6], 'pending', A, buyer, 'null'); offer(L[7], 'pending', buyer, A, `now() + interval '2 days'`); offer(L[8], 'pending', A, buyer, `now() - interval '1 day'`);
const acc = offer(L[4], 'accepted', A, buyer, 'null');
seed(`insert into marketplace_offer_settlements(offer_id,lead_id,vehicle_id,buyer_id,seller_id,agreed_amount,status,expires_at) values ('${acc}','${L[4]}','${live}','${buyer.id}','${A.id}',1500000,'awaiting_payment', now() + interval '2 days')`);

// ---------- auction outcomes (A)
for (const [st, amt, ci] of [['payment_due', 2500000, ended], ['defaulted', 111, car(A, 'A ended auction 2', 'available', ['ended', `now() - interval '2 days'`, 111, 1])], ['completed', 400000, car(A, 'A ended auction 3', 'available', ['ended', `now() - interval '3 days'`, 400000, 1])]]) {
  const setup = q(`insert into auction_setups(car_id,organizer_id,publication_status) values ('${ci}','${A.id}','published') returning id`).split('\n')[0];
  seed(`insert into auction_outcomes(car_id,auction_setup_id,organizer_id,status,settlement_mode,winning_amount) values ('${ci}','${setup}','${A.id}','${st}','escrow',${amt})`);
}

// ---------- team (real invitation flow) incl. a custom role
const members = {};
const join = async (roleKey) => { const u = await makeUser({ tag: 'cc' + roleKey.slice(0, 6) }); const inv = await A.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: u.email, role: roleKey } }); if (inv.status >= 300) throw new Error(`invite ${roleKey}: ${inv.status} ${JSON.stringify(inv.j)}`); const tok = crypto.randomBytes(32).toString('hex'); q(`update dealer_teams set invite_token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}' where invite_email='${u.email}'`); const ac = await u.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } }); if (ac.status >= 300) throw new Error(`accept ${roleKey}: ${ac.status}`); members[roleKey] = u; return u; };
for (const r of ['manager', 'sales_agent', 'lot_agent', 'finance_officer', 'viewer']) await join(r);
const cr = await A.raw('/api/dealer-platform/team/roles', { method: 'POST', body: { label: `Team lead ${uid()}`, permissions: { canManageTeam: true, canChatBuyers: true } } });
const customKey = cr.j?.data?.key; check('setup: custom role created', cr.status === 201 && !!customKey, cr);
if (customKey) await join(customKey);
await A.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: `pending-${uid()}@example.test`, role: 'viewer' } });
seed(`insert into dealer_listing_lifecycle_events(car_id,dealer_id,actor_user_id,actor_type,action,previous_status,next_status) values ('${live}','${A.id}','${members.manager.id}','dealer_staff','dealer_mark_sold','available','sold')`);

// ---------- independent SQL ground truth (A)
const n = (sql) => Number(q(sql) || 0);
const truth = {
  revenue: n(`select coalesce(sum(coalesce("sellerAmount",amount-commission)),0) from escrows where seller='${A.id}' and status in ('released','closed')`),
  gross: n(`select coalesce(sum(amount),0) from escrows where seller='${A.id}' and status in ('released','closed')`),
  fees: n(`select coalesce(sum(commission),0) from escrows where seller='${A.id}' and status in ('released','closed')`),
  held: n(`select coalesce(sum(coalesce("sellerAmount",amount-commission)),0) from escrows where seller='${A.id}' and status in ('funded','vehicle_confirmed','delivered')`),
  paidOut: n(`select coalesce(sum(net_amount),0) from dealer_payouts where dealer='${A.id}' and status='paid'`),
  pendingPayout: n(`select coalesce(sum(coalesce(p.net_amount, coalesce(e."sellerAmount",e.amount-e.commission))),0) from escrows e left join dealer_payouts p on p.escrow=e.id where e.seller='${A.id}' and e.status='released' and coalesce(p.status,'none')<>'paid'`),
  refunds: n(`select coalesce(sum(r.amount),0) from refunds r join escrows e on e.id=r.escrow_id where e.seller='${A.id}' and r.status='completed'`),
  volume: n(`select count(*) from escrows where seller='${A.id}' and "fundedAt" is not null`),
  settlement: n(`select coalesce(sum(agreed_amount),0) from marketplace_offer_settlements where seller_id='${A.id}' and status='awaiting_payment' and expires_at>now()`) + n(`select coalesce(sum(winning_amount),0) from auction_outcomes where organizer_id='${A.id}' and status in ('payment_due','escrow_pending_funding')`),
  active: n(`select count(*) from cars where dealer_id='${A.id}' and deleted_at is null and status='available'`),
  pending: n(`select count(*) from cars where dealer_id='${A.id}' and deleted_at is null and status='pending'`),
  draft: n(`select count(*) from cars where dealer_id='${A.id}' and deleted_at is null and status='draft'`),
  sold: n(`select count(*) from cars where dealer_id='${A.id}' and deleted_at is null and (sold or status='sold')`),
  newLeads: n(`select count(*) from leads where dealer='${A.id}' and stage='new' and not archived`),
  unanswered: n(`select count(*) from leads where dealer='${A.id}' and stage='new' and not archived and first_response_time is null and created_at < now() - interval '24 hours'`),
  offers: n(`select count(*) from marketplace_offers where seller_id='${A.id}' and status='pending' and recipient_id='${A.id}' and (expires_at is null or expires_at>now())`),
  liveAuctions: n(`select count(*) from cars where dealer_id='${A.id}' and deleted_at is null and auction_status='live' and auction_end>now()`),
  completed: n(`select count(*) from cars where dealer_id='${A.id}' and deleted_at is null and auction_status='ended'`),
  upcoming: n(`select count(*) from cars where dealer_id='${A.id}' and deleted_at is null and auction_status='upcoming'`),
  validBidsLive: n(`select count(*) from bids where car_id='${live}' and status='paid'`),
  highestValid: n(`select coalesce(max(amount),0) from bids where car_id='${live}' and status='paid'`),
  outstandingInv: n(`select count(*) from dealer_teams where dealer='${A.id}' and status='invited' and (invite_expires_at is null or invite_expires_at>now())`),
};
const counts = () => ['cars', 'escrows', 'dealer_payouts', 'refunds', 'leads', 'marketplace_offers', 'bids', 'dealer_teams', 'ledger_entries', 'payments', 'audit_logs'].map((t) => `${t}=${q(`select count(*) from ${t}`)}`).join(',');
const before = counts();
const cc = (c, qs = '') => c.raw('/api/dealer-platform/command-centre' + qs);
const own = await cc(A); const d = own.j?.data;
check('owner: 200 with data', own.status === 200 && !!d, own);
const f = d?.financial || {};
check('revenue = SQL (released+closed dealer net)', f.releasedRevenue?.amount === truth.revenue, [f.releasedRevenue, truth.revenue]);
check('gross sales and fees = SQL, and gross = revenue + fees', f.grossSales?.amount === truth.gross && f.platformFees?.amount === truth.fees && truth.gross === truth.revenue + truth.fees, [f.grossSales, f.platformFees, truth]);
check('escrow held = SQL and is not in revenue', f.escrowHeld?.amount === truth.held && truth.held > 0, [f.escrowHeld, truth.held]);
check('completed payout = SQL paid', f.completedPayout?.amount === truth.paidOut, [f.completedPayout, truth.paidOut]);
check('pending payout = SQL', f.pendingPayout?.amount === truth.pendingPayout, [f.pendingPayout, truth.pendingPayout]);
check('pending payout split: not requested 1, in progress 1, failed 1', f.pendingPayout?.notRequested?.count === 1 && f.pendingPayout?.inProgress?.count === 1 && f.pendingPayout?.failed?.count === 1, f.pendingPayout);
check('reconciliation: revenue = paid + pending + closed-without-payout', f.releasedRevenue?.amount === f.completedPayout?.amount + f.pendingPayout?.amount + f.reconciliation?.closedWithoutPayout?.amount, f);
check('refunds = SQL; open refund counted', f.refunds?.amount === truth.refunds && f.refunds?.openCount === 1, [f.refunds, truth.refunds]);
check('transaction volume = SQL funded escrows', f.transactionVolume?.count === truth.volume, [f.transactionVolume, truth.volume]);
check('pending settlement = SQL (offer settlement + payment-due auction)', f.pendingSettlement?.amount === truth.settlement, [f.pendingSettlement, truth.settlement]);
check('receivables = held + pending payout', f.outstandingReceivables?.amount === truth.held + truth.pendingPayout, f.outstandingReceivables);
check('listings: active/pending/draft/sold = SQL (soft-deleted excluded)', d?.listings?.active === truth.active && d?.listings?.pendingApproval === truth.pending && d?.listings?.draft === truth.draft && d?.listings?.sold === truth.sold, [d?.listings, truth]);
check('leads: new/unanswered = SQL; offers awaiting decision = SQL', d?.leads?.newEnquiries === truth.newLeads && d?.leads?.unansweredLeads === truth.unanswered && d?.leads?.offersAwaitingDecision === truth.offers, [d?.leads, truth]);
check('auctions: active/upcoming = SQL; valid bids count only paid; highest valid bid ignores failed/pending/cancelled', d?.auctions?.active === truth.liveAuctions && d?.auctions?.upcoming === truth.upcoming && d?.auctions?.completed === truth.completed && truth.completed === 3 && d?.auctions?.live?.[0]?.validBids === truth.validBidsLive && d?.auctions?.live?.[0]?.highestValidBid === truth.highestValid && truth.highestValid === 900000, [d?.auctions, truth]);
check('auction outcomes needing attention = payment_due + defaulted', d?.auctions?.outcomesRequiringAttention === 2, d?.auctions);
check('team: outstanding invitations = SQL; activity names the real member', d?.team?.outstandingInvitations === truth.outstandingInv && d?.team?.activity?.some((a) => /marked a vehicle sold/.test(a.message)), [d?.team?.outstandingInvitations, truth.outstandingInv, d?.team?.activity]);
check('nothing in the overview is inferred from listing prices, offers or bids (listing price 9,999,999,999 absent)', !JSON.stringify({ f: d.financial, a: d.auctions, l: d.leads, p: d.pipeline }).includes('9999999999') && !JSON.stringify(d.financial).includes('9999999999'), 'a listing price may appear only as the price of that listing (top performers), never in a financial or auction figure');
const ids = (d?.attention || []).map((i) => i.id);
check('attention queue: items name real section destinations, critical first', (d?.attention || []).length >= 6 && d.attention.every((i) => ['leads', 'inventory', 'banking', 'escrow', 'auctions', 'team'].includes(i.target?.section) && i.count > 0) && d.attention[0].severity === 'critical', d?.attention);
check('attention queue has payout, dispute, offers, drafts, invitations, auction items', ['failed-payouts', 'disputed-escrows', 'offers-awaiting', 'draft-listings', 'team-invitations', 'auction-outcomes'].every((x) => ids.includes(x)), ids);

// ---------- role matrix (API-level) with consistency against the EXISTING route guards
const EXISTING = { inventory: '/api/dealer-platform/inventory', leads: '/api/dealer-platform/leads', revenue: '/api/dealer-platform/dashboard', team: '/api/dealer-platform/team', auctions: '/api/dealer-platform/auctions' };
const expected = { // section visibility per role
  manager: { listings: 1, leads: 1, financial: 1, team: 0, auctions: 1, owner: 0 },
  sales_agent: { listings: 1, leads: 1, financial: 0, team: 0, auctions: 1, owner: 0 },
  lot_agent: { listings: 1, leads: 0, financial: 0, team: 0, auctions: 1, owner: 0 },
  finance_officer: { listings: 0, leads: 0, financial: 1, team: 0, auctions: 0, owner: 0 },
};
const matrix = {};
for (const [role, u] of Object.entries(members)) {
  const r = await cc(u); const x = r.j?.data;
  matrix[role] = { status: r.status, sections: x ? Object.keys(x).filter((k) => ['listings', 'leads', 'financial', 'team', 'auctions'].includes(k)) : [] };
  if (role === 'viewer') { check('viewer -> 403 (no permission, as every other dealer route)', r.status === 403, r); continue; }
  const exp = expected[role] || (role === customKey ? { listings: 0, leads: 1, financial: 0, team: 1, auctions: 0 } : null);
  const got = { listings: !!x?.listings, leads: !!x?.leads, financial: !!x?.financial, team: !!x?.team, auctions: !!x?.auctions };
  check(`${role}: sections exactly as the permission matrix allows`, r.status === 200 && Object.entries(exp).every(([k, v]) => k === 'owner' || got[k] === !!v), { got, exp });
  check(`${role}: no escrow/payout/refund/fee/receivable figure and no outcomes in the payload`, !/escrowHeld|pendingPayout|completedPayout|platformFees|grossSales|outstandingReceivables|pendingSettlement|refunds|transactionVolume|escrowDisputed/.test(JSON.stringify(x)) && !x?.auctions?.outcomes, Object.keys(x?.financial || {}));
  const wider = [];
  for (const [section, url] of Object.entries(EXISTING)) { const ex = await u.raw(url); const sec = { inventory: got.listings, leads: got.leads, revenue: got.financial, team: got.team, auctions: got.auctions }[section]; if (sec && ex.status !== 200) wider.push(`${section}: shown but ${url} -> ${ex.status}`); }
  check(`${role}: never wider than the existing routes (every section shown is also reachable via its existing endpoint)`, wider.length === 0, wider);
  const ownerOnly = await u.raw('/api/dealer/escrows'); check(`${role}: existing owner-only escrow route still refuses (${ownerOnly.status})`, ownerOnly.status === 403, ownerOnly.status);
  check(`${role}: values equal the owner's for the sections shown`, (!got.listings || JSON.stringify(x.listings) === JSON.stringify(d.listings)) && (!got.financial || x.financial.releasedRevenue.amount === truth.revenue) && (!got.leads || x.leads.newEnquiries === truth.newLeads), role);
}
check('finance officer sees released revenue only', JSON.stringify(Object.keys((await cc(members.finance_officer)).j?.data?.financial || {})) === '["releasedRevenue"]');
check('attention queue for a sales agent contains only enquiry/offer/draft items', (await cc(members.sales_agent)).j.data.attention.every((i) => ['new-enquiries', 'unanswered-leads', 'offers-awaiting', 'draft-listings'].includes(i.id)));

// ---------- isolation
const bres = await cc(Bd); const bd = bres.j?.data;
check('dealership B sees only its own figures (revenue 94,050,000, 4 listings + 1 auction car), none of A', bd?.financial?.releasedRevenue?.amount === 94050000 && bd?.listings?.active === 5 && bd?.leads?.newEnquiries === 4 && ![String(truth.revenue), String(truth.gross), String(truth.held), '4300000', '1500000'].some((v) => JSON.stringify({ f: bd.financial, l: bd.listings, a: bd.auctions }).includes(v)), { f: bd?.financial, l: bd?.listings, lead: bd?.leads });
const spoof = await cc(members.manager, `?dealerId=${Bd.id}&dealer=${Bd.id}`);
const spoof2 = await members.manager.raw('/api/dealer-platform/command-centre', { headers: { 'x-dealer-id': Bd.id } });
check('a member of A cannot address B by query or header (response unchanged, still A)', spoof.status === 200 && spoof.j.data.financial.releasedRevenue.amount === truth.revenue && spoof2.j?.data?.financial?.releasedRevenue?.amount === truth.revenue, [spoof.status, spoof2.status]);
const cres = await cc(C); const cd = cres.j?.data;
check('empty dealership: real zeros, no queue, no invented figures', cres.status === 200 && cd.financial.releasedRevenue.amount === 0 && cd.financial.pendingPayout.amount === 0 && cd.listings.total === 0 && cd.attention.length === 0 && cd.auctions.active === 0, cd);
check('anonymous -> 401', (await fetch(B + '/api/dealer-platform/command-centre')).status === 401);
check('personal account that is not a member -> 403', (await cc(stranger)).status === 403);
check('buyer role account -> 403', (await cc(buyer)).status === 403);
// ---------- team-member overview: own activity only, ambiguity, session revocation, suspension
const ev = (actor, type, action) => seed(`insert into dealer_listing_lifecycle_events(car_id,dealer_id,actor_user_id,actor_type,action,previous_status,next_status) values ('${live}','${A.id}','${actor}','${type}','${action}','available','hidden')`);
ev(members.manager.id, 'dealer_staff', 'dealer_hide'); ev(members.manager.id, 'dealer_staff', 'dealer_publish'); ev(members.lot_agent.id, 'dealer_staff', 'dealer_hide'); ev(A.id, 'dealer_owner', 'dealer_mark_sold');
const mgr = (await cc(members.manager)).j.data, lot = (await cc(members.lot_agent)).j.data, own2 = (await cc(A)).j.data, fin2 = (await cc(members.finance_officer)).j.data, sales2 = (await cc(members.sales_agent)).j.data;
// the manager already has 1 attributed event from the team-feed seed above (dealer_mark_sold) + the 2 added here = 3; the lot agent's hide and the OWNER's mark-sold must not appear
check('manager sees exactly their own 3 activity rows (not the lot agent\'s or the owner\'s)', Array.isArray(mgr.myActivity) && mgr.myActivity.length === 3 && ['dealer_hide','dealer_publish','dealer_mark_sold'].every((a) => mgr.myActivity.some((x) => x.action === a)), mgr.myActivity);
check('owner-authored event (same action name) is excluded from the manager\'s list', q(`select count(*) from dealer_listing_lifecycle_events where dealer_id='${A.id}' and action='dealer_mark_sold'`) === '2' && mgr.myActivity.filter((x) => x.action === 'dealer_mark_sold').length === 1);
check('lot agent sees exactly their own 1 activity row', lot.myActivity?.length === 1 && lot.myActivity[0].action === 'dealer_hide', lot.myActivity);
check('a member without listing permissions gets no activity key; a sales agent with none recorded gets an empty list; the owner uses the team feed instead', fin2.myActivity === undefined && Array.isArray(sales2.myActivity) && sales2.myActivity.length === 0 && own2.myActivity === undefined);
check('member responses never contain other members\' ids or the owner id in activity', !JSON.stringify(lot.myActivity).includes(members.manager.id) && !JSON.stringify(mgr.myActivity).includes(members.lot_agent.id));
// ambiguous membership (active in two dealerships) fails closed
seed(`insert into dealer_teams(dealer,member,role,status,invite_email,invited_by) values ('${Bd.id}','${members.viewer.id}','viewer','active','ambiguity-${uid()}@example.test','${Bd.id}')`);
check('active membership in TWO dealerships fails closed (403), never picks one', (await cc(members.viewer)).status === 403);
q(`delete from dealer_teams where dealer='${Bd.id}' and member='${members.viewer.id}'`);
// suspended membership
q(`update dealer_teams set status='suspended' where member='${members.lot_agent.id}'`);
check('a suspended member is refused on the very next request', (await cc(members.lot_agent)).status === 403);
q(`update dealer_teams set status='active' where member='${members.lot_agent.id}'`);
// session revocation: logout replay and revoke-all
{ const m = members.finance_officer; const keep = new (m.constructor)(); Object.assign(keep.jar, m.jar);
  check('before logout the finance officer session reads the endpoint', (await cc(keep)).status === 200);
  const lo = await m.raw('/api/v1/auth/logout', { method: 'POST' });
  check('after logout, replaying the old cookies is refused (401)', lo.status < 300 && (await cc(keep)).status === 401, lo.status); }
{ const m = members.manager; const old = new (m.constructor)(); Object.assign(old.jar, m.jar);
  const ra = await m.raw('/api/v1/auth/sessions/revoke-all', { method: 'POST' });
  check('after revoke-all the member\'s OLD session is refused immediately (401)', ra.status < 300 && (await cc(old)).status === 401, ra.status); }
// the owner of A cannot read B by any client-supplied id either
check('owner of A with a spoofed dealer id still receives A only', (await cc(A, `?dealerId=${Bd.id}`)).j.data.financial.releasedRevenue.amount === truth.revenue);
q(`update dealer_teams set status='removed' where member='${members.sales_agent.id}'`);
check('removing a member cuts access on the very next request', (await cc(members.sales_agent)).status === 403);
check('command centre is private and uncached', (own.headers.get('cache-control') || '').includes('no-store'));
check('read-only: no table changed after all command-centre calls', counts().replace(/dealer_teams=\d+/, '') === before.replace(/dealer_teams=\d+/, ''), [before, counts()]);

fs.mkdirSync(path.resolve(here, 'out'), { recursive: true });
fs.writeFileSync(path.resolve(here, 'out/dealer-command-centre.json'), JSON.stringify({ truth, ownerFinancial: f, roleMatrix: matrix, owner: d }, null, 1));
finish('18_dealer_command_centre');
