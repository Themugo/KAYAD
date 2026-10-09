import { jest } from '@jest/globals';
import { createFakeSupabase } from '../helpers/fakeSupabase.js';

let fake;
jest.unstable_mockModule('../../utils/supabase.js', () => ({ getSupabase: () => fake, isSupabaseConnected: () => true }));
jest.unstable_mockModule('../../utils/logger.js', () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));

const { searchEligibleProviders, haversineKm, normaliseFilters, publicCapability } = await import('../../inspection/services/providerDiscoveryService.js');
const gov = await import('../../inspection/services/providerGovernanceService.js');
const tax = await import('../../inspection/config/serviceTaxonomy.js');

const ADMIN = 'aaaaaaaa-0000-4000-8000-000000000001';
const OWNER = 'bbbbbbbb-0000-4000-8000-000000000002';
const prov = (o = {}) => ({
  company_name: 'Acme Garage', email: 'a@x.co', status: 'active', verification_status: 'verified', lifecycle_stage: 'ACTIVE',
  county: 'Nairobi', town: 'Nairobi', latitude: -1.286, longitude: 36.817, offers_mobile: true, service_radius_km: 30,
  has_workshop: true, address: '1 Road', total_reviews: 0, average_rating: 0, ...o,
});
const cap = (provider_id, o = {}) => ({ provider_id, category_code: 'diagnostics', status: 'verified', all_makes: true, vehicle_makes: [], powertrains: [], serves_roadside_location: false, staff_id: null, ...o });

describe('service taxonomy', () => {
  test('one canonical list: 12 categories, only pre-purchase inspection is bookable, hybrid_ev is high risk', () => {
    const t = tax.getTaxonomy();
    expect(t.categories).toHaveLength(12);
    expect(t.categories.filter((c) => c.bookable).map((c) => c.code)).toEqual(['pre_purchase_inspection']);
    expect(tax.isHighRiskCategory('hybrid_ev')).toBe(true);
    expect(tax.isHighRiskCategory('diagnostics')).toBe(false);
    expect(t.categories.every((c) => c.requestable === false)).toBe(true);
  });
  test('"I am not sure" maps to diagnostics; no symptom claims a diagnosis', () => {
    const unsure = tax.getTaxonomy().symptoms.find((s) => /not sure/i.test(s.label));
    expect(unsure.suggests).toContain('diagnostics');
  });
});

describe('discovery eligibility (server-enforced)', () => {
  beforeEach(() => {
    fake = createFakeSupabase({
      inspection_providers: [
        prov({ id: 'p-active', company_name: 'Active' }),
        prov({ id: 'p-susp', company_name: 'Suspended', status: 'suspended', lifecycle_stage: 'SUSPENDED' }),
        prov({ id: 'p-pending', company_name: 'Pending', status: 'pending', verification_status: 'unverified', lifecycle_stage: 'UNDER_REVIEW' }),
        prov({ id: 'p-drift', company_name: 'Drift', lifecycle_stage: 'VERIFIED' }),
      ],
      provider_service_capabilities: [], inspection_staff: [],
    });
  });
  test('only ACTIVE+verified+active providers are returned', async () => {
    const r = await searchEligibleProviders({});
    expect(r.items.map((i) => i.id)).toEqual(['p-active']);
  });
  test('client-supplied status/verified cannot widen the result', async () => {
    const r = await searchEligibleProviders({ status: 'suspended', verified: 'false' });
    expect(r.items.map((i) => i.id)).toEqual(['p-active']);
    expect(normaliseFilters({ status: 'x', verified: 'false' })).not.toHaveProperty('status');
  });
  test('zero reviews gives a null rating, never 0; no coordinates leak; acceptance rate is null', async () => {
    const [i] = (await searchEligibleProviders({})).items;
    expect(i.stats.averageRating).toBeNull();
    expect(i.stats.acceptanceRate).toBeNull();
    expect(JSON.stringify(i)).not.toMatch(/latitude|longitude/);
  });
  test('suspension removes a provider from matching immediately', async () => {
    fake.tables.provider_service_capabilities.push(cap('p-active'));
    expect((await searchEligibleProviders({ category: 'diagnostics' })).items).toHaveLength(1);
    fake.tables.inspection_providers.find((p) => p.id === 'p-active').lifecycle_stage = 'SUSPENDED';
    fake.tables.inspection_providers.find((p) => p.id === 'p-active').status = 'suspended';
    expect((await searchEligibleProviders({ category: 'diagnostics' })).items).toHaveLength(0);
  });
});

