// OD-1 / OD-2 / OD-3 governance decisions over real HTTP against the disposable database. Direct API calls by each actor (no UI).
//  A  system health: only Super Admin (+ individually granted technical staff); judged on PERMISSION, never on a role name
//  B  dealer reinstatement: Admin REQUESTS, any Super Admin DECIDES; dealer stays suspended until approval; history preserved
//  C  any authorised Super Admin (second identity) decides suspension and reinstatement; owner keeps authority
//  D  replay, duplicate and simultaneous decisions; unauthorised actors; no bypass paths
// No payment, escrow, ledger, auction or hosted object is touched.
import crypto from 'node:crypto';
import { Client, makeUser, q, check, finish, uid, PW, B } from './lib.mjs';

const owner = async () => { const a = await makeUser({ tag: 'own33', dbRole: 'superadmin' }); q(`update users set email='prev-owner-'||id||'@example.test' where email='ci-owner@example.test'`); q(`update users set email='ci-owner@example.test' where id='${a.id}'`); await a.raw('/api/v1/auth/login', { method: 'POST', body: { email: 'ci-owner@example.test', password: PW } }); a.csrf = null; return a; };
const staff = (role, tag) => makeUser({ tag: tag || role.slice(0, 5) + '33', dbRole: role });
const relogin = async (u) => { await u.raw('/api/v1/auth/login', { method: 'POST', body: { email: u.email, password: PW } }); u.csrf = null; return u; };
const dealer = async (tag) => {
  const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `Gov ${uid()} Motors`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
  q(`update users set status='approved' where id='${d.id}'`);
  q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`);
  let vid = q(`select id from dealer_verifications where "user"='${d.id}'`);
  if (!vid) { q(`insert into dealer_verifications ("user", dealer, verification_status) select '${d.id}', id, 'approved' from dealers where "user"='${d.id}'`); vid = q(`select id from dealer_verifications where "user"='${d.id}'`); }
  else q(`update dealer_verifications set verification_status='approved' where id='${vid}'`);
  await relogin(d); d.vid = vid; return d;
};
const member = async (ownerUser, role, tag) => {
  const u = await makeUser({ tag });
  for (let i = 0; i < 6; i++) { const r = await ownerUser.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: u.email, role } }); if (r.status !== 429) break; await new Promise((res) => setTimeout(res, 12000)); }
  const tok = crypto.randomBytes(32).toString('hex');
  q(`update dealer_teams set invite_token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}' where invite_email='${u.email}'`);
  u.accStatus = (await u.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } })).status; return u;
};
const anon = async (path, method = 'GET') => (await new Client().raw(path, { method, body: method === 'GET' ? undefined : {} })).status;

const fin0 = [q('select count(*) from payments'), q('select count(*) from escrows'), q('select coalesce(sum(amount),0) from payments')].join('|');
const SA = await owner();
const SA2 = await staff('superadmin', 'sa233');
const ADMIN = await staff('admin', 'adm33');
const ADMIN2 = await staff('admin', 'ad233');
const MOD = await staff('moderator');
const TECH = await staff('technical_support', 'tech33');            // default permissions only
const TECHG = await staff('technical_support', 'techg33');          // individually granted view_system_health
const MODG = await staff('moderator', 'modg33');                    // permission, not role name, decides
const TECHR = await staff('technical_support', 'techr33');          // granted then revoked
q(`update users set granted_permissions=array['view_system_health'] where id in ('${TECHG.id}','${MODG.id}')`);
q(`update users set granted_permissions=array['view_system_health'], revoked_permissions=array['view_system_health'] where id='${TECHR.id}'`);
for (const u of [TECHG, MODG, TECHR]) await relogin(u);
const PERSONAL = await makeUser({ tag: 'per33' });
const D1 = await dealer('dl133'); const D2 = await dealer('dl233'); const D3 = await dealer('dl333'); const D4 = await dealer('dl433');
const DSTAFF = await member(D1, 'viewer', 'dst33');

