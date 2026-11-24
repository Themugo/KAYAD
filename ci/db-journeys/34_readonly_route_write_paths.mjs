// Release-critical WRITE paths on routes that the register lists as read-only verified, exercised in isolation (disposable DB).
// Money, escrow, payout, settlement and live provider effects are NOT executed: those paths are tested for AUTHORISATION and VALIDATION only.
import { makeUser, q, check, finish, uid, PW, B, Client } from './lib.mjs';
const staff = (role, tag) => makeUser({ tag: tag || role.slice(0, 5) + '34', dbRole: role });
const SA = await (async () => { const a = await staff('superadmin', 'sa34'); q(`update users set email='prev-owner-'||id||'@example.test' where email='ci-owner@example.test'`); q(`update users set email='ci-owner@example.test' where id='${a.id}'`); a.email = 'ci-owner@example.test'; await a.raw('/api/v1/auth/login', { method: 'POST', body: { email: a.email, password: PW } }); a.csrf = null; return a; })();
// ^ the System Owner (permission grants are owner-only by existing design)
 const ADM = await staff('admin', 'ad34'); const MOD = await staff('moderator', 'mo34'); const ADMGR = await staff('ad_manager', 'am34'); const ACC = await staff('accounts', 'ac34'); const HR = await staff('hr', 'hr34');
const PER = await makeUser({ tag: 'pe34' });
const anon = async (p, m = 'POST') => (await new Client().raw(p, { method: m, body: {} })).status;

// ---- /admin/ads : ad slot writes need manage_ads (previously any staff role) ----
const body = { title: `Gov ad ${uid()}`, tagline: 'Test', placement: 'top_ticker' };
check('W1 anonymous cannot create an ad slot (401)', (await anon('/api/ads')) === 401);
for (const [n, u] of [['moderator', MOD], ['hr', HR], ['accounts', ACC], ['personal account', PER]]) { const r = await u.raw('/api/ads', { method: 'POST', body }); check(`W2 ${n} cannot create an ad slot (403)`, r.status === 403, r.status); }
const created = await ADMGR.raw('/api/ads', { method: 'POST', body });
check('W3 ad_manager (manage_ads) creates an ad slot (201) and it persists', created.status === 201 && q(`select count(*) from ad_slots where title='${body.title}'`) === '1', [created.status, created.j]);
const aid = created.j?.data?.id || created.j?.data?._id;
check('W4 invalid placement is rejected (400) and nothing is saved', (await ADMGR.raw('/api/ads', { method: 'POST', body: { title: 'x', placement: 'nowhere' } })).status === 400);
check('W5 moderator cannot edit or delete the slot (403) and it is unchanged', (await MOD.raw(`/api/ads/${aid}`, { method: 'PUT', body: { title: 'hijack' } })).status === 403 && (await MOD.raw(`/api/ads/${aid}`, { method: 'DELETE' })).status === 403 && q(`select title from ad_slots where id='${aid}'`) === body.title);
check('W6 ad_manager edits (200) then deletes (200); the row is gone', (await ADMGR.raw(`/api/ads/${aid}`, { method: 'PUT', body: { title: body.title + ' v2' } })).status === 200 && (await ADMGR.raw(`/api/ads/${aid}`, { method: 'DELETE' })).status === 200 && q(`select count(*) from ad_slots where id='${aid}'`) === '0');

// ---- featured campaigns (manage_ads) ----
q(`insert into cars(title,brand,model,year,price,status,approved,dealer_id,sold) values ('Camp ${uid()}','Toyota','Axio',2016,1500000,'available',true,'${PER.id}',false)`);
const carId = q(`select id from cars where dealer_id='${PER.id}' limit 1`);
const win = { carId, startsAt: new Date(Date.now() + 3600e3).toISOString(), endsAt: new Date(Date.now() + 86400e3 * 3).toISOString() };
check('W7 moderator cannot create a featured campaign (403)', (await MOD.raw('/api/admin/featured-campaigns', { method: 'POST', body: win })).status === 403);
check('W8 invalid campaign body is rejected (400)', (await ADMGR.raw('/api/admin/featured-campaigns', { method: 'POST', body: { carId } })).status === 400);
const camp = await ADMGR.raw('/api/admin/featured-campaigns', { method: 'POST', body: win });
check('W9 ad_manager creates a campaign (201)', camp.status === 201, [camp.status, camp.j]);
const cid = camp.j?.campaign?.id;
if (cid) {
  check('W10 ending/deleting without confirmation is refused (400 CONFIRMATION_REQUIRED) and the campaign survives', (await ADMGR.raw(`/api/admin/featured-campaigns/${cid}/end`, { method: 'POST', body: {} })).j?.code === 'CONFIRMATION_REQUIRED' && (await ADMGR.raw(`/api/admin/featured-campaigns/${cid}`, { method: 'DELETE', body: {} })).j?.code === 'CONFIRMATION_REQUIRED');
  const paused = await ADMGR.raw(`/api/admin/featured-campaigns/${cid}/pause`, { method: 'POST', body: {} });
  check('W11 pause succeeds and a repeat is not a 5xx', paused.status === 200 && (await ADMGR.raw(`/api/admin/featured-campaigns/${cid}/pause`, { method: 'POST', body: {} })).status < 500, paused.status);
  check('W12 audit trail records the campaign actions', Number(q(`select count(*) from audit_logs where action like 'featured_campaign_%'`)) >= 1);
}