describe('eligibility defence in depth', () => {
  test('query layer constrains to status, verification and ACTIVE stage', async () => {
    fake = createFakeSupabase({ inspection_providers: [], provider_service_capabilities: [], inspection_staff: [] });
    const eqs = [];
    const realFrom = fake.from;
    fake.from = (n) => { const b = realFrom(n); if (n === 'inspection_providers') { const eq = b.eq.bind(b); b.eq = (c, v) => { eqs.push([c, v]); return eq(c, v); }; } return b; };
    await searchEligibleProviders({});
    expect(eqs).toEqual(expect.arrayContaining([['status', 'active'], ['verification_status', 'verified'], ['lifecycle_stage', 'ACTIVE']]));
  });
  test('row layer excludes ineligible rows even if the query layer were to return them', async () => {
    fake = createFakeSupabase({
      inspection_providers: [prov({ id: 'ok' }), prov({ id: 'bad', lifecycle_stage: 'SUSPENDED', status: 'suspended' })],
      provider_service_capabilities: [], inspection_staff: [],
    });
    const realFrom = fake.from;
    fake.from = (n) => { const b = realFrom(n); if (n === 'inspection_providers') b.eq = () => b; return b; }; // simulate a dropped filter
    expect((await searchEligibleProviders({})).items.map((i) => i.id)).toEqual(['ok']);
  });
  test('pending or ended affiliation never makes a staff capability usable, even if the row looks active', async () => {
    fake = createFakeSupabase({
      inspection_providers: [prov({ id: 'p1' })],
      inspection_staff: [
        { id: 's-pend', provider_id: 'p1', is_active: true, affiliation_status: 'pending' },
        { id: 's-end', provider_id: 'p1', is_active: true, affiliation_status: 'ended' },
      ],
      provider_service_capabilities: [cap('p1', { staff_id: 's-pend' }), cap('p1', { staff_id: 's-end', category_code: 'cooling_hvac' })],
    });
    expect((await searchEligibleProviders({ category: 'diagnostics' })).items).toHaveLength(0);
    expect((await searchEligibleProviders({ category: 'cooling_hvac' })).items).toHaveLength(0);
  });
});

