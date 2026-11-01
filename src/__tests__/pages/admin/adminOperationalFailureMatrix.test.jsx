// Super Admin operational data screens: success / genuinely empty / maintenance 503 / 401 / 403 / 5xx / retry / stale retention.
// One matrix, run against the real page components with only the network layer mocked. The rule under test:
// a failed read is never shown as an empty queue or a confirmed zero, previous data is kept and labelled stale,
// and Retry calls the screen's own loader and recovers the view.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const m = vi.hoisted(() => ({
  adminAPI: { users: vi.fn(), cars: vi.fn(), toggleBan: vi.fn(), approveDealer: vi.fn(), deleteCar: vi.fn(), moderateCar: vi.fn(), updateSellerSettings: vi.fn(), inspectorApplications: vi.fn(), reviewInspector: vi.fn(), getEscrowConfig: vi.fn(), updateEscrowConfig: vi.fn(), addEscrowAccount: vi.fn(), deleteEscrowAccount: vi.fn() },
  carsAPI: { list: vi.fn() },
  auctionAdminAPI: {},
  bulkAdminAPI: {},
  escrowAPI: { operationsDashboard: vi.fn(), all: vi.fn(), operationsCase: vi.fn() },
  adminPaymentsAPI: { list: vi.fn() },
  ntsaAPI: { list: vi.fn() },
  inspectionAPI: { list: vi.fn(), availableInspectors: vi.fn(), assign: vi.fn() },
  adminVerificationAPI: { list: vi.fn() },
  bid: { fetchAdminBids: vi.fn(), fetchSuspiciousBids: vi.fn(), setBidWinner: vi.fn() },
  toast: { toast: vi.fn() },
}));
vi.mock('../../../api/api', async (orig) => ({ ...(await orig()), adminAPI: m.adminAPI, carsAPI: m.carsAPI, auctionAdminAPI: m.auctionAdminAPI, bulkAdminAPI: m.bulkAdminAPI, escrowAPI: m.escrowAPI, adminPaymentsAPI: m.adminPaymentsAPI, ntsaAPI: m.ntsaAPI, inspectionAPI: m.inspectionAPI, adminVerificationAPI: m.adminVerificationAPI }));
vi.mock('../../../services/bidApi', () => m.bid);
vi.mock('../../../context/ToastContext', () => ({ useToast: () => m.toast }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1', role: 'superadmin', name: 'Super' } }) }));

import AdminUsers from '../../../pages/admin/AdminUsers';
import AdminSellers from '../../../pages/admin/AdminSellers';
import AdminCars from '../../../pages/admin/AdminCars';
import AdminCarModeration from '../../../pages/admin/AdminCarModeration';
import AdminAuctions from '../../../pages/admin/AdminAuctions';
import AdminBids from '../../../pages/admin/AdminBids';
import AdminEscrows from '../../../pages/admin/AdminEscrows';
import AdminEscrowCustody from '../../../pages/admin/AdminEscrowCustody';
import AdminTransactions from '../../../pages/admin/AdminTransactions';
import AdminNtsaQueue from '../../../pages/admin/AdminNtsaQueue';
import AdminInspections from '../../../pages/admin/AdminInspections';
import AdminDealerVerifications from '../../../pages/admin/AdminDealerVerifications';
import AdminInspectorApplications from '../../../pages/admin/AdminInspectorApplications';

const httpError = (status, data = {}) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } });
const MAINTENANCE = () => httpError(503, { success: false, code: 'SYSTEM_MAINTENANCE', maintenance: true, scope: 'global', message: 'System under scheduled maintenance.' });

const car = (id, title) => ({ _id: id, title, brand: 'Toyota', model: 'Prado', year: 2018, price: 5000000, status: 'available', auctionStatus: 'live', images: [], createdAt: '2026-10-20T10:00:00Z', dealer: { name: 'Dealer' } });
const SUMMARY0 = { totalUsers: 0, admins: 0, dealers: 0, banned: 0, pendingApproval: 0 };

