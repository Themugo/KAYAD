// Convergence journey: bulk inventory actions (per-record authorisation) and temporary duties (time-boxed, never changing the role).
import crypto from 'node:crypto';
import { makeUser, q, check, finish, uid, PW } from './lib.mjs';

const mkDealer = async (tag) => { const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `Launch ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } }); q(`update users set status='approved' where id='${d.id}'`); q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`); return d; };
const car = (d, title) => q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold,images) values ('${title}','Mazda','CX-5',2019,3000000,'available','${d.id}',false,'[]'::jsonb) returning id`).split('\n')[0];
const join = async (owner, roleKey, tag) => { const u = await makeUser({ tag }); const inv = await owner.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: u.email, role: roleKey } }); if (inv.status >= 300) throw new Error(`invite ${roleKey} ${inv.status}`); const tok = crypto.randomBytes(32).toString('hex'); q(`update dealer_teams set invite_token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}' where invite_email='${u.email}'`); const ac = await u.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } }); if (ac.status >= 300) throw new Error(`accept ${roleKey} ${ac.status}`); return u; };

const A = await mkDealer('ta'), Bd = await mkDealer('tb');
const staff = await join(A, 'viewer', 'tstaff');
const mgr = await join(A, 'manager', 'tmgr').catch(() => null);
const memberId = q(`select id from dealer_teams where member='${staff.id}' and dealer='${A.id}'`);
const c1 = car(A, 'Duty car 1'), c2 = car(A, 'Duty car 2'), c3 = car(A, 'Duty car 3'), foreign = car(Bd, 'Other dealer car');
const status = (id) => q(`select coalesce(deleted_at::text,'live') from cars where id='${id}'`);

// 1. without a duty the delete-less member is refused by the backend
const r0 = await staff.raw('/api/dealer-platform/inventory/bulk-delete', { method: 'POST', body: { ids: [c1] } });
check('member without canDeleteCars is refused bulk delete (backend)', r0.status === 403 && status(c1) === 'live', [r0.status, r0.j?.code]);

// 2. grant validation
const soon = new Date(Date.now() + 3600e3).toISOString();
const g = (body, who = A) => who.raw(`/api/dealer-platform/team/${memberId}/temporary-duties`, { method: 'POST', body });
const gv1 = await g({ permissions: ['canManageTeam'], expiresAt: soon });
check('team management cannot be lent temporarily', gv1.status === 400 && gv1.j?.code === 'DUTY_PERMISSION_NOT_ALLOWED', [gv1.status, gv1.j]);
const gv2 = await g({ permissions: ['canDeleteCars'] });
check('an expiry is mandatory', gv2.status === 400 && gv2.j?.code === 'DUTY_EXPIRY_REQUIRED', [gv2.status, gv2.j]);
const gv3 = await g({ permissions: ['canDeleteCars'], expiresAt: new Date(Date.now() - 60e3).toISOString() });
check('an expiry in the past is refused', gv3.status === 400 && gv3.j?.code === 'DUTY_EXPIRY_PAST', [gv3.status, gv3.j]);
const gv4 = await g({ permissions: ['canDeleteCars'], expiresAt: new Date(Date.now() + 200 * 86400e3).toISOString() });
check('more than 90 days is refused', gv4.status === 400 && gv4.j?.code === 'DUTY_TOO_LONG', [gv4.status, gv4.j]);
const gStaff = await g({ permissions: ['canChatBuyers'], expiresAt: soon }, staff);
check('staff without team management cannot grant duties', gStaff.status === 403, gStaff.status);
const gForeign = await g({ permissions: ['canChatBuyers'], expiresAt: soon }, Bd);
check("another dealership cannot grant duties on this dealership's member", gForeign.status === 404, gForeign.status);
if (mgr) { const mm = q(`select id from dealer_teams where member='${mgr.id}' and dealer='${A.id}'`); const self = await mgr.raw(`/api/dealer-platform/team/${mm}/temporary-duties`, { method: 'POST', body: { permissions: ['canChatBuyers'], expiresAt: soon } }); check('nobody can grant duties to themselves', self.status === 403, [self.status, self.j?.code]); }