describe('capability, vehicle and location matching', () => {
  beforeEach(() => {
    fake = createFakeSupabase({
      inspection_providers: [
        prov({ id: 'near', company_name: 'Near', latitude: -1.29, longitude: 36.82 }),
        prov({ id: 'far', company_name: 'Far', latitude: -4.05, longitude: 39.66, county: 'Mombasa', service_radius_km: 20 }),
        prov({ id: 'nocoords', company_name: 'NoCoords', latitude: null, longitude: null }),
      ],
      inspection_staff: [
        { id: 'st-live', provider_id: 'near', is_active: true, affiliation_status: 'confirmed' },
        { id: 'st-ended', provider_id: 'near', is_active: false, affiliation_status: 'ended' },
      ],
      provider_service_capabilities: [
        cap('near', { category_code: 'diagnostics', all_makes: false, vehicle_makes: ['Toyota'] }),
        cap('far', { category_code: 'diagnostics', all_makes: true }),
        cap('near', { category_code: 'hybrid_ev', status: 'declared', powertrains: ['hybrid'], all_makes: true }),
        cap('far', { category_code: 'hybrid_ev', status: 'verified', powertrains: ['hybrid', 'electric'], all_makes: true }),
        cap('near', { category_code: 'brakes_steering_suspension', staff_id: 'st-ended' }),
        cap('near', { category_code: 'tyres_wheels_alignment', staff_id: 'st-live' }),
        cap('near', { category_code: 'roadside_recovery', serves_roadside_location: true }),
        cap('nocoords', { category_code: 'roadside_recovery', serves_roadside_location: true }),
        cap('far', { category_code: 'transmission_drivetrain', status: 'revoked' }),
      ],
    });
  });
  const ids = async (f) => (await searchEligibleProviders(f)).items.map((i) => i.id);
  test('make filter: declared makes or all_makes', async () => {
    expect(await ids({ category: 'diagnostics', make: 'toyota' })).toEqual(expect.arrayContaining(['near', 'far']));
    expect(await ids({ category: 'diagnostics', make: 'Subaru' })).toEqual(['far']);
  });
  test('high-risk hybrid/EV: declared-only is never matched, verified is', async () => {
    expect(await ids({ category: 'hybrid_ev', powertrain: 'hybrid' })).toEqual(['far']);
  });
  test('powertrain must be covered', async () => {
    expect(await ids({ category: 'hybrid_ev', powertrain: 'electric' })).toEqual(['far']);
  });
  test('staff capability counts only with a live confirmed affiliation', async () => {
    expect(await ids({ category: 'brakes_steering_suspension' })).toEqual([]);
    expect(await ids({ category: 'tyres_wheels_alignment' })).toEqual(['near']);
  });
  test('revoked capability never matches', async () => {
    expect(await ids({ category: 'transmission_drivetrain' })).toEqual([]);
  });
  test('distance is computed from real coordinates only; unknown stays null', async () => {
    const r = (await searchEligibleProviders({ nearLat: -1.286, nearLng: 36.817 })).items;
    const by = Object.fromEntries(r.map((i) => [i.id, i]));
    expect(by.near.distanceKm).toBeGreaterThan(0);
    expect(by.near.distanceKm).toBeLessThan(2);
    expect(by.far.distanceKm).toBeGreaterThan(400);
    expect(by.nocoords.distanceKm).toBeNull();
    expect(by.nocoords.withinServiceRadius).toBeNull();
    expect(r[0].id).toBe('near');
  });
  test('roadside only returns providers whose real radius covers the point; null coverage is excluded', async () => {
    const r = await ids({ category: 'roadside_recovery', atVehicleLocation: 'true', nearLat: -1.3, nearLng: 36.8 });
    expect(r).toEqual(['near']);
    expect(await ids({ category: 'roadside_recovery', atVehicleLocation: 'true' })).toEqual([]);
  });
  test('unknown category/powertrain are ignored, not trusted', () => {
    const f = normaliseFilters({ category: 'bogus', powertrain: 'steam', nearLat: '999', nearLng: '1' });
    expect(f.category).toBeNull(); expect(f.powertrain).toBeNull(); expect(Number.isNaN(f.nearLat)).toBe(true);
  });
  test('haversine sanity and invalid input', () => {
    expect(Math.round(haversineKm(-1.286, 36.817, -4.05, 39.66))).toBeGreaterThan(400);
    expect(haversineKm(null, 1, 2, 3)).toBeNull();
  });
  test('public capability exposes no evidence or notes', () => {
    const p = publicCapability({ ...cap('x'), review_notes: 'secret', evidence_credential_id: 'c1' });
    expect(JSON.stringify(p)).not.toMatch(/secret|c1/);
  });
});