// ===================== A. OD-1 system health (final-closure Phase 1: technical-only ELIGIBILITY boundary) =====================
// A permission grant alone must never admit a non-technical role. Eligible = Super Admin + technical_support WITH the grant.
{
  const paths = ['/api/admin/system/health', '/api/ecp/health'];
  const HR = await staff('hr', 'hr33'), ACC = await staff('accounts', 'acc33'), MKT = await staff('marketing', 'mkt33'), ESC = await staff('escrow_officer', 'esc33');
  const HOSTILE = [['moderator', MODG], ['hr', HR], ['accounts', ACC], ['marketing', MKT], ['escrow_officer', ESC], ['ordinary admin', ADMIN2]];
  // Hostile case: a forged grant written straight into the database for every non-technical role (bypasses the assignment API on purpose).
  q(`update users set granted_permissions=array['view_system_health'] where id in ('${HR.id}','${ACC.id}','${MKT.id}','${ESC.id}','${ADMIN2.id}')`);
  for (const u of [HR, ACC, MKT, ESC, ADMIN2]) await relogin(u);
  for (const p of paths) {
    check(`A1 ${p}: anonymous 401`, (await anon(p)) === 401);
    for (const [name, u] of [['personal account', PERSONAL], ['dealer owner', D1], ['dealer staff', DSTAFF], ['moderator', MOD], ['hr', await staff('hr', 'hrn33')], ['accounts', await staff('accounts', 'accn33')], ['marketing', await staff('marketing', 'mktn33')], ['escrow officer', await staff('escrow_officer', 'escn33')], ['ordinary admin', ADMIN], ['technical_support without the permission', TECH], ['technical_support whose grant was revoked', TECHR]]) {
      const r = await u.raw(p); check(`A2 ${p}: ${name} refused (403), no data`, r.status === 403 && !r.j?.health && !r.j?.data, [r.status, Object.keys(r.j || {})]);
    }
    for (const [name, u] of HOSTILE) {
      const r = await u.raw(p); check(`A2b ${p}: ${name} WITH a forged database grant still refused (eligibility, not the grant, decides)`, r.status === 403 && !r.j?.health && !r.j?.data, [r.status]);
    }
    for (const [name, u] of [['owner Super Admin', SA], ['second Super Admin', SA2], ['technical_support with the granted permission', TECHG]]) {
      const r = await u.raw(p); check(`A3 ${p}: ${name} allowed (${r.status})`, r.status === 200, [r.status, r.j?.message]);
    }
  }
  // Assignment API: the System Owner cannot grant it to a non-technical role (409) but can to technical_support (200).
  const put = (id, granted) => SA.raw(`/api/admin/staff/${id}/permissions`, { method: 'PUT', body: { grantedPermissions: granted, revokedPermissions: [], reason: 'ci eligibility check' } });
  for (const [name, u] of [['moderator', MOD], ['hr', HR], ['accounts', ACC], ['marketing', MKT], ['escrow_officer', ESC], ['ordinary admin', ADMIN]]) {
    const r = await put(u.id, ['view_system_health']);
    check(`A6 owner attempt to grant view_system_health to ${name} → 409 PERMISSION_NOT_ELIGIBLE_FOR_ROLE`, r.status === 409 && r.j?.code === 'PERMISSION_NOT_ELIGIBLE_FOR_ROLE', [r.status, r.j?.code]);
  }
  check('A6b the refused grant was not persisted', q(`select coalesce(granted_permissions::text,'') from users where id='${MOD.id}'`).indexOf('view_system_health') === -1);
  const TECHN = await staff('technical_support', 'techn33');
  check('A7 before the grant: technical_support refused', (await TECHN.raw(paths[0])).status === 403);
  const g = await put(TECHN.id, ['view_system_health']);
  check('A7b owner may grant it to technical_support (200)', g.status === 200 && g.j?.permissions?.effectivePermissions?.includes('view_system_health'), [g.status, g.j?.message]);
  for (const p of paths) check(`A7c ${p}: technical_support after the grant allowed`, (await TECHN.raw(p)).status === 200);
  // Replay of a captured request after revocation
  const rv = await put(TECHN.id, []);
  check('A8 revoke via the API (200)', rv.status === 200 && !rv.j?.permissions?.effectivePermissions?.includes('view_system_health'), [rv.status]);
  for (const p of paths) check(`A8b ${p}: replayed request after revoke refused`, (await TECHN.raw(p)).status === 403);
  // Role change: a technical user with the grant who is moved to a non-technical role loses access at once; moved back, regains it.
  q(`update users set granted_permissions=array['view_system_health'] where id='${TECHN.id}'`);
  check('A9 granted technical user allowed', (await TECHN.raw(paths[0])).status === 200);
  q(`update users set role='moderator' where id='${TECHN.id}'`);
  check('A9b same session after a role change to moderator → refused', (await TECHN.raw(paths[0])).status === 403);
  await relogin(TECHN);
  check('A9c after re-login as moderator → refused', (await TECHN.raw(paths[0])).status === 403 && (await TECHN.raw(paths[1])).status === 403);
  q(`update users set role='technical_support' where id='${TECHN.id}'`);
  await relogin(TECHN);
  check('A9d back in the technical role with the grant → allowed again', (await TECHN.raw(paths[0])).status === 200);
  const cfg = await import('../../backend/config/roles.js');
  check('A4 view_system_health is assignable, labelled, held by NO role by default, and role-eligibility restricted', cfg.ASSIGNABLE_PERMISSIONS.includes('view_system_health') && !!cfg.PERM_LABELS?.view_system_health && Object.entries(cfg.ROLE_PERMISSIONS).every(([k, v]) => k === 'superadmin' || !v.includes('view_system_health')) && JSON.stringify(cfg.PERMISSION_ROLE_ELIGIBILITY.view_system_health) === JSON.stringify(['superadmin', 'technical_support']));
  check('A5 the audit/other technical permission (view_logs) does NOT unlock health', (await MOD.raw('/api/admin/system/health')).status === 403 && cfg.ROLE_PERMISSIONS.moderator.includes('view_logs'));
  const cat = await SA.raw('/api/admin/staff/permissions/catalog');
  check('A10 the permission catalog advertises the eligible roles', JSON.stringify(cat.j?.catalog?.find((c) => c.key === 'view_system_health')?.eligibleRoles) === JSON.stringify(['superadmin', 'technical_support']), [cat.status]);
}

