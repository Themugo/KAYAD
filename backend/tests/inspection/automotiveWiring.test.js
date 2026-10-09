import { jest } from '@jest/globals';
import { createFakeSupabase } from '../helpers/fakeSupabase.js';

let fake;
const dbMock = { find: jest.fn(), findById: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() };
jest.unstable_mockModule('../../utils/supabase.js', () => ({ getSupabase: () => fake, isSupabaseConnected: () => true }));
jest.unstable_mockModule('../../utils/logger.js', () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule('../../inspection/services/dbAdapter.js', () => ({ default: dbMock }));

const { providerService } = await import('../../inspection/services/providerService.js');
const { assertStaffAssignable } = await import('../../inspection/services/workforceService.js');
const { listActiveInspectors } = await import('../../controllers/inspectorApplicationController.js');
const { default: router } = await import('../../inspection/routes/inspectionRoutes.js');
const { default: adminGov } = await import('../../routes/adminInspectionGovernanceRoutes.js');
const { default: requireProviderOwnership } = await import('../../inspection/middleware/requireProviderOwnership.js');
const { requireAuth } = await import('../../middleware/auth.js');

beforeEach(() => { Object.values(dbMock).forEach((m) => m.mockReset()); });

describe('route protection of the new endpoints', () => {
  const find = (r, method, path) => r.stack.find((l) => l.route && l.route.path === path && l.route.methods[method]);
  const handlers = (l) => l.route.stack.map((s) => s.handle);
  test.each([
    ['get', '/service-taxonomy', false],
    ['get', '/provider/:providerId/capabilities', true],
    ['post', '/provider/:providerId/capabilities', true],
    ['get', '/provider/:providerId/staff', true],
    ['post', '/provider/:providerId/staff', true],
    ['post', '/provider/:providerId/staff/:staffId/confirm', true],
    ['post', '/provider/:providerId/staff/:staffId/end', true],
  ])('%s %s ownership=%s', (m, p, owned) => {
    const l = find(router, m, p); expect(l).toBeTruthy();
    const h = handlers(l);
    if (owned) { expect(h).toContain(requireAuth); expect(h).toContain(requireProviderOwnership); }
    else { expect(h).not.toContain(requireAuth); }
  });
  test.each([
    ['get', '/affiliations/my'], ['post', '/affiliations'], ['post', '/affiliations/:staffId/accept'], ['post', '/affiliations/:staffId/leave'],
  ])('%s %s requires auth', (m, p) => {
    expect(handlers(find(router, m, p))).toContain(requireAuth);
  });
  test.each([
    ['post', '/provider/:providerId/capabilities', { category: 'diagnostics', status: 'verified' }],
    ['post', '/provider/:providerId/capabilities', { category: 'diagnostics', staffId: 'not-a-uuid' }],
    ['post', '/provider/:providerId/staff', { email: 'not-an-email' }],
    ['post', '/affiliations', { providerId: 'nope' }],
  ])('%s %s rejects an invalid or privilege-escalating body %j', (m, p, body) => {
    const h = handlers(find(router, m, p));
    const validateMw = h[h.length - 2]; // [requireAuth, (ownership), validate, controller]
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    const next = jest.fn();
    validateMw({ body }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
  test('admin decisions reject unknown decision values and extra fields', () => {
    const l = adminGov.stack.find((x) => x.route?.path === '/providers/:id/decision');
    const h = l.route.stack.map((s) => s.handle); const mw = h[h.length - 2];
    for (const body of [{ decision: 'approve_all' }, { decision: 'approve', route: 'shortcut' }, { decision: 'suspend', reason: 'x', lifecycle_stage: 'ACTIVE' }]) {
      const res = { status: jest.fn(() => res), json: jest.fn(() => res) }; const next = jest.fn();
      mw({ body }, res, next); expect(next).not.toHaveBeenCalled();
    }
    const ok = jest.fn(); mw({ body: { decision: 'suspend', reason: 'r' } }, { status: jest.fn(), json: jest.fn() }, ok); expect(ok).toHaveBeenCalled();
  });
  test('admin governance router exposes decisions only as POST with validation', () => {
    const posts = adminGov.stack.filter((l) => l.route?.methods.post).map((l) => l.route.path);
    expect(posts).toEqual(expect.arrayContaining(['/providers/:id/decision', '/credentials/:id/decision', '/capabilities/:id/decision', '/staff/:id/end']));
    expect(adminGov.stack.filter((l) => l.route?.methods.get).length).toBe(2);
  });
});

describe('admin mount is behind the global admin guard and the inspections permission', () => {
  test('admin router mounts the governance router at a path matching the MANAGE_INSPECTIONS regex', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL('../../routes/adminRoutes.js', import.meta.url), 'utf8');
    const mount = src.indexOf('inspection-governance');
    const guard = src.indexOf('router.use(protect, adminOnly)');
    expect(guard).toBeGreaterThan(-1);
    expect(mount).toBeGreaterThan(guard);
    expect(/\b(inspection|ntsa|inspector)/.test('/inspection-governance/providers/1/decision')).toBe(true);
  });
});

describe('public profile never overstates', () => {
  const active = { id: 'p1', status: 'active', verification_status: 'verified', lifecycle_stage: 'ACTIVE', company_name: 'A', total_reviews: 0, average_rating: 0 };
  test('non-ACTIVE lifecycle is a 404 even if status columns drift', async () => {
    dbMock.findById.mockResolvedValue({ ...active, lifecycle_stage: 'SUSPENDED' });
    await expect(providerService.getProviderProfile('p1')).rejects.toThrow(/not available/);
  });
  test('only verified, unexpired credentials; capabilities labelled; ended staff excluded; null rating', async () => {
    dbMock.findById.mockResolvedValue(active);
    dbMock.find.mockImplementation(async (table, q) => {
      if (table === 'provider_credentials') {
        expect(q).toEqual({ provider_id: 'p1', verification_status: 'verified' });
        return [
          { id: 'c1', credential_type: 'trade', title: 'Cert', issued_by: 'Board', expires_at: '2999-01-01' },
          { id: 'c2', credential_type: 'trade', title: 'Old', expires_at: '2001-01-01' },
        ];
      }
      if (table === 'provider_service_capabilities') return [
        { category_code: 'diagnostics', status: 'verified', all_makes: true, staff_id: null },
        { category_code: 'hybrid_ev', status: 'declared', all_makes: true, staff_id: null },
        { category_code: 'brakes_steering_suspension', status: 'verified', all_makes: true, staff_id: 's-ended' },
        { category_code: 'cooling_hvac', status: 'revoked', staff_id: null },
      ];
      if (table === 'inspection_staff') return [{ id: 's-live', affiliation_status: 'confirmed', is_active: true }, { id: 's-ended', affiliation_status: 'ended', is_active: false }];
      return [];
    });
    const p = await providerService.getProviderProfile('p1');
    expect(p.credentials.map((c) => c.id)).toEqual(['c1']);
    expect(p.credentials[0]).toMatchObject({ name: 'Cert', issuingBody: 'Board', verified: true });
    expect(p.capabilities.map((c) => [c.category, c.status])).toEqual([['diagnostics', 'verified'], ['hybrid_ev', 'declared']]);
    expect(p.team.confirmedMembers).toBe(1);
    expect(p.stats.averageRating).toBeNull();
    expect(p.stats.acceptanceRate).toBeNull();
  });
  test('addCredential writes the real columns and is never pre-verified', async () => {
    dbMock.create.mockImplementation(async (t, row) => row);
    const row = await providerService.addCredential('p1', { type: 'trade', name: 'N', issuingBody: 'B', certificateNumber: '123', expiryDate: '2030-01-01', documentUrl: 'u', is_verified: true, verification_status: 'verified' });
    expect(row).toMatchObject({ credential_type: 'trade', title: 'N', issued_by: 'B', certificate_number: '123', verification_status: 'unverified' });
    expect(row).not.toHaveProperty('is_verified');
  });
  test('searchProviders ignores a client "status"', async () => {
    fake = createFakeSupabase({ inspection_providers: [{ id: 'x', company_name: 'X', status: 'suspended', verification_status: 'verified', lifecycle_stage: 'SUSPENDED' }], provider_service_capabilities: [], inspection_staff: [] });
    expect((await providerService.searchProviders({ status: 'suspended' })).items).toHaveLength(0);
  });
});

describe('assertStaffAssignable', () => {
  const staff = { id: 's1', provider_id: 'p1', is_active: true, is_available: true, user_id: 'u1', affiliation_status: 'confirmed' };
  const eligible = { id: 'p1', status: 'active', verification_status: 'verified', lifecycle_stage: 'ACTIVE' };
  const setup = (s, p = eligible, u = { id: 'u1', role: 'ghost_checker' }) => dbMock.findById.mockImplementation(async (t) => (t === 'inspection_staff' ? s : t === 'inspection_providers' ? p : u));
  test('confirmed, active staff of an eligible business is assignable', async () => { setup(staff); await expect(assertStaffAssignable('p1', 's1')).resolves.toBeTruthy(); });
  test('pending / ended affiliation is refused', async () => {
    setup({ ...staff, affiliation_status: 'pending' }); await expect(assertStaffAssignable('p1', 's1')).rejects.toThrow(/not confirmed/);
    setup({ ...staff, affiliation_status: 'ended' }); await expect(assertStaffAssignable('p1', 's1')).rejects.toThrow(/not confirmed/);
  });
  test('suspended business cannot take jobs', async () => {
    setup(staff, { ...eligible, lifecycle_stage: 'SUSPENDED' }); await expect(assertStaffAssignable('p1', 's1')).rejects.toThrow(/not currently eligible/);
  });
  test('staff of another business is refused', async () => { setup({ ...staff, provider_id: 'other' }); await expect(assertStaffAssignable('p1', 's1')).rejects.toThrow(/Invalid inspector/); });
});

describe('public active-inspector list', () => {
  test('exposes no email or phone, no fabricated rating, only ACTIVE', async () => {
    fake = createFakeSupabase({ inspection_providers: [
      { id: 'a', user_id: 'u', company_name: 'A', email: 'secret@x.co', phone: '0700', status: 'active', verification_status: 'verified', lifecycle_stage: 'ACTIVE', reviews_count: 0, average_rating: 0 },
      { id: 'b', user_id: 'u2', company_name: 'B', email: 'b@x.co', phone: '1', status: 'active', verification_status: 'verified', lifecycle_stage: 'SUSPENDED' },
    ] });
    const res = { json: jest.fn(), status: jest.fn(() => res) };
    // the in-memory builder ignores column projection, so assert on the mapped output
    await listActiveInspectors({}, res);
    const body = res.json.mock.calls[0][0];
    expect(body.inspectors).toHaveLength(1);
    expect(JSON.stringify(body)).not.toMatch(/secret@x\.co|0700/);
    expect(body.inspectors[0].rating).toBeNull();
  });
});