describe('admin provider verification', () => {
  const base = () => createFakeSupabase({
    inspection_providers: [prov({ id: 'p1', user_id: OWNER, lifecycle_stage: 'UNDER_REVIEW', status: 'pending', verification_status: 'unverified', registration_number: 'CR-1' })],
    provider_credentials: [], inspection_status_history: [], provider_service_capabilities: [], inspection_staff: [],
  });
  beforeEach(() => { fake = base(); });
  const addCred = (o) => fake.tables.provider_credentials.push({ id: undefined, provider_id: 'p1', verification_status: 'verified', ...o });

  test('approval needs a route and notes', async () => {
    await expect(gov.adminDecideProvider(ADMIN, 'p1', { decision: 'approve', notes: 'x' })).rejects.toThrow(/route/);
    await expect(gov.adminDecideProvider(ADMIN, 'p1', { decision: 'approve', route: 'premises' })).rejects.toThrow(/notes/i);
  });
  test('premises route: needs address+workshop and a verified credential', async () => {
    await expect(gov.adminDecideProvider(ADMIN, 'p1', { decision: 'approve', route: 'premises', notes: 'n' })).rejects.toThrow(/verified credential/);
    addCred({});
    const r = await gov.adminDecideProvider(ADMIN, 'p1', { decision: 'approve', route: 'premises', notes: 'visited' });
    expect(r.lifecycle_stage).toBe('ACTIVE');
    expect(fake.tables.inspection_providers[0].verification_route).toBe('premises');
    expect(fake.tables.inspection_status_history).toHaveLength(1);
  });
  test('alternative route is not a shortcut: needs registration/tax id AND two verified pieces of evidence', async () => {
    fake.tables.inspection_providers[0].has_workshop = false; fake.tables.inspection_providers[0].address = null;
    addCred({});
    await expect(gov.adminDecideProvider(ADMIN, 'p1', { decision: 'approve', route: 'alternative', notes: 'n' })).rejects.toThrow(/two verified/);
    addCred({});
    expect((await gov.adminDecideProvider(ADMIN, 'p1', { decision: 'approve', route: 'alternative', notes: 'registry checked' })).lifecycle_stage).toBe('ACTIVE');
    fake = base(); fake.tables.inspection_providers[0].registration_number = null; addCred({}); addCred({});
    await expect(gov.adminDecideProvider(ADMIN, 'p1', { decision: 'approve', route: 'alternative', notes: 'n' })).rejects.toThrow(/registration or tax/);
  });
  test('expired credentials do not count', async () => {
    addCred({ expires_at: '2000-01-01T00:00:00Z' });
    await expect(gov.adminDecideProvider(ADMIN, 'p1', { decision: 'approve', route: 'premises', notes: 'n' })).rejects.toThrow(/verified credential/);
  });
  test('no self-decision', async () => {
    addCred({});
    await expect(gov.adminDecideProvider(OWNER, 'p1', { decision: 'approve', route: 'premises', notes: 'n' })).rejects.toThrow(/own/);
  });
  test('suspend requires reason, only from active, and reinstate only from suspended; both audited', async () => {
    await expect(gov.adminDecideProvider(ADMIN, 'p1', { decision: 'suspend', reason: 'r' })).rejects.toThrow(/cannot be suspended/);
    fake.tables.inspection_providers[0].lifecycle_stage = 'ACTIVE';
    await expect(gov.adminDecideProvider(ADMIN, 'p1', { decision: 'suspend' })).rejects.toThrow(/reason/);
    const s = await gov.adminDecideProvider(ADMIN, 'p1', { decision: 'suspend', reason: 'complaints' });
    expect(s.lifecycle_stage).toBe('SUSPENDED');
    fake.tables.inspection_providers[0].verification_status = 'verified';
    expect((await gov.adminDecideProvider(ADMIN, 'p1', { decision: 'reinstate' })).lifecycle_stage).toBe('ACTIVE');
    expect(fake.tables.inspection_status_history).toHaveLength(2);
  });
  test('stale concurrent decision is rejected (optimistic concurrency)', async () => {
    addCred({});
    const realFrom = fake.from;
    fake.from = (n) => {
      const b = realFrom(n);
      if (n !== 'inspection_providers') return b;
      const upd = b.update.bind(b);
      b.update = (patch) => { fake.tables.inspection_providers[0].lifecycle_stage = 'INACTIVE'; return upd(patch); };
      return b;
    };
    await expect(gov.adminDecideProvider(ADMIN, 'p1', { decision: 'approve', route: 'premises', notes: 'n' })).rejects.toThrow(/changed while you were reviewing/);
    expect(fake.tables.inspection_providers[0].lifecycle_stage).toBe('INACTIVE');
    expect(fake.tables.inspection_status_history).toHaveLength(0);
  });
  test('credential verification needs a document, a non-expired credential and notes', async () => {
    fake.tables.provider_credentials.push({ id: 'c-nodoc', provider_id: 'p1', verification_status: 'unverified' });
    await expect(gov.adminDecideCredential(ADMIN, 'c-nodoc', { decision: 'verify', notes: 'n' })).rejects.toThrow(/document/);
    fake.tables.provider_credentials.push({ id: 'c-exp', provider_id: 'p1', document_url: 'u', expires_at: '2001-01-01T00:00:00Z' });
    await expect(gov.adminDecideCredential(ADMIN, 'c-exp', { decision: 'verify', notes: 'n' })).rejects.toThrow(/expired/);
    fake.tables.provider_credentials.push({ id: 'c-ok', provider_id: 'p1', document_url: 'u' });
    await expect(gov.adminDecideCredential(ADMIN, 'c-ok', { decision: 'verify' })).rejects.toThrow(/notes/);
    expect((await gov.adminDecideCredential(ADMIN, 'c-ok', { decision: 'verify', notes: 'checked' })).verificationStatus).toBe('verified');
  });
});