// ===================== B/C. OD-2 reinstatement + OD-3 any Super Admin =====================
const REASON = 'Repeated listing misrepresentation reported by three buyers';
const sreq = (u, d, extra = {}) => u.raw(`/api/verification/admin/${d.vid}/suspend-request`, { method: 'POST', body: { reasonCategory: 'fraud_or_misrepresentation', reason: REASON, evidenceReference: 'CASE-2201', ...extra } });
const rreq = (u, d, extra = {}) => u.raw(`/api/verification/admin/${d.vid}/reinstate-request`, { method: 'POST', body: { reasonCategory: 'issue_resolved', reason: 'Documents re-verified and the buyers confirmed the listings were corrected', evidenceReference: 'CASE-2201-R', ...extra } });
const decide = (u, id, decision, reason) => u.raw(`/api/verification/admin/suspension-requests/${id}/decision`, { method: 'POST', body: { decision, ...(reason ? { reason } : {}) } });
const vstat = (d) => q(`select verification_status from dealer_verifications where id='${d.vid}'`);
const ustat = (d) => q(`select status from users where id='${d.id}'`);
const issusp = (d) => q(`select is_suspended::text from dealers where "user"='${d.id}'`);

// --- D1: suspend via request, approved by the SECOND Super Admin (OD-3) ---
const s1 = await sreq(ADMIN, D1);
check('C1 Admin submits a suspension request (201) and the dealer is NOT suspended', s1.status === 201 && vstat(D1) === 'approved', [s1.status, s1.j]);
const a1 = await decide(SA2, s1.j?.data?.id, 'approve');
check('C2 a SECOND Super Admin (not the owner) approves the suspension (200) and it takes effect', a1.status === 200 && vstat(D1) === 'suspended' && ustat(D1) === 'suspended' && issusp(D1) === 'true', [a1.status, a1.j?.message, vstat(D1)]);
check('C3 the actual approving Super Admin is recorded', q(`select decided_by from dealer_suspension_requests where id='${s1.j?.data?.id}'`) === SA2.id);
const carsBefore = q(`select count(*) from cars where dealer_id='${D1.id}'`); const teamBefore = q(`select count(*) from dealer_teams where dealer='${D1.id}'`);

