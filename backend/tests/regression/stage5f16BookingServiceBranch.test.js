// STAGE 5F.16 — bookingService changes (evidence tier M). Real BookingService; dbAdapter and the organization service are faked.
// Pins: assignment is NOT a generic status change; assignInspector delegates to the database authority with the REAL caller;
// customer branch choice must be an active branch of the booked provider; the inspector worklist honours live membership only.
import { jest } from '@jest/globals';

const rows = {}; const writes = [];
const matchVal = (rv, v) => (v && typeof v === 'object' && '$in' in v ? v.$in.includes(rv) : rv === v);
const matches = (r, f) => Object.entries(f).every(([k, v]) => (v && typeof v === 'object' && !('$in' in v) && !('$nin' in v) ? true : v && typeof v === 'object' && '$nin' in v ? !v.$nin.includes(r[k]) : matchVal(r[k], v)));
const db = {
  findById: jest.fn(async (t, id) => (rows[t] || []).find((r) => r.id === id) || null),
  findOne: jest.fn(async (t, f) => (rows[t] || []).find((r) => matches(r, f)) || null),
  find: jest.fn(async (t, f) => (rows[t] || []).filter((r) => matches(r, f))),
  count: jest.fn(async (t, f) => (rows[t] || []).filter((r) => matches(r, f)).length),
  create: jest.fn(async (t, d) => { writes.push(['create', t]); const r = { id: `new-${writes.length}`, ...d }; (rows[t] ||= []).push(r); return r; }),
  update: jest.fn(async (t, id, d) => { writes.push(['update', t, id, d]); const r = rows[t].find((x) => x.id === id); Object.assign(r, d); return r; }),
};
const assignBooking = jest.fn(async () => ({ ok: true }));
jest.unstable_mockModule('../../inspection/services/dbAdapter.js', () => ({ default: db }));
jest.unstable_mockModule('../../inspection/services/organizationService.js', () => ({ assignBooking }));
jest.unstable_mockModule('../../inspection/services/workforceService.js', () => ({ assertStaffAssignable: jest.fn() }));
jest.unstable_mockModule('../../utils/logger.js', () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule('../../config/metrics.js', () => ({ incrementCounter: jest.fn() }));

const { bookingService } = await import('../../inspection/services/bookingService.js');
const P = 'p1', OTHER = 'p2', B_OK = 'b-ok', B_SUSP = 'b-susp', B_OTHER = 'b-other';
const base = { packageId: 'pk1', customerName: 'C', customerEmail: 'c@x.co', customerPhone: '1', scheduledDate: '2026-12-01', scheduledTime: '10:00', isMobile: true };

beforeEach(() => {
  jest.clearAllMocks(); writes.length = 0;
  for (const k of Object.keys(rows)) delete rows[k];
  Object.assign(rows, {
    inspection_packages: [{ id: 'pk1', provider_id: P, is_active: true, price: 5000, currency: 'KES', inspection_type: 'pre_purchase' }],
    inspection_providers: [{ id: P, status: 'active', verification_status: 'verified', offers_mobile: true, has_workshop: true, country: 'KE' }],
    inspection_branches: [{ id: B_OK, provider_id: P, status: 'active' }, { id: B_SUSP, provider_id: P, status: 'suspended' }, { id: B_OTHER, provider_id: OTHER, status: 'active' }],
    inspection_bookings: [{ id: 'bk', provider_id: P, status: 'confirmed', payment_status: 'fully_paid' }],
    inspection_staff: [], inspection_status_history: [],
  });
});

describe('createBooking: optional branch', () => {
  test('an active branch of THIS provider is stored on the booking', async () => {
    const b = await bookingService.createBooking({ ...base, branchId: B_OK }, 'cust'); expect(b.branch_id).toBe(B_OK);
  });
  test.each([[B_SUSP], [B_OTHER], ['nonexistent']])('branch %s is refused with 400 and nothing is written', async (branchId) => {
    await expect(bookingService.createBooking({ ...base, branchId }, 'cust')).rejects.toMatchObject({ statusCode: 400 });
    expect(writes).toEqual([]);
  });
  test('no branch -> organization-level queue (null), unchanged behaviour', async () => { expect((await bookingService.createBooking(base, 'cust')).branch_id).toBeNull(); });
});

describe('assignment goes through the database authority only', () => {
  test('updateBookingStatus can no longer assign an inspector, whatever staffId is supplied; nothing is written', async () => {
    await expect(bookingService.updateBookingStatus('bk', 'inspector_assigned', 'owner', 'staff-1', null, P)).rejects.toMatchObject({ statusCode: 400 });
    expect(writes).toEqual([]);
  });
  test('assignInspector delegates with the real caller and does not write directly', async () => {
    await bookingService.assignInspector('bk', 'staff-1', 'caller-1', P);
    expect(assignBooking).toHaveBeenCalledWith('caller-1', 'bk', 'staff-1'); expect(writes).toEqual([]);
  });
  test('assignInspector refuses a booking of another provider before asking the database', async () => {
    await expect(bookingService.assignInspector('bk', 'staff-1', 'caller-1', OTHER)).rejects.toMatchObject({ statusCode: 403 });
    expect(assignBooking).not.toHaveBeenCalled();
  });
  test('a database refusal propagates unchanged', async () => {
    assignBooking.mockRejectedValueOnce(Object.assign(new Error('not allowed'), { statusCode: 403 }));
    await expect(bookingService.assignInspector('bk', 'staff-1', 'caller-1', P)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('getInspectorBookings honours live membership only', () => {
  const stf = (id, o) => ({ id, user_id: 'insp', is_active: true, affiliation_status: 'confirmed', branch_id: null, role: 'senior_inspector', ...o });
  beforeEach(() => { rows.inspection_bookings = [{ id: 'b1', assigned_staff_id: 'st1', status: 'inspector_assigned' }, { id: 'b2', assigned_staff_id: 'st2', status: 'inspector_assigned' }, { id: 'b3', assigned_staff_id: 'zz', status: 'inspector_assigned' }]; });
  const ids = async () => { jest.spyOn(bookingService, 'getBookingDetails').mockImplementation(async (id) => ({ id })); return (await bookingService.getInspectorBookings('insp')).items.map((x) => x.id).sort(); };
  test('all live memberships, across organizations, and nobody else\'s work', async () => { rows.inspection_staff = [stf('st1', {}), stf('st2', { provider_id: OTHER })]; expect(await ids()).toEqual(['b1', 'b2']); });
  test('an ended, suspended or pending membership exposes nothing', async () => {
    rows.inspection_staff = [stf('st1', { affiliation_status: 'ended', is_active: false }), stf('st2', { affiliation_status: 'suspended', is_active: false })]; expect(await ids()).toEqual([]);
  });
  test('a membership on a suspended branch exposes nothing; on an active branch it does', async () => {
    rows.inspection_staff = [stf('st1', { branch_id: B_SUSP }), stf('st2', { branch_id: B_OK })]; expect(await ids()).toEqual(['b2']);
  });
  test('no membership -> empty page, not an error', async () => { rows.inspection_staff = []; expect(await ids()).toEqual([]); });
});
