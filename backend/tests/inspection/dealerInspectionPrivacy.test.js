import { jest } from '@jest/globals';

const insp = [{ id: 'vi1', car: 'c1', status: 'requested', notes: JSON.stringify({ phone: '+254700111222', location: 'Karen', fee: 2500 }), report: { secret: 'buyer-only' }, checklist: [{ k: 'x' }], inspectorNotes: 'private', requester_id: 'buyer1', createdAt: '2026-10-01', scheduledAt: null, completedAt: null }];
const sortable = (rows) => ({ sort: async () => rows });
const stub = (name) => jest.unstable_mockModule(name, () => ({ default: {} }));
['../../models/User.js', '../../models/Dealer.js', '../../models/DealerAnalytics.js', '../../models/Escrow.js', '../../models/MarketingCampaign.js'].forEach(stub);
jest.unstable_mockModule('../../models/InspectionOrder.js', () => ({ default: { find: () => sortable(insp) } }));
jest.unstable_mockModule('../../models/Car.js', () => ({ default: { find: async () => [{ id: 'c1', title: '2019 Mazda CX-5' }] } }));
jest.unstable_mockModule('../../services/review.service.js', () => ({ listDealerReviews: jest.fn() }));
jest.unstable_mockModule('../../controllers/carController.js', () => ({ createCar: jest.fn(), updateCar: jest.fn(), deleteCar: jest.fn() }));
jest.unstable_mockModule('../../utils/logger.js', () => ({ logError: jest.fn(), logInfo: jest.fn(), logWarn: jest.fn() }));
jest.unstable_mockModule('../../services/dealerSubscription.service.js', () => ({ getDealerEntitlement: jest.fn() }));
jest.unstable_mockModule('../../services/leadService.js', () => ({ getDealerLeads: jest.fn(), getLeadById: jest.fn(), updateLeadStage: jest.fn(), addLeadActivity: jest.fn() }));
jest.unstable_mockModule('../../db/index.js', () => ({ create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), update: jest.fn() }));
jest.unstable_mockModule('../../services/auditService.js', () => ({ logAuditEvent: jest.fn() }));
jest.unstable_mockModule('../../services/email.service.js', () => ({ sendTeamInviteEmail: jest.fn() }));

const { getInspectionOrders } = await import('../../controllers/dealerPlatformController.js');

test("a seller's inspection list never carries the buyer's phone, request notes, report or inspector notes", async () => {
  const r = { body: null, json(b) { this.body = b; return this; }, status() { return this; } };
  await getInspectionOrders({ user: { id: 'dealer1' } }, r);
  const item = r.body.data.items[0];
  expect(item).toEqual({ id: 'vi1', vehicleId: 'c1', vehicle: '2019 Mazda CX-5', status: 'requested', scheduledAt: null, completedAt: null, createdAt: '2026-10-01' });
  const dump = JSON.stringify(r.body);
  for (const leaked of ['+254700111222', 'Karen', 'buyer-only', 'private', 'buyer1', 'notes', 'report']) expect(dump).not.toContain(leaked);
  expect(r.body.data.stats.scheduled).toBe(1);
});