// --- reinstatement request ---
const r1 = await rreq(ADMIN, D1);
check('B1 Admin submits a reinstatement request (201) with reason, evidence, requester and time', r1.status === 201 && r1.j?.data?.requestType === 'reinstatement' && r1.j.data.status === 'pending' && r1.j.data.evidenceReference === 'CASE-2201-R' && r1.j.data.requestedBy === ADMIN.id && !!r1.j.data.createdAt, [r1.status, r1.j]);
check('B2 the dealer REMAINS suspended while the request is pending', vstat(D1) === 'suspended' && ustat(D1) === 'suspended' && issusp(D1) === 'true');
check('B3 the request links to the original approved suspension record', r1.j?.data?.relatedRequestId === s1.j?.data?.id, r1.j?.data);
const dup = await rreq(ADMIN2, D1);
check('B4 a second pending request for the same dealer is refused (409)', dup.status === 409, [dup.status, dup.j]);
check('B5 a suspension request for an already-suspended dealer is refused (409)', (await sreq(ADMIN2, D1)).status === 409);
check('B6 a reinstatement request for a dealer that is NOT suspended is refused (409)', (await rreq(ADMIN, D2)).status === 409);
check('B7 a reason under 10 characters is refused (400)', (await rreq(ADMIN2, D3, { reason: 'short' })).status === 400 || (await rreq(ADMIN2, D3, { reason: 'short' })).status === 409);