// primary: the vi.fn whose result drives the screen. ok()/empty() are what the real endpoint returns.
const SCREENS = [
  { name: 'Users', Comp: AdminUsers, primary: m.adminAPI.users, refresh: /Refresh records/i, record: 'Amina Wanjiru', emptyRe: /No user records returned/i,
    ok: () => ({ users: [{ _id: 'u1', name: 'Amina Wanjiru', email: 'amina@x.test', role: 'user', status: 'approved' }], pagination: { total: 1 }, summary: { ...SUMMARY0, totalUsers: 1 } }),
    empty: () => ({ users: [], pagination: { total: 0 }, summary: SUMMARY0 }) },
  { name: 'Sellers / pending dealers', Comp: AdminSellers, primary: m.adminAPI.users, refresh: /Refresh sellers/i, record: 'Dealer One Motors', emptyRe: /No sellers found/i,
    ok: () => ({ users: [{ _id: 'd1', name: 'Dealer One', businessName: 'Dealer One Motors', email: 'd@x.test', status: 'pending' }], pagination: { total: 1 } }),
    empty: () => ({ users: [], pagination: { total: 0 } }) },
  { name: 'Vehicle records / Listing Management', Comp: AdminCars, primary: m.adminAPI.cars, refresh: /Refresh listings/i, record: 'Prado TX Alpha', emptyRe: /No listings are currently available/i,
    ok: () => ({ cars: [car('c1', 'Prado TX Alpha')], pagination: { total: 1 } }), empty: () => ({ cars: [], pagination: { total: 0 } }) },
  { name: 'Car Moderation Queue', Comp: AdminCarModeration, primary: m.adminAPI.cars, refresh: /Refresh moderation queue/i, record: 'Prado TX Beta', emptyRe: /No listings found/i,
    ok: () => ({ cars: [car('c2', 'Prado TX Beta')], pagination: { total: 1 } }), empty: () => ({ cars: [], pagination: { total: 0 } }) },
  { name: 'Auction Control', Comp: AdminAuctions, primary: m.carsAPI.list, refresh: /Refresh auction records/i, record: 'Hilux Live Gamma', emptyRe: null,
    ok: () => ({ cars: [car('a1', 'Hilux Live Gamma')] }), empty: () => ({ cars: [] }) },
  { name: 'Bid Management', Comp: AdminBids, primary: m.bid.fetchAdminBids, alsoFails: [m.bid.fetchSuspiciousBids], refresh: /Refresh bids/i, record: 'Bidder Delta', emptyRe: /No bids match these filters/i,
    ok: () => ({ bids: [{ _id: 'b1', amount: 1000, status: 'pending', user: { name: 'Bidder Delta' }, car: { title: 'Car' }, createdAt: '2026-10-20T10:00:00Z' }], pagination: { total: 1 } }), empty: () => ({ bids: [], pagination: { total: 0 } }) },
  { name: 'Escrow Operations / Custody Control Room', Comp: AdminEscrows, primary: m.escrowAPI.all, refresh: /Refresh data/i, record: 'Escrow Car Epsilon', emptyRe: /Queue clear/i,
    ok: () => ({ escrows: [{ id: 'e1', status: 'funded', amount: 5000, car: { title: 'Escrow Car Epsilon' }, createdAt: '2026-10-20T10:00:00Z' }] }), empty: () => ({ escrows: [] }) },
  { name: 'Transactions', Comp: AdminTransactions, primary: m.adminPaymentsAPI.list, refresh: /Refresh/, record: 'Zeta Buyer', emptyRe: /No transactions match the selected filters/i,
    ok: () => ({ payments: [{ _id: 'p1', amount: 1000, type: 'purchase', status: 'success', createdAt: '2026-10-25T10:00:00Z', user: { name: 'Zeta Buyer', email: 'z@x.test' }, car: { title: 'Prado' }, reconciliation: { state: 'settled', reasons: [] } }], summary: { totalCollected: 1000, totalTransactions: 1 }, pagination: { total: 1 } }),
    empty: () => ({ payments: [], summary: { totalCollected: 0, totalTransactions: 0 }, pagination: { total: 0 } }) },
  { name: 'NTSA Verification Queue', Comp: AdminNtsaQueue, primary: m.ntsaAPI.list, refresh: /Refresh/i, record: 'Toyota Cruiser', emptyRe: null,
    ok: () => ({ requests: [{ _id: 'n1', status: 'pending', createdAt: '2026-10-20T10:00:00Z', car: { title: 'Toyota Cruiser', brand: 'Toyota', model: 'Cruiser' }, requestedBy: { name: 'Req' } }] }), empty: () => ({ requests: [] }) },
  { name: 'Inspection Orders', Comp: AdminInspections, primary: m.inspectionAPI.list, refresh: /Refresh/i, record: 'Theta Order', emptyRe: /No inspection orders yet/i,
    ok: () => ({ orders: [{ _id: 'i1', id: 'i1', status: 'requested', createdAt: '2026-10-20T10:00:00Z', title: 'Theta Order', car: { title: 'Theta Order' }, buyer: { name: 'B' } }] }), empty: () => ({ orders: [] }) },
  { name: 'Dealer Verifications', Comp: AdminDealerVerifications, primary: m.adminVerificationAPI.list, refresh: /Refresh dealer verifications/i, record: 'Iota Motors', emptyRe: /No verification requests match this filter/i,
    ok: () => ({ verifications: [{ _id: 'v1', status: 'pending', createdAt: '2026-10-20T10:00:00Z', user: { name: 'Iota User', email: 'i@x.test' }, dealer: { businessName: 'Iota Motors' } }], pagination: { page: 1, limit: 20, total: 1, pages: 1 }, summary: { pending: 1, approved: 0, rejected: 0, suspended: 0, total: 1 } }),
    empty: () => ({ verifications: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 }, summary: { pending: 0, approved: 0, rejected: 0, suspended: 0, total: 0 } }) },
  { name: 'Inspector Applications', Comp: AdminInspectorApplications, primary: m.adminAPI.inspectorApplications, refresh: /Refresh applications/i, record: 'Kappa Mechanic', emptyRe: null,
    ok: () => ({ applications: [{ id: 'ia1', _id: 'ia1', status: 'pending', fullName: 'Kappa Mechanic', name: 'Kappa Mechanic', email: 'k@x.test', createdAt: '2026-10-20T10:00:00Z' }], statusCounts: { pending: 1, approved: 0, rejected: 0, total: 1 }, pagination: { page: 1, limit: 20, total: 1, pages: 1 } }),
    empty: () => ({ applications: [], statusCounts: { pending: 0, approved: 0, rejected: 0, total: 0 }, pagination: { page: 1, limit: 20, total: 0, pages: 0 } }) },
];