// 3. grant -> effective immediately, role unchanged
const roleBefore = q(`select role||'|'||permissions::text from dealer_teams where id='${memberId}'`);
const gok = await g({ permissions: ['canDeleteCars'], expiresAt: soon, reason: 'Covering inventory while Jane is on leave' });
check('owner lends canDeleteCars for a limited time', gok.status === 201, [gok.status, gok.j]);
const grantId = gok.j?.data?.id;
check("the member's role and stored permissions are NOT changed", q(`select role||'|'||permissions::text from dealer_teams where id='${memberId}'`) === roleBefore, 'role changed');
const view = await A.raw(`/api/dealer-platform/team/${memberId}/temporary-duties`);
check('owner sees role, temporary and effective permissions', view.status === 200 && view.j?.data?.temporaryPermissions?.includes('canDeleteCars') && view.j?.data?.effectivePermissions?.includes('canDeleteCars') && !view.j?.data?.rolePermissions?.includes('canDeleteCars'), view.j);

// 4. bulk delete with per-record authorisation and itemised partial failure
const r1 = await staff.raw('/api/dealer-platform/inventory/bulk-delete', { method: 'POST', body: { ids: [c1, c2, foreign, '00000000-0000-0000-0000-000000000000'] } });
check('with the duty, bulk delete removes only this dealership\'s vehicles', r1.status === 200 && r1.j?.data?.deleted === 2 && status(c1) !== 'live' && status(c2) !== 'live', [r1.status, r1.j]);
check("another dealership's vehicle is reported as not found and left untouched", status(foreign) === 'live' && (r1.j?.data?.skipped || []).some((s) => s.id === foreign && s.code === 'NOT_FOUND'), r1.j);
check('the failure list is itemised (unknown id too)', (r1.j?.data?.skipped || []).length === 2, r1.j?.data);
const over = await staff.raw('/api/dealer-platform/inventory/bulk-delete', { method: 'POST', body: { ids: Array.from({ length: 51 }, (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`) } });
check('more than 50 selected is refused', over.status === 400 && over.j?.code === 'BULK_LIMIT', [over.status, over.j?.code]);
const noEdit = await staff.raw('/api/dealer-platform/inventory/bulk', { method: 'POST', body: { ids: [c3], action: 'status', data: { status: 'hidden' } } });
check('a lent delete duty does not allow status changes (needs canEditCars)', noEdit.status === 403, [noEdit.status, noEdit.j?.code]);
check('the other dealership owner cannot bulk delete these either', (await Bd.raw('/api/dealer-platform/inventory/bulk-delete', { method: 'POST', body: { ids: [c3] } })).j?.data?.deleted === 0 && status(c3) === 'live', 'c3 touched');

// 5. revoke, then expiry (the create limiter is a real 10/min control, so wait for its window instead of weakening it)
await new Promise((r) => setTimeout(r, 61000));
const rv = await A.raw(`/api/dealer-platform/team/${memberId}/temporary-duties/${grantId}`, { method: 'DELETE' });
check('owner revokes the duty', rv.status === 200 && rv.j?.changed === true, rv.j);
const r2 = await staff.raw('/api/dealer-platform/inventory/bulk-delete', { method: 'POST', body: { ids: [c3] } });
check('after revoke the member is refused again and the vehicle is intact', r2.status === 403 && status(c3) === 'live', r2.status);
const g2 = await g({ permissions: ['canDeleteCars'], expiresAt: soon });
q(`update dealer_team_temporary_grants set starts_at=now()-interval '2 hours', expires_at=now()-interval '1 hour' where id='${g2.j?.data?.id}'`);
const r3 = await staff.raw('/api/dealer-platform/inventory/bulk-delete', { method: 'POST', body: { ids: [c3] } });
check('an expired duty stops working with no job or action', r3.status === 403 && status(c3) === 'live', r3.status);
const v2 = await A.raw(`/api/dealer-platform/team/${memberId}/temporary-duties`);
check('history shows revoked and expired states', ['revoked', 'expired'].every((s) => (v2.j?.data?.grants || []).some((x) => x.state === s)), v2.j?.data?.grants?.map((x) => x.state));
check('grant and revoke are in the employment record', Number(q(`select count(*) from dealer_employment_events where team_id='${memberId}' and event_type in ('temporary_duty_granted','temporary_duty_revoked')`)) >= 3, 'events missing');

// 6. offboarding ends everything
const g3 = await g({ permissions: ['canDeleteCars'], expiresAt: soon });
await A.raw(`/api/dealer-platform/team/${memberId}`, { method: 'PUT', body: { status: 'removed', reason: 'left' } });
const r4 = await staff.raw('/api/dealer-platform/inventory/bulk-delete', { method: 'POST', body: { ids: [c3] } });
check('a removed member keeps no access even with an unexpired duty', r4.status === 403 && status(c3) === 'live', r4.status);
finish('temporary duties and bulk actions');