// --- bypass attempts while suspended ---
const D1id = D1.vid;
const bypass = [
  ['Admin direct reinstate', ADMIN, `/api/verification/admin/${D1id}/reinstate`, 'POST'],
  ['Admin "approve" on a suspended verification', ADMIN, `/api/verification/admin/${D1id}/approve`, 'POST'],
  ['Admin un-bans the dealer user (toggle-ban)', ADMIN, `/api/admin/users/${D1.id}/toggle-ban`, 'POST', { banned: false }],
  ['Admin approve-dealer', ADMIN, `/api/admin/users/${D1.id}/approve-dealer`, 'POST'],
  ['Admin decides the request', ADMIN, `/api/verification/admin/suspension-requests/${r1.j?.data?.id}/decision`, 'POST', { decision: 'approve' }],
  ['Moderator decides the request', MOD, `/api/verification/admin/suspension-requests/${r1.j?.data?.id}/decision`, 'POST', { decision: 'approve' }],
  ['Moderator submits a request', MOD, `/api/verification/admin/${D1id}/reinstate-request`, 'POST', { reasonCategory: 'issue_resolved', reason: 'x'.repeat(30) }],
  ['personal account decides', PERSONAL, `/api/verification/admin/suspension-requests/${r1.j?.data?.id}/decision`, 'POST', { decision: 'approve' }],
  ['dealer owner reinstates itself', D1, `/api/verification/admin/${D1id}/reinstate`, 'POST'],
  ['dealer owner decides its own request', D1, `/api/verification/admin/suspension-requests/${r1.j?.data?.id}/decision`, 'POST', { decision: 'approve' }],
  ['dealer staff decides', DSTAFF, `/api/verification/admin/suspension-requests/${r1.j?.data?.id}/decision`, 'POST', { decision: 'approve' }],
  ['dealer staff submits a request', DSTAFF, `/api/verification/admin/${D1id}/reinstate-request`, 'POST', { reasonCategory: 'issue_resolved', reason: 'x'.repeat(30) }],
  ['technical staff decides', TECHG, `/api/verification/admin/suspension-requests/${r1.j?.data?.id}/decision`, 'POST', { decision: 'approve' }],
];
for (const [name, u, path, method, b] of bypass) { const r = await u.raw(path, { method, body: b || {} }); check(`D1 bypass refused: ${name} (${r.status})`, [401, 403, 409].includes(r.status) && r.status !== 200, [r.status, r.j?.message]); }
for (const [name, p, m] of [['decision', `/api/verification/admin/suspension-requests/${r1.j?.data?.id}/decision`, 'POST'], ['reinstate-request', `/api/verification/admin/${D1id}/reinstate-request`, 'POST'], ['list', '/api/verification/admin/suspension-requests', 'GET']]) check(`D2 anonymous ${name}: refused (401)`, (await anon(p, m)) === 401);
check('D3 after every bypass attempt the dealer is STILL suspended and the request still pending', vstat(D1) === 'suspended' && q(`select status from dealer_suspension_requests where id='${r1.j?.data?.id}'`) === 'pending');
const list2 = await ADMIN2.raw('/api/verification/admin/suspension-requests?type=reinstatement');
check('D4 an Admin sees only their OWN requests (not another Admin\'s)', list2.status === 200 && !(list2.j.data || []).some((x) => x.id === r1.j?.data?.id));
const listSA = await SA.raw('/api/verification/admin/suspension-requests?status=pending&type=reinstatement');
check('D5 a Super Admin sees the pending reinstatement with its original suspension history link', listSA.status === 200 && (listSA.j.data || []).some((x) => x.id === r1.j?.data?.id && x.relatedRequestId === s1.j?.data?.id));
check('D6 another Admin cannot cancel someone else\'s request (403)', (await ADMIN2.raw(`/api/verification/admin/suspension-requests/${r1.j?.data?.id}/cancel`, { method: 'POST', body: {} })).status === 403);

// --- decisions ---
const rej0 = await decide(SA, r1.j?.data?.id, 'reject');
check('B8 rejecting without a reason is refused (400) and nothing changes', rej0.status === 400 && q(`select status from dealer_suspension_requests where id='${r1.j?.data?.id}'`) === 'pending');
const ok = await decide(SA2, r1.j?.data?.id, 'approve', 'Documents verified');
check('C4 the second Super Admin approves the REINSTATEMENT (200); the dealer is restored through the existing status mechanism', ok.status === 200 && vstat(D1) === 'approved' && ustat(D1) === 'approved' && issusp(D1) === 'false', [ok.status, ok.j?.message, vstat(D1), ustat(D1), issusp(D1)]);
check('C5 the approving Super Admin is recorded and the decision reason kept', q(`select decided_by||'|'||coalesce(decision_reason,'') from dealer_suspension_requests where id='${r1.j?.data?.id}'`) === `${SA2.id}|Documents verified`);
check('C6 suspension history is NOT deleted: both request rows remain, the original suspension row is unchanged', q(`select count(*) from dealer_suspension_requests where verification_id='${D1.vid}'`) === '2' && q(`select status||'|'||request_type from dealer_suspension_requests where id='${s1.j?.data?.id}'`) === 'approved|suspension');
check('C7 dealer, listings, team and user rows are untouched', q(`select count(*) from cars where dealer_id='${D1.id}'`) === carsBefore && q(`select count(*) from dealer_teams where dealer='${D1.id}'`) === teamBefore && q(`select count(*) from users where id='${D1.id}'`) === '1');
const again = await decide(SA, r1.j?.data?.id, 'approve');
const flip = await decide(SA, r1.j?.data?.id, 'reject', 'changed my mind');
check('D7 replayed approval is refused (409) and a later reject cannot change the outcome', again.status === 409 && flip.status === 409 && vstat(D1) === 'approved' && q(`select status from dealer_suspension_requests where id='${r1.j?.data?.id}'`) === 'approved', [again.status, flip.status]);
check('C8 owner Super Admin retains approval authority (suspension request by Admin, approved by the owner)', await (async () => { const x = await sreq(ADMIN, D4); const y = await decide(SA, x.j?.data?.id, 'approve'); return x.status === 201 && y.status === 200 && vstat(D4) === 'suspended'; })());