describe('capabilities: declared vs verified, high-risk controls', () => {
  beforeEach(() => {
    fake = createFakeSupabase({
      inspection_providers: [prov({ id: 'p1', user_id: OWNER })],
      provider_credentials: [{ id: 'c-ev', provider_id: 'p1', verification_status: 'unverified' }, { id: 'c-ev2', provider_id: 'p1', verification_status: 'verified' }],
      provider_service_capabilities: [], inspection_status_history: [], inspection_staff: [],
    });
  });
  test('declaring never verifies; unknown category rejected; roadside flag only where the category travels', async () => {
    const c = await gov.declareCapability(OWNER, 'p1', { category: 'diagnostics', travelsToCustomer: true });
    expect(c.status).toBe('declared');
    expect(c.serves_roadside_location).toBe(false);
    await expect(gov.declareCapability(OWNER, 'p1', { category: 'nonsense' })).rejects.toThrow(/Unknown service category/);
    const rs = await gov.declareCapability(OWNER, 'p1', { category: 'roadside_recovery', travelsToCustomer: true });
    expect(rs.serves_roadside_location).toBe(true);
  });
  test('re-declaring a verified capability returns it to declared (no silent carry-over)', async () => {
    const c = await gov.declareCapability(OWNER, 'p1', { category: 'diagnostics', subcategory: null, allMakes: true });
    await gov.adminDecideCapability(ADMIN, c.id, { decision: 'verify', notes: 'checked' });
    expect(fake.tables.provider_service_capabilities[0].status).toBe('verified');
    await gov.declareCapability(OWNER, 'p1', { category: 'diagnostics', allMakes: false, vehicleMakes: ['BMW'] });
    expect(fake.tables.provider_service_capabilities).toHaveLength(1);
    expect(fake.tables.provider_service_capabilities[0].status).toBe('declared');
  });
  test('high-risk hybrid/EV needs an attached, verified qualification', async () => {
    const noEv = await gov.declareCapability(OWNER, 'p1', { category: 'hybrid_ev', powertrains: ['hybrid'] });
    await expect(gov.adminDecideCapability(ADMIN, noEv.id, { decision: 'verify', notes: 'n' })).rejects.toThrow(/qualification/);
    const unver = await gov.declareCapability(OWNER, 'p1', { category: 'hybrid_ev', subcategory: null, powertrains: ['hybrid'], evidenceCredentialId: 'c-ev' });
    await expect(gov.adminDecideCapability(ADMIN, unver.id, { decision: 'verify', notes: 'n' })).rejects.toThrow(/not been verified/);
    const ok = await gov.declareCapability(OWNER, 'p1', { category: 'hybrid_ev', powertrains: ['hybrid'], evidenceCredentialId: 'c-ev2' });
    expect((await gov.adminDecideCapability(ADMIN, ok.id, { decision: 'verify', notes: 'HV cert sighted' })).status).toBe('verified');
  });
  test('evidence must belong to the same provider', async () => {
    fake.tables.provider_credentials.push({ id: 'c-other', provider_id: 'someone-else', verification_status: 'verified' });
    await expect(gov.declareCapability(OWNER, 'p1', { category: 'hybrid_ev', evidenceCredentialId: 'c-other' })).rejects.toThrow(/this provider/);
  });
  test('business must be active+verified for a capability to be verified; suspended cannot edit', async () => {
    const c = await gov.declareCapability(OWNER, 'p1', { category: 'diagnostics' });
    fake.tables.inspection_providers[0].lifecycle_stage = 'SUSPENDED'; fake.tables.inspection_providers[0].status = 'suspended';
    await expect(gov.adminDecideCapability(ADMIN, c.id, { decision: 'verify', notes: 'n' })).rejects.toThrow(/verified and active/);
    await expect(gov.declareCapability(OWNER, 'p1', { category: 'diagnostics' })).rejects.toThrow(/suspended/);
  });
  test('revocation needs a reason and is audited', async () => {
    const c = await gov.declareCapability(OWNER, 'p1', { category: 'diagnostics' });
    await expect(gov.adminDecideCapability(ADMIN, c.id, { decision: 'revoke' })).rejects.toThrow(/reason/);
    expect((await gov.adminDecideCapability(ADMIN, c.id, { decision: 'revoke', notes: 'fraud' })).status).toBe('revoked');
    expect(fake.tables.inspection_status_history.some((h) => h.entity_type === 'capability' && h.to_status === 'revoked')).toBe(true);
  });
});

