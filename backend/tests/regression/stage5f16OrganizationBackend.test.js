// ============================================================
// STAGE 5F.16 — organization -> branches -> memberships: BACKEND layer (evidence tier M: in-memory fake of PostgREST).
// The authority rules themselves (role rank, branch scope, single-use invitations, revocation, RLS) are certified on a real
// PostgreSQL database by runbooks/stage5f16-garage-organization-20261020/pg and over HTTP by .../http. This file pins the layer
// between them: capability gating, uniform 404, error mapping, strict request schemas, scoped reads, and the legacy-path changes.
// The capability map and middleware under test are the REAL code; only the database client is faked.
// ============================================================
import { jest } from '@jest/globals';
import { createFakeSupabase } from '../helpers/fakeSupabase.js';

let fake; let rpcCalls;
jest.unstable_mockModule('../../utils/supabase.js', () => ({ getSupabase: () => fake, isSupabaseConnected: () => true }));
jest.unstable_mockModule('../../utils/logger.js', () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));

const svc = await import('../../inspection/services/organizationService.js');
const { requireOrgAccess, requireUuidParams, isUuid } = await import('../../inspection/middleware/requireOrgAccess.js');
const S = await import('../../validation/garageOrganization.schema.js');

const P = 'e1600000-0000-4000-8000-000000000001';
const U = (n) => `c1600000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const OWNER = U(1), ADMIN = U(2), BM = U(3), INSP = U(4), FIN = U(5), STRANGER = U(6), BANNED = U(7);
const B1 = 'b1111111-0000-4000-8000-000000000001', B2 = 'b1111111-0000-4000-8000-000000000002';

const membership = (id, user, role, o = {}) => ({ id, provider_id: P, user_id: user, access_role: role, branch_id: null, affiliation_status: 'confirmed', is_active: true, ...o });
const contextRpc = (f, name, a) => {
  rpcCalls.push([name, a]);
  if (name === 'kayad_org_context') {
    const prov = f.tables.inspection_providers.find((p) => p.id === a.p_provider);
    if (prov && prov.user_id === a.p_user) return { data: [{ is_owner: true, access_role: 'owner', branch_id: null, staff_id: null }], error: null };
    const user = f.tables.users.find((u) => u.id === a.p_user);
    const m = f.tables.inspection_staff.find((s) => s.provider_id === a.p_provider && s.user_id === a.p_user && s.affiliation_status === 'confirmed' && s.is_active);
    const br = m?.branch_id ? f.tables.inspection_branches.find((b) => b.id === m.branch_id) : null;
    if (!m || !user || user.status !== 'approved' || user.is_banned || (m.branch_id && br?.status !== 'active')) return { data: [], error: null };
    return { data: [{ is_owner: false, access_role: m.access_role, branch_id: m.branch_id, staff_id: m.id }], error: null };
  }
  if (name.startsWith('fail:')) return { data: null, error: { message: name.slice(5) } };
  return { data: { ok: true, name, args: a }, error: null };
};
beforeEach(() => {
  rpcCalls = [];
  fake = createFakeSupabase({
    inspection_providers: [{ id: P, user_id: OWNER, company_name: 'Alpha', status: 'active', verification_status: 'verified', lifecycle_stage: 'ACTIVE' }],
    users: [OWNER, ADMIN, BM, INSP, FIN, STRANGER].map((id) => ({ id, status: 'approved' })).concat([{ id: BANNED, status: 'approved', is_banned: true }]),
    inspection_branches: [{ id: B1, provider_id: P, name: 'HQ', status: 'active' }, { id: B2, provider_id: P, name: 'East', status: 'suspended' }],
    inspection_staff: [membership('s-admin', ADMIN, 'org_admin'), membership('s-bm', BM, 'branch_manager', { branch_id: B1 }), membership('s-insp', INSP, 'inspector', { branch_id: B1 }), membership('s-fin', FIN, 'finance'), membership('s-ban', BANNED, 'finance')],
    inspection_bookings: [], users_dummy: [],
  }, { rpc: contextRpc });
});

const run = (mw, req) => new Promise((resolve) => mw(req, {}, (err) => resolve({ err, req })));
const access = (cap, user, providerId = P) => run(requireOrgAccess(cap), { user: user ? { id: user } : undefined, params: { providerId } });

describe('requireOrgAccess: standing is recomputed from the database, and strangers learn nothing', () => {
  test('no session -> 401', async () => { expect((await access('org.read', null)).err.statusCode).toBe(401); });
  test.each([['not-a-uuid'], ['11111111-1111-1111-1111-111111111111'], [undefined]])('unknown or malformed organization %s -> the SAME 404 as a real organization the caller is not in', async (id) => {
    const a = await access('org.read', STRANGER, id); const b = await access('org.read', STRANGER, P);
    expect([a.err.statusCode, a.err.message]).toEqual([404, 'Organization not found']); expect([b.err.statusCode, b.err.message]).toEqual([404, 'Organization not found']);
  });
  test('owner and members pass for capabilities their role has, and req.org carries the DB-reported standing (never client input)', async () => {
    const r = await access('member.manage', BM); expect(r.err).toBeUndefined(); expect(r.req.org.standing).toEqual({ isOwner: false, accessRole: 'branch_manager', branchId: B1, staffId: 's-bm' });
    expect((await access('branch.manage', OWNER)).req.org.standing.isOwner).toBe(true);
  });
  test.each([
    ['branch.manage', BM], ['branch.manage', INSP], ['member.read', INSP], ['member.read', FIN], ['booking.read', FIN], ['booking.manage', INSP], ['report.read', INSP],
  ])('%s is refused with 403 for a member whose role lacks it (%s)', async (cap, user) => {
    const r = await access(cap, user); expect(r.err.statusCode).toBe(403); expect(r.err.details).toEqual({ code: 'ORG_FORBIDDEN' });
  });
  test('finance gets report but not operations; branch manager gets reports/bookings but not branch management', async () => {
    expect((await access('report.read', FIN)).err).toBeUndefined(); expect((await access('booking.read', BM)).err).toBeUndefined();
  });
  test('a banned account has no standing even though its membership row is still confirmed', async () => { expect((await access('org.read', BANNED)).err.statusCode).toBe(404); });
  test('a membership tied to a SUSPENDED branch has no standing', async () => {
    fake.tables.inspection_staff.push(membership('s-east', U(9), 'inspector', { branch_id: B2 })); fake.tables.users.push({ id: U(9), status: 'approved' });
    expect((await access('org.read', U(9))).err.statusCode).toBe(404);
  });
  test('removal takes effect on the very next request (nothing is cached)', async () => {
    expect((await access('booking.read', INSP)).err).toBeUndefined();
    fake.tables.inspection_staff.find((s) => s.id === 's-insp').affiliation_status = 'ended';
    expect((await access('booking.read', INSP)).err.statusCode).toBe(404);
  });
  test('a platform admin has no implicit operational access here', async () => { fake.tables.users.push({ id: U(8), status: 'approved', role: 'admin' }); expect((await access('org.read', U(8))).err.statusCode).toBe(404); });
  test('requireUuidParams turns malformed ids into 404 before any query', async () => {
    expect((await run(requireUuidParams('branchId'), { params: { branchId: "1' OR '1'='1" } })).err.statusCode).toBe(404);
    expect((await run(requireUuidParams('branchId'), { params: { branchId: B1 } })).err).toBeUndefined(); expect(isUuid(B1)).toBe(true);
  });
});

describe('orgRpc: database failures become stable HTTP statuses and never leak internals', () => {
  const call = (message) => svc.orgRpc(`fail:${message}`, {}).catch((e) => e);
  test.each([
    ['ORG_FORBIDDEN: your role cannot make this change', 403], ['ORG_SELF_CHANGE_FORBIDDEN: you cannot change your own role', 403], ['ORG_NOT_FOUND: membership not found', 404],
    ['ORG_BRANCH_NOT_FOUND: no such branch', 404], ['ORG_INVALID: bad', 400], ['ORG_INVITATION_EXPIRED: x', 410], ['ORG_DUPLICATE_BRANCH: x', 409], ['ORG_BOOKING_STATE: x', 409],
    ['ORG_MEMBER_HAS_ACTIVE_WORK: x', 409], ['ORG_SOMETHING_NEW: x', 409], ['ORG_INVALID_INSPECTOR: x', 409], ['ORG_HEAD_OFFICE_PROTECTED: x', 409],
  ])('%s -> %i', async (msg, status) => {
    const e = await call(msg); expect(e.statusCode).toBe(status); expect(e.details.code).toMatch(/^ORG_/); expect(e.message).not.toMatch(/ORG_/);
  });
  test('an infrastructure error is a 500 with a generic message — the database text is not echoed', async () => {
    const e = await call('relation "inspection_staff" does not exist; connection string postgres://secret'); expect(e.statusCode).toBe(500);
    expect(e.message).toBe('The organization service is temporarily unavailable'); expect(JSON.stringify(e.message)).not.toMatch(/postgres|relation/);
  });
  test('an in-band ok:false (e.g. expired invitation) is an error, not a success', async () => {
    fake.rpc = async () => ({ data: { ok: false, code: 'ORG_INVITATION_EXPIRED' }, error: null });
    await expect(svc.acceptInvitation(INSP, 's')).rejects.toMatchObject({ statusCode: 410 });
  });
});

describe('request schemas are strict: authority cannot be smuggled in', () => {
  test.each([
    ['branchCreate', { name: 'X', organizationId: P }], ['branchCreate', { name: 'X', provider_id: P }], ['branchUpdate', { name: 'X', status: 'active' }],
    ['memberInvite', { email: 'a@b.co', accessRole: 'inspector', isOwner: true }], ['memberInvite', { email: 'a@b.co', accessRole: 'owner' }], ['memberInvite', { email: 'a@b.co', accessRole: 'inspector', providerId: P }],
    ['memberChange', { userId: U(1) }], ['memberChange', { affiliation_status: 'confirmed' }], ['memberStatus', { action: 'delete' }], ['memberStatus', { action: 'suspend', actor: OWNER }],
    ['bookingRoute', { branchId: B1, providerId: P }], ['bookingAssign', { staffId: 'x' }], ['bookingTransition', { action: 'complete', status: 'closed' }], ['bookingTransition', { action: 'closed' }],
    ['reportQuery', { organizationId: P }], ['reportQuery', { from: '10/10/2026' }], ['bookingListQuery', { limit: 5000 }], ['bookingListQuery', { providerId: P }],
  ])('%s rejects %j', (name, body) => { expect(S[`${name}Schema`].safeParse(body).success).toBe(false); });
  test('valid minimal bodies pass; titles are the closed list', () => {
    expect(S.memberInviteSchema.safeParse({ email: 'a@b.co', accessRole: 'inspector', title: 'senior_inspector', branchId: B1 }).success).toBe(true);
    expect(S.memberInviteSchema.safeParse({ email: 'a@b.co', accessRole: 'inspector', title: 'mechanic' }).success).toBe(false);
    expect(S.bookingRouteSchema.safeParse({ branchId: null }).success).toBe(true); expect(S.memberChangeSchema.safeParse({}).success).toBe(false);
  });
});

describe('capability map', () => {
  test('exactly the roles in the design may do each thing', () => {
    const roles = ['owner', 'org_admin', 'operations_manager', 'branch_manager', 'finance', 'report_reviewer', 'inspector', 'technician'];
    const who = (cap) => roles.filter((r) => svc.CAPABILITIES[cap].includes(r));
    expect(who('branch.manage')).toEqual(['owner', 'org_admin']);
    expect(who('member.manage')).toEqual(['owner', 'org_admin', 'branch_manager']);
    expect(who('booking.manage')).toEqual(['owner', 'org_admin', 'operations_manager', 'branch_manager']);
    expect(who('report.read')).toEqual(['owner', 'org_admin', 'operations_manager', 'branch_manager', 'finance']);
    expect(who('booking.read')).not.toContain('finance');
    expect(svc.can(null, 'org.read')).toBe(false); expect(svc.can({ isOwner: false, accessRole: 'finance' }, 'booking.read')).toBe(false);
  });
  test('legacy titles map to the least-privileged matching role and never to a management role', () => {
    for (const t of ['lead_engineer', 'senior_inspector', 'junior_inspector', 'field_technician', 'workshop_technician', 'quality_reviewer']) expect(['inspector', 'technician', 'report_reviewer']).toContain(svc.accessRoleForTitle(t));
    expect(svc.accessRoleForTitle('anything-else')).toBe('inspector');
    expect(svc.normaliseTitle(undefined)).toBe('junior_inspector'); expect(svc.normaliseTitle(' Senior Inspector ')).toBe('senior_inspector');
    expect(() => svc.normaliseTitle('mechanic')).toThrow(/Unknown role title/); expect(() => svc.normaliseTitle('org_admin')).toThrow();
  });
});

describe('scoped reads', () => {
  const bk = (id, o) => ({ id, provider_id: P, branch_id: null, status: 'confirmed', scheduled_date: '2026-10-10', assigned_staff_id: null, ...o });
  beforeEach(() => {
    fake.tables.inspection_bookings.push(bk('k1', { branch_id: B1 }), bk('k2', { branch_id: B2 }), bk('k3', {}), bk('k4', { branch_id: B1, assigned_staff_id: 's-insp' }), { ...bk('k5', {}), provider_id: 'other-org' });
  });
  const standing = (role, o = {}) => ({ isOwner: role === 'owner', accessRole: role === 'owner' ? 'owner' : role, branchId: null, staffId: null, ...o });
  const ids = async (st, f) => (await svc.listBookings(P, st, f)).items.map((b) => b.id).sort();
  test('owner/ops see the organization (incl. unrouted), never another organization', async () => { expect(await ids(standing('owner'))).toEqual(['k1', 'k2', 'k3', 'k4']); });
  test('a branch manager is pinned to their branch even if a branch filter is supplied', async () => {
    const st = standing('branch_manager', { branchId: B1, staffId: 's-bm' });
    expect(await ids(st)).toEqual(['k1', 'k4']); expect(await ids(st, { branchId: B2 })).toEqual(['k1', 'k4']); expect(await ids(st, { branchId: 'unrouted' })).toEqual(['k1', 'k4']);
  });
  test('an inspector sees only their own assignments', async () => { expect(await ids(standing('inspector', { branchId: B1, staffId: 's-insp' }))).toEqual(['k4']); });
  test('"unrouted" lists the organization-level queue', async () => { expect(await ids(standing('operations_manager'), { branchId: 'unrouted' })).toEqual(['k3']); });
  test('finance has no booking read (404, same as no standing)', async () => { await expect(svc.listBookings(P, standing('finance'))).rejects.toMatchObject({ statusCode: 404 }); });
  test('branch managers only see their own branch; other roles see all branches', async () => {
    expect((await svc.listBranches(P, standing('branch_manager', { branchId: B1 }))).map((b) => b.id)).toEqual([B1]);
    expect((await svc.listBranches(P, standing('owner'))).map((b) => b.id).sort()).toEqual([B1, B2]);
  });
  test('team listing for a branch manager excludes org-level people', async () => {
    const list = await svc.listMembers(P, standing('branch_manager', { branchId: B1 })); expect(list.map((m) => m.id).sort()).toEqual(['s-bm', 's-insp']);
  });
  test('worklist only includes assignments of LIVE memberships (active branch, confirmed, active)', async () => {
    fake.tables.users.find((u) => u.id === INSP).role = 'ghost_checker';
    expect((await svc.myWorklist(INSP)).items.map((b) => b.id)).toEqual(['k4']);
    fake.tables.inspection_branches.find((b) => b.id === B1).status = 'suspended'; expect((await svc.myWorklist(INSP)).items).toEqual([]);
    fake.tables.inspection_branches.find((b) => b.id === B1).status = 'active'; fake.tables.inspection_staff.find((s) => s.id === 's-insp').affiliation_status = 'suspended';
    expect((await svc.myWorklist(INSP)).items).toEqual([]);
  });
  test('report range: defaults to month-to-date in East Africa time, rejects inversions and spans over 366 days', () => {
    expect(svc.reportRange('2026-10-01', '2026-10-31')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(() => svc.reportRange('2026-10-31', '2026-10-01')).toThrow(/start date/);
    expect(() => svc.reportRange('2024-01-01', '2026-10-31')).toThrow(/366/);
    const d = svc.reportRange(); expect(d.from.endsWith('-01')).toBe(true); expect(d.from <= d.to).toBe(true);
  });
  test('the actor passed to the database is always the caller, and the invite resolves the invitee server-side', async () => {
    fake.tables.users.push({ id: U(20), email: 'new@x.co', status: 'approved' });
    await svc.inviteMember(ADMIN, P, { email: ' NEW@x.co ', accessRole: 'inspector', title: 'junior_inspector', branchId: B1, ttlHours: 99999 });
    const [name, args] = rpcCalls.at(-1); expect(name).toBe('kayad_org_member_invite'); expect(args).toMatchObject({ p_actor: ADMIN, p_provider: P, p_user: U(20), p_ttl_hours: 720 });
    await expect(svc.inviteMember(ADMIN, P, { email: 'nobody@x.co', accessRole: 'finance' })).rejects.toMatchObject({ statusCode: 404 });
  });
});