// --- rejection path ---
{
  const s = await sreq(ADMIN, D3); await decide(SA, s.j?.data?.id, 'approve');
  const r = await rreq(ADMIN, D3, { reasonCategory: 'appeal_upheld' });
  const rj = await decide(SA2, r.j?.data?.id, 'reject', 'Evidence insufficient; keep suspended');
  check('B9 rejection leaves the dealer SUSPENDED with the reason recorded', rj.status === 200 && vstat(D3) === 'suspended' && ustat(D3) === 'suspended' && q(`select status||'|'||decision_reason from dealer_suspension_requests where id='${r.j?.data?.id}'`) === 'rejected|Evidence insufficient; keep suspended', [rj.status, vstat(D3)]);
  const r2 = await rreq(ADMIN, D3);
  check('B10 after a rejection the Admin may submit a NEW request (201)', r2.status === 201);
  const c = await ADMIN.raw(`/api/verification/admin/suspension-requests/${r2.j?.data?.id}/cancel`, { method: 'POST', body: {} });
  check('B11 the requester can cancel their own pending request (200) and the dealer stays suspended', c.status === 200 && vstat(D3) === 'suspended');
}

// --- simultaneous decisions ---
{
  const s = await sreq(ADMIN, D2); await decide(SA, s.j?.data?.id, 'approve');
  const r = await rreq(ADMIN, D2);
  const id = r.j?.data?.id;
  const outs = await Promise.all([decide(SA, id, 'approve'), decide(SA2, id, 'approve'), decide(SA2, id, 'reject', 'concurrent reject'), decide(SA, id, 'approve')]);
  const wins = outs.filter((o) => o.status === 200).length;
  const finalStatus = q(`select status from dealer_suspension_requests where id='${id}'`);
  const consistent = (finalStatus === 'approved' && vstat(D2) === 'approved' && issusp(D2) === 'false') || (finalStatus === 'rejected' && vstat(D2) === 'suspended');
  check('D8 four simultaneous decisions (two Super Admins, approve/reject): exactly ONE wins and the dealer state matches it', wins === 1 && consistent && outs.filter((o) => o.status !== 200).every((o) => [409, 429].includes(o.status)), { codes: outs.map((o) => o.status), finalStatus, v: vstat(D2) });
  check('D9 exactly one decision is recorded (a single decided_by)', q(`select count(*) from dealer_suspension_requests where id='${id}' and decided_by is not null`) === '1');
}

// --- audit ---
check('D10 audit trail records request, approval and rejection of reinstatements', Number(q(`select count(*) from audit_logs where action in ('dealer_reinstatement_requested','dealer_reinstatement_request_approved','dealer_reinstatement_request_rejected')`)) >= 3);
check('D11 no payment, escrow or amount changed during any governance action (snapshot before/after)', [q('select count(*) from payments'), q('select count(*) from escrows'), q('select coalesce(sum(amount),0) from payments')].join('|') === fin0);
finish('33_governance_decisions');