describe('staff affiliation: two-sided, ended is not current', () => {
  const MECH = 'cccccccc-0000-4000-8000-000000000003';
  beforeEach(() => {
    fake = createFakeSupabase({
      inspection_providers: [prov({ id: 'p1', user_id: OWNER }), prov({ id: 'p-inactive', lifecycle_stage: 'UNDER_REVIEW', status: 'pending', verification_status: 'unverified', user_id: 'x' })],
      users: [{ id: MECH, name: 'Jane Mech', email: 'jane@x.co', status: 'approved' }, { id: 'banned', name: 'B', email: 'b@x.co', status: 'approved', is_banned: true }],
      inspection_staff: [], provider_service_capabilities: [], inspection_status_history: [],
    });
  });
  test('a typed name is not an affiliation: request alone stays pending and inactive', async () => {
    const s = await gov.requestAffiliation(MECH, 'p1', 'mechanic');
    expect(s.affiliation_status).toBe('pending'); expect(s.is_active).toBe(false);
  });
  test('confirmed only once both sides consent', async () => {
    const s = await gov.requestAffiliation(MECH, 'p1', 'mechanic');
    const after = await gov.confirmAffiliationByBusiness(OWNER, 'p1', s.id);
    expect(after.affiliation_status).toBe('confirmed'); expect(after.is_active).toBe(true);
  });
  test('business invite is pending until the person accepts; only that person can accept', async () => {
    const s = await gov.inviteStaff(OWNER, 'p1', 'JANE@x.co', 'mechanic');
    expect(s.affiliation_status).toBe('pending');
    await expect(gov.acceptAffiliation('someone-else', s.id)).rejects.toThrow(/not found/i);
    expect((await gov.acceptAffiliation(MECH, s.id)).affiliation_status).toBe('confirmed');
  });
  test('cannot affiliate with a business that is not active; banned users are refused', async () => {
    await expect(gov.requestAffiliation(MECH, 'p-inactive', 'm')).rejects.toThrow(/not currently accepting/);
    await expect(gov.requestAffiliation('banned', 'p1', 'm')).rejects.toThrow(/not eligible/);
    await expect(gov.requestAffiliation(OWNER, 'p1', 'm')).rejects.toThrow(/own this business/);
  });
  test('ending an affiliation revokes that person’s capabilities and removes them from matching', async () => {
    const s = await gov.requestAffiliation(MECH, 'p1', 'mechanic');
    await gov.confirmAffiliationByBusiness(OWNER, 'p1', s.id);
    await gov.declareCapability(OWNER, 'p1', { category: 'diagnostics', staffId: s.id, allMakes: true });
    const capId = fake.tables.provider_service_capabilities[0].id;
    await gov.adminDecideCapability(ADMIN, capId, { decision: 'verify', notes: 'ok' });
    expect((await searchEligibleProviders({ category: 'diagnostics' })).items).toHaveLength(1);
    await gov.endAffiliation(OWNER, s.id, { providerId: 'p1' });
    expect(fake.tables.inspection_staff[0].affiliation_status).toBe('ended');
    expect(fake.tables.provider_service_capabilities[0].status).toBe('revoked');
    expect((await searchEligibleProviders({ category: 'diagnostics' })).items).toHaveLength(0);
  });
  test('a staff-bound capability cannot be declared for someone not confirmed, or from another business', async () => {
    const s = await gov.requestAffiliation(MECH, 'p1', 'mechanic');
    await expect(gov.declareCapability(OWNER, 'p1', { category: 'diagnostics', staffId: s.id })).rejects.toThrow(/confirmed affiliation/);
    await expect(gov.endAffiliation(OWNER, s.id, { providerId: 'p-inactive' })).rejects.toThrow(/not found/i);
  });
});
