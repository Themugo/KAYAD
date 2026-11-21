import { jest } from '@jest/globals';

const resolveLead = jest.fn();
const findById = jest.fn();
const setLeadNotes = jest.fn();
const updateLeadStage = jest.fn();
const archiveLead = jest.fn();
const markLeadAsHot = jest.fn();
const addLeadActivity = jest.fn();
const getDealerLeads = jest.fn();
const getLeadById = jest.fn();
const getLeadPipeline = jest.fn();
const getLeadAnalytics = jest.fn();
const calculateConversionRate = jest.fn();
const calculateResponseTime = jest.fn();
const getLeadTimeline = jest.fn();
const logInfo = jest.fn();
const logError = jest.fn();

jest.unstable_mockModule('../../services/leadService.js', () => ({
  getDealerLeads, getLeadById, resolveLead, setLeadNotes, updateLeadStage, archiveLead,
  markLeadAsHot, addLeadActivity, getLeadPipeline, getLeadAnalytics,
  calculateConversionRate, calculateResponseTime,
}));
jest.unstable_mockModule('../../services/leadTimelineService.js', () => ({ getLeadTimeline }));
jest.unstable_mockModule('../../db/index.js', () => ({ findById }));
jest.unstable_mockModule('../../utils/logger.js', () => ({ logInfo, logError }));
jest.unstable_mockModule('../../middleware/auth.js', () => ({ protect: jest.fn(), adminOnly: jest.fn(), dealerOnly: jest.fn() }));

const { createLeadManual, addNote } = await import('../../controllers/leadController.js');
const { createLeadSchema, leadNoteSchema } = await import('../../validation/lead.schema.js');

const response = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

describe('lead controller persistence contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('manual creation persists optional notes through the Supabase-backed service', async () => {
    findById.mockImplementation(async (table) => (table === 'cars' ? { id: 'vehicle-1', dealer: 'dealer-1' } : { id: 'buyer-1' }));
    resolveLead.mockResolvedValue({ lead: { id: 'lead-1', buyer: 'buyer-1', dealer: 'dealer-1' }, created: true });
    setLeadNotes.mockResolvedValue({ id: 'lead-1', notes: 'Call tomorrow' });
    const res = response();

    await createLeadManual({
      body: { buyerId: 'buyer-1', vehicleId: 'vehicle-1', source: 'manual', notes: 'Call tomorrow' },
      user: { id: 'dealer-1', role: 'dealer' },
    }, res);

    expect(resolveLead).toHaveBeenCalledWith('buyer-1', 'dealer-1', 'vehicle-1', 'manual', null);
    expect(setLeadNotes).toHaveBeenCalledWith('lead-1', 'Call tomorrow');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, created: true, lead: { id: 'lead-1', notes: 'Call tomorrow' } });
  });

  test('manual creation rejects a vehicle owned by another dealer before any mutation (role gate is route-level dealerOnly)', async () => {
    findById.mockImplementation(async (table) => (table === 'cars' ? { id: 'vehicle-9', dealer: 'another-dealer' } : { id: 'buyer-9' }));
    const res = response();

    await createLeadManual({
      body: { buyerId: 'buyer-9', vehicleId: 'vehicle-9', source: 'manual' },
      user: { id: 'dealer-9', role: 'dealer' },
    }, res);

    expect(res.statusCode).toBe(403);
    expect(resolveLead).not.toHaveBeenCalled();
    expect(setLeadNotes).not.toHaveBeenCalled();
  });

  test('manual creation without notes does not perform a second write', async () => {
    findById.mockResolvedValue({ id: 'buyer-2' });
    resolveLead.mockResolvedValue({ lead: { id: 'lead-2' }, created: true });
    const res = response();

    await createLeadManual({
      body: { buyerId: 'buyer-2', source: 'manual' },
      user: { id: 'dealer-2', role: 'dealer' },
    }, res);

    expect(setLeadNotes).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.body.lead).toEqual({ id: 'lead-2' });
  });

  test('adding a note checks existing lead access then uses the persistence service and activity pathway', async () => {
    getLeadById.mockResolvedValue({ id: 'lead-3', dealer: 'dealer-3' });
    setLeadNotes.mockResolvedValue({ id: 'lead-3', notes: 'Buyer called' });
    addLeadActivity.mockResolvedValue({ id: 'lead-3', notes: 'Buyer called' });
    const res = response();

    await addNote({
      params: { leadId: 'lead-3' },
      body: { note: 'Buyer called' },
      user: { id: 'dealer-3', role: 'dealer' },
    }, res);

    expect(setLeadNotes).toHaveBeenCalledWith('lead-3', 'Buyer called');
    expect(addLeadActivity).toHaveBeenCalledWith('lead-3', 'note_added', 'dealer-3', {
      description: 'Note added',
      metadata: { note: 'Buyer called' },
    });
    expect(res.body).toEqual({ success: true, lead: { id: 'lead-3', notes: 'Buyer called' } });
  });

  test('adding a note rejects a user who does not own the lead before any mutation', async () => {
    getLeadById.mockResolvedValue({ id: 'lead-4', dealer: 'another-dealer' });
    const res = response();

    await addNote({
      params: { leadId: 'lead-4' },
      body: { note: 'unauthorized change' },
      user: { id: 'dealer-4', role: 'dealer' },
    }, res);

    expect(res.statusCode).toBe(403);
    expect(setLeadNotes).not.toHaveBeenCalled();
    expect(addLeadActivity).not.toHaveBeenCalled();
  });

  // Whitespace trimming moved from the controller to the route-level zod schemas (validate(...) runs before the controller).
  test('route schemas trim notes before the controller sees them', () => {
    expect(leadNoteSchema.parse({ note: '  Buyer called  ' }).note).toBe('Buyer called');
    expect(() => leadNoteSchema.parse({ note: '   ' })).toThrow();
    expect(createLeadSchema.parse({ buyerId: '11111111-1111-4111-8111-111111111111', source: 'manual', notes: '  Call tomorrow  ' }).notes).toBe('Call tomorrow');
  });
});