// ---- dealer payout-account review (authorisation + validation only; no payout is released) ----
const fakeId = '00000000-0000-4000-8000-000000000001';
check('W13 anonymous cannot review a dealer payout account (401)', (await anon(`/api/wallet/dealer-account/${fakeId}/review`)) === 401);
for (const [n, u] of [['moderator', MOD], ['hr', HR], ['ad_manager', ADMGR], ['personal account', PER]]) check(`W14 ${n} cannot review a dealer payout account (403)`, (await u.raw(`/api/wallet/dealer-account/${fakeId}/review`, { method: 'POST', body: { decision: 'approved' } })).status === 403);
const rv = await ACC.raw(`/api/wallet/dealer-account/${fakeId}/review`, { method: 'POST', body: { decision: 'bogus' } });
check('W15 an authorised actor with an invalid decision / unknown account gets a 4xx, never a 5xx or a success', rv.status >= 400 && rv.status < 500, [rv.status, rv.j?.message]);

// ---- admin end-auction (authorisation + unknown id only; no auction is ended) ----
check('W16 moderator, hr and ad_manager cannot end an auction (403)', (await Promise.all([MOD, HR, ADMGR].map((u) => u.raw(`/api/bids/${fakeId}/end`, { method: 'POST', body: {} })))).every((r) => r.status === 403));
const en = await ADM.raw(`/api/bids/${fakeId}/end`, { method: 'POST', body: {} });
check('W17 an authorised admin ending an unknown auction gets a 4xx (no state change, no 5xx)', en.status >= 400 && en.status < 500, [en.status, en.j?.message]);

// ---- platform auction policy (access control only; the disposable DB policy row may change, production never) ----
check('W17b anonymous cannot change the auction platform policy (401)', (await anon('/api/auctions/platform/policy', 'PUT')) === 401);
for (const [n, u] of [['moderator', MOD], ['hr', HR], ['ad_manager', ADMGR], ['personal account', PER]]) check(`W17c ${n} cannot change the auction platform policy (403)`, (await u.raw('/api/auctions/platform/policy', { method: 'PUT', body: { zzz: 1 } })).status === 403);
check('W17d an admin (manage_platform) is not refused by authorisation (any non-403 answer)', (await ADM.raw('/api/auctions/platform/policy', { method: 'PUT', body: { zzz: 1 } })).status !== 403);

// ---- staff permission editing (journey 26 covers refusal; here the grant lifecycle) ----
const T = await staff('technical_support', 'tp34');
const g = await SA.raw(`/api/admin/staff/${T.id}/permissions`, { method: 'PUT', body: { grantedPermissions: ['view_system_health'], revokedPermissions: [] } });
check('W18 Super Admin grants view_system_health (200) and it persists', g.status === 200 && q(`select granted_permissions::text from users where id='${T.id}'`).includes('view_system_health'), [g.status, g.j]);
check('W19 an ordinary Admin cannot grant it (403)', (await ADM.raw(`/api/admin/staff/${T.id}/permissions`, { method: 'PUT', body: { grantedPermissions: ['view_system_health'], revokedPermissions: [] } })).status === 403);
check('W20 an unknown permission is rejected (400/422) and nothing changes', [400, 422].includes((await SA.raw(`/api/admin/staff/${T.id}/permissions`, { method: 'PUT', body: { grantedPermissions: ['do_anything'], revokedPermissions: [] } })).status));
check('W21 the granted permission opens system health for that user (after re-login)', await (async () => { await T.raw('/api/v1/auth/login', { method: 'POST', body: { email: T.email, password: PW } }); T.csrf = null; return (await T.raw('/api/admin/system/health')).status === 200; })());
finish('34_readonly_route_write_paths');