function resetMocks() {
  vi.clearAllMocks();
  m.carsAPI.list.mockReset(); m.bid.fetchSuspiciousBids.mockResolvedValue({ bids: [] });
  m.escrowAPI.operationsDashboard.mockResolvedValue({ success: true, queues: { funded: { count: 1, amount: 5000 } } });
  m.inspectionAPI.availableInspectors.mockResolvedValue({ success: true, inspectors: [] });
}
function arm(s, impl, failing = () => false) {
  // secondary calls of the same screen (e.g. the suspicious-bid queue) are refused by maintenance too
  for (const f of s.alsoFails || []) f.mockImplementation(async () => { if (failing()) throw MAINTENANCE(); return { bids: [] }; });
  if (s.primary === m.carsAPI.list) m.carsAPI.list.mockImplementation(impl); else s.primary.mockImplementation(impl);
}
const renderScreen = (s) => render(<MemoryRouter><s.Comp /></MemoryRouter>);
const alerts = () => screen.queryAllByRole('alert');
const failureShown = (re) => waitFor(() => expect(alerts().some((a) => re.test(a.textContent))).toBe(true));
const clickRefresh = (s) => fireEvent.click(screen.getAllByRole('button', { name: s.refresh })[0]);

beforeEach(resetMocks);
afterEach(() => cleanup());

