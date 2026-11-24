// Super Admin Console journey (KAYARD KE). Over real HTTP against the disposable DB it proves:
//  - /admin/stats activeStaff counts KAYARD platform staff only (not banned; never dealer-team members, dealers or personal accounts) and equals the database;
//  - the backend (not the UI) refuses the admin APIs to personal accounts, dealers and dealer team staff, and refuses Super Admin-only staff management to an ordinary platform staff role;
//  - Personal Accounts: an admin can block and restore a unified personal account; the account keeps its records (nothing is deleted);
//  - the legacy private-seller review endpoint cannot be used to re-introduce an approval gate while the policy is open;
//  - revoking dealership membership does not delete the personal account.
import crypto from 'node:crypto';
import { makeUser, q, check, finish, uid, PW } from './lib.mjs';

const owner = async () => { const a = await makeUser({ tag: 'adm26', dbRole: 'superadmin' }); q(`update users set email='prev-owner-'||id||'@example.test' where email='ci-owner@example.test'`); q(`update users set email='ci-owner@example.test' where id='${a.id}'`); a.csrf = null; await a.raw('/api/v1/auth/login', { method: 'POST', body: { email: 'ci-owner@example.test', password: PW } }); a.csrf = null; return a; };
const dealerOf = (tag) => makeUser({ tag, role: 'dealer', extra: { businessName: `Console ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
const STAFF = "('admin','superadmin','marketing','technical_support','hr','accounts','escrow_officer','ad_manager','moderator','ghost_checker')";

const own = await owner();
const moderator = await makeUser({ tag: 'mod26', dbRole: 'moderator' });
const personal = await makeUser({ tag: 'per26' });
const dealer = await dealerOf('dl26'); q(`update users set status='approved' where id='${dealer.id}'`); q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${dealer.id}'`);
await dealer.raw('/api/v1/auth/login', { method: 'POST', body: { email: dealer.email, password: PW } }); dealer.csrf = null;

// dealer team member (viewer) - a dealer-controlled identity, NOT platform staff
const member = await makeUser({ tag: 'tm26' });
const inv = await dealer.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: member.email, role: 'viewer' } });
const tok = crypto.randomBytes(32).toString('hex'); q(`update dealer_teams set invite_token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}' where invite_email='${member.email}'`);
const acc = await member.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } });
check('setup: dealer invited and enrolled a team member', [200, 201].includes(inv.status) && [200, 201].includes(acc.status), [inv.status, acc.status]);

// ---- 1. activeStaff is authoritative and scoped
const s1 = await own.raw('/api/admin/stats');
const dbStaff = Number(q(`select count(*) from users where role in ${STAFF} and is_banned=false`));
check('1. /admin/stats returns activeStaff equal to the database count of non-banned platform staff', s1.status === 200 && s1.j?.stats?.activeStaff === dbStaff && dbStaff >= 2, [s1.status, s1.j?.stats?.activeStaff, dbStaff]);
check('1. activeStaff is not listed as unavailable when readable', !(s1.j?.unavailable || []).includes('activeStaff'), s1.j?.unavailable);
const dbAll = Number(q(`select count(*) from users`));
check('1. activeStaff is a subset: dealers, personal accounts and dealer team members are not counted', s1.j.stats.activeStaff < dbAll && s1.j.stats.totalUsers === dbAll, [s1.j.stats.activeStaff, s1.j.stats.totalUsers, dbAll]);
const modBefore = (await moderator.raw('/api/admin/stats')).j?.stats?.activeStaff; // (the not-banned filter is asserted in stage5f5AdminStatsContract; /admin/stats is cached so a live ban flip is not observable here)
check('1. ordinary platform staff can read the dashboard stats (any-staff gate)', typeof modBefore === 'number', modBefore);

