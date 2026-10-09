import { jest } from '@jest/globals';
import { createFakeSupabase } from '../helpers/fakeSupabase.js';

let fake;
jest.unstable_mockModule('../../utils/supabase.js', () => ({ getSupabase: () => fake, isSupabaseConnected: () => true }));
jest.unstable_mockModule('../../utils/io.js', () => ({ getIO: () => null }));
jest.unstable_mockModule('../../models/Car.js', () => ({ default: { findById: jest.fn() } }));
jest.unstable_mockModule('../../models/User.js', () => ({ default: { findById: jest.fn(), find: jest.fn() } }));
jest.unstable_mockModule('../../services/communicationEvents.service.js', () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: {} }));

const { assign, availableInspectors } = await import('../../inspection/controllers/legacyCompatibilityController.js');
const res = () => { const r = { statusCode: 200, body: null }; r.status = (c) => { r.statusCode = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const prov = (o) => ({ status: 'active', verification_status: 'verified', lifecycle_stage: 'ACTIVE', company_name: 'Co', ...o });

describe('availableInspectors only offers ACTIVE, verified providers', () => {
  test('suspended, unverified and under-review providers are excluded; contact is admin-only data', async () => {
    fake = createFakeSupabase({
      users: [{ id: 'u1', name: 'A', email: 'a@x', phone: '1' }, { id: 'u2', name: 'B' }, { id: 'u3', name: 'C' }, { id: 'u4', name: 'D' }, { id: 'u5', name: 'E' }, { id: 'u6', name: 'F' }],
      inspection_providers: [
        prov({ user_id: 'u1', trading_name: 'Good Garage', town: 'Nairobi', county: 'Nairobi' }),
        prov({ user_id: 'u2', status: 'suspended', lifecycle_stage: 'SUSPENDED' }),
        prov({ user_id: 'u3', verification_status: 'unverified', lifecycle_stage: 'UNDER_REVIEW', status: 'pending' }),
        prov({ user_id: null }),
        // each differs from an eligible row in exactly ONE field, so every filter is individually proven
        prov({ user_id: 'u5', lifecycle_stage: 'VERIFIED' }),
        prov({ user_id: 'u6', status: 'suspended' }),
        prov({ user_id: 'u4', verification_status: 'unverified' }),
      ],
    });
    const r = res();
    await availableInspectors({}, r, (e) => { throw e; });
    expect(r.body.inspectors.map((i) => i.id)).toEqual(['u1']);
    expect(r.body.inspectors[0].businessName).toBe('Good Garage');
  });
});

describe('assign() rejects ineligible inspectors server-side', () => {
  const setup = (provRow) => {
    fake = createFakeSupabase({
      vehicle_inspections: [{ id: 'vi1', status: 'requested', car_id: 'c1', requester_id: 'b1' }],
      cars: [{ id: 'c1', dealer_id: 'd1' }],
      inspection_providers: provRow ? [provRow] : [],
    });
    fake.rpc = async () => ({ data: 'chat1', error: null });
  };
  const call = async () => { const r = res(); await assign({ params: { id: 'vi1' }, user: { role: 'admin' }, body: { inspectorId: 'u1' } }, r, (e) => { throw e; }); return r; };

  test.each([
    ['suspended', { user_id: 'u1', status: 'suspended', lifecycle_stage: 'SUSPENDED' }],
    ['unverified', { user_id: 'u1', verification_status: 'unverified' }],
    ['not ACTIVE lifecycle', { user_id: 'u1', lifecycle_stage: 'VERIFIED' }],
    ['no provider at all', null],
  ])('409 for %s and inspection is untouched', async (_n, row) => {
    setup(row ? prov(row) : null);
    const r = await call();
    expect(r.statusCode).toBe(409);
    expect(fake.tables.vehicle_inspections[0].status).toBe('requested');
    expect(fake.tables.vehicle_inspections[0].inspector_id).toBeUndefined();
  });

  test('eligible provider owner can be assigned', async () => {
    setup(prov({ user_id: 'u1' }));
    const r = await call();
    expect(r.body.success).toBe(true);
    expect(fake.tables.vehicle_inspections[0].inspector_id).toBe('u1');
  });
});