describe.each(SCREENS)('$name', (s) => {
  test('success with records shows the records and no failure notice', async () => {
    arm(s, async () => s.ok());
    renderScreen(s);
    expect((await screen.findAllByText(new RegExp(s.record))).length).toBeGreaterThan(0);
    expect(alerts().filter((a) => /could not be/i.test(a.textContent))).toHaveLength(0);
  });

  test('a successful EMPTY response is shown as genuinely empty', async () => {
    arm(s, async () => s.empty());
    renderScreen(s);
    if (s.emptyRe) expect(await screen.findByText(s.emptyRe)).toBeTruthy();
    else await waitFor(() => expect(screen.queryByText(new RegExp(s.record))).toBeNull());
    expect(alerts().filter((a) => /could not be/i.test(a.textContent))).toHaveLength(0);
  });

  test('HTTP 503 maintenance on first load: explicit maintenance failure, not an empty queue, no confirmed zero', async () => {
    arm(s, async () => { throw MAINTENANCE(); }, () => true);
    const { container } = renderScreen(s);
    await failureShown(/maintenance is active/i);
    if (s.emptyRe) expect(screen.queryByText(s.emptyRe)).toBeNull();
    expect(screen.queryByText(new RegExp(s.record))).toBeNull();
    // no stat tile may show a bare confirmed zero while the source is unavailable
    const zeros = Array.from(container.querySelectorAll('*')).filter((el) => el.children.length === 0 && /^\s*(KES\s*)?0\s*$/.test(el.textContent || ''));
    expect(zeros.map((z) => z.parentElement?.textContent)).toEqual([]);
  });

  test.each([
    [401, /sign in again/i], [403, /not permitted/i], [500, /server returned an error/i],
  ])('HTTP %i is reported as a failure with its own reason', async (status, re) => {
    arm(s, async () => { throw httpError(status, { message: 'raw server detail that must not be echoed' }); });
    renderScreen(s);
    await failureShown(re);
    expect(document.body.textContent).not.toMatch(/raw server detail/);
    if (s.emptyRe) expect(screen.queryByText(s.emptyRe)).toBeNull();
  });

  test('Retry / Refresh calls the same loader again and recovers the view after maintenance ends', async () => {
    let up = false;
    arm(s, async () => { if (!up) throw MAINTENANCE(); return s.ok(); }, () => !up);
    renderScreen(s);
    await failureShown(/maintenance is active/i);
    const calls = s.primary.mock.calls.length;
    up = true;
    const retry = screen.queryAllByRole('button', { name: /^(retry|try again|retry loading.*)$/i })[0] || screen.getAllByRole('button', { name: s.refresh })[0];
    fireEvent.click(retry);
    expect((await screen.findAllByText(new RegExp(s.record))).length).toBeGreaterThan(0);
    expect(s.primary.mock.calls.length).toBeGreaterThan(calls);
    await waitFor(() => expect(alerts().filter((a) => /could not be/i.test(a.textContent))).toHaveLength(0));
  });

  test('a failed refresh keeps the previously loaded data visible and labels it stale with the last refresh time', async () => {
    let fail = false;
    arm(s, async () => { if (fail) throw MAINTENANCE(); return s.ok(); }, () => fail);
    renderScreen(s);
    expect((await screen.findAllByText(new RegExp(s.record))).length).toBeGreaterThan(0);
    fail = true;
    clickRefresh(s);
    await failureShown(/maintenance is active|maintenance/i);
    expect(screen.getAllByText(new RegExp(s.record)).length).toBeGreaterThan(0);
    expect(document.body.textContent).toMatch(/stale|previous|last successful/i);
  });
});