// ---- 2. backend refuses non-staff identities (not UI hiding)
for (const [label, who] of [['personal account', personal], ['dealer owner', dealer], ['dealer team staff', member]]) {
  const st = await who.raw('/api/admin/stats'); const us = await who.raw('/api/admin/users'); const sf = await who.raw('/api/admin/staff');
  check(`2. ${label} is refused /admin/stats, /admin/users and /admin/staff by the server`, [st.status, us.status, sf.status].every((c) => c === 401 || c === 403), [st.status, us.status, sf.status]);
}
// ---- 3. Super Admin-only staff management refused to ordinary platform staff
const sfMod = await moderator.raw('/api/admin/staff'); const permMod = await moderator.raw('/api/admin/staff/permissions/catalog');
check('3. a moderator cannot list staff or read the permission catalogue (Super Admin only)', sfMod.status === 403 && permMod.status === 403, [sfMod.status, permMod.status]);
const grant = await moderator.raw(`/api/admin/staff/${moderator.id}/permissions`, { method: 'PUT', body: { granted: ['manage_platform'], revoked: [] } });
check('3. a moderator cannot grant themselves permissions', grant.status === 403, grant.status);
const sfOwn = await own.raw('/api/admin/staff');
check('3. the Super Admin owner can list platform staff and the list contains no dealer team member or dealer', sfOwn.status === 200 && !JSON.stringify(sfOwn.j).includes(member.email) && !JSON.stringify(sfOwn.j).includes(dealer.email), sfOwn.status);

// ---- 4. dealer membership never confers platform privilege; revoking membership keeps the personal account
const roleBefore = q(`select role from users where id='${member.id}'`);
check('4. enrolling as dealer staff leaves the personal role unchanged (no platform role)', roleBefore === 'user', roleBefore);
const mid = q(`select id from dealer_teams where invite_email='${member.email}' order by created_at desc limit 1`);
const rev = await dealer.raw(`/api/dealer-platform/team/${mid}`, { method: 'DELETE' });
check('4. the dealer owner can remove the member', [200, 204].includes(rev.status), rev.status);
check('4. removing membership does not delete the personal account', q(`select count(*) from users where id='${member.id}'`) === '1' && q(`select role from users where id='${member.id}'`) === 'user', 'deleted?');

// ---- 5. Personal Accounts: block and restore, nothing deleted
const carsBefore = q(`select count(*) from cars where dealer_id='${personal.id}'`);
const ban = await own.raw(`/api/admin/users/${personal.id}/toggle-ban`, { method: 'POST', body: { banned: true, reason: 'Console journey' } });
check('5. admin blocks a personal account', ban.status === 200 && q(`select is_banned from users where id='${personal.id}'`) === 't', [ban.status, ban.j]);
const relog = await personal.raw('/api/v1/auth/login', { method: 'POST', body: { email: personal.email, password: PW } });
check('5. the blocked personal account cannot sign in', relog.status >= 400, relog.status);
const unb = await own.raw(`/api/admin/users/${personal.id}/toggle-ban`, { method: 'POST', body: { banned: false } });
check('5. admin restores the account', unb.status === 200 && q(`select is_banned from users where id='${personal.id}'`) === 'f', unb.status);
check('5. the account and its records are unchanged by block/restore', q(`select count(*) from users where id='${personal.id}'`) === '1' && q(`select count(*) from cars where dealer_id='${personal.id}'`) === carsBefore, 'changed');
const lst = await own.raw('/api/admin/users?role=user&limit=100');
check('5. the admin user list shows the personal account with role user', lst.status === 200 && (lst.j?.users || []).some((u) => (u.id || u._id) === personal.id && u.role === 'user'), lst.status);

await personal.raw('/api/v1/auth/login', { method: 'POST', body: { email: personal.email, password: PW } }); personal.csrf = null; // the block revoked the old session; sign in again after restore
// ---- 6. the open seller policy cannot be bypassed through the legacy review endpoint
const apply = await personal.raw('/api/private-seller-capability/apply', { method: 'POST', body: { contactPhone: '254700000001', acceptTerms: true } });
check('6. applying to sell is refused as unnecessary while selling is open (no approval gate)', apply.status === 409 && apply.j?.code === 'SELLER_APPROVAL_NOT_REQUIRED', [apply.status, apply.j?.code]);
const lApps = await own.raw('/api/private-seller-capability/admin/applications');
check('6. the Personal Accounts review list remains readable for restriction history', lApps.status === 200, lApps.status);
const lAppsMod = await personal.raw('/api/private-seller-capability/admin/applications');
check('6. a personal account cannot read the review list', [401, 403].includes(lAppsMod.status), lAppsMod.status);

finish('26_admin_console');
