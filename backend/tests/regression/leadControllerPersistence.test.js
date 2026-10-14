import { jest } from '@jest/globals';

const createLead = jest.fn();
const updateLeadNotes = jest.fn();
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
  getDealerLeads, getLeadById, createLead, updateLeadNotes, updateLeadStage, archiveLead,
  markLeadAsHot, addLeadActivity, getLeadPipeline, getLeadAnalytics,
  calculateConversionRate, calculateResponseTime,
}));
jest.unstable_mockModule('../../services/leadTimelineService.js', () => ({ getLeadTimeline }));
jest.unstable_mockModule('../../utils/logger.js', () => ({ logInfo, logError }));
jest.unstable_mockModule('../../middleware/auth.js', () => ({ protect: jest.fn() }));

const { createLeadManual, addNote } = await import('../../controllers/leadController.js');

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
    createLead.mockResolvedValue({ id: 'lead-1', buyer: 'buyer-1', dealer: 'dealer-1' });
    updateLeadNotes.mockResolvedValue({ id: 'lead-1', notes: 'Call tomorrow' });
    const res = response();

    await createLeadManual({
      body: { buyerId: 'buyer-1', vehicleId: 'vehicle-1', source: 'manual', notes: '  Call tomorrow  ' },
      user: { id: 'dealer-1', role: 'dealer' },
    }, res);

    expect(createLead).toHaveBeenCalledWith('buyer-1', 'dealer-1', 'vehicle-1', 'manual', null);
    expect(updateLeadNotes).toHaveBeenCalledWith('lead-1', 'Call tomorrow');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, lead: { id: 'lead-1', notes: 'Call tomorrow' } });
  });

  test('manual creation rejects an authenticated non-dealer before any mutation', async () => {
    const res = response();

    await createLeadManual({
      body: { buyerId: 'buyer-9', source: 'manual' },
      user: { id: 'customer-9', role: 'customer' },
    }, res);

    expect(res.statusCode).toBe(403);
    expect(createLead).not.toHaveBeenCalled();
    expect(updateLeadNotes).not.toHaveBeenCalled();
  });

  test('manual creation without notes does not perform a second write', async () => {
    createLead.mockResolvedValue({ id: 'lead-2' });
    const res = response();

    await createLeadManual({
      body: { buyerId: 'buyer-2', source: 'manual' },
      user: { id: 'dealer-2', role: 'dealer' },
    }, res);

    expect(updateLeadNotes).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.body.lead).toEqual({ id: 'lead-2' });
  });

  test('adding a note checks existing lead access then uses the persistence service and activity pathway', async () => {
    getLeadById.mockResolvedValue({ id: 'lead-3', dealer: 'dealer-3' });
    updateLeadNotes.mockResolvedValue({ id: 'lead-3', notes: 'Buyer called' });
    addLeadActivity.mockResolvedValue({ id: 'lead-3', notes: 'Buyer called' });
    const res = response();

    await addNote({
      params: { leadId: 'lead-3' },
      body: { note: ' Buyer called ' },
      user: { id: 'dealer-3', role: 'dealer' },
    }, res);

    expect(updateLeadNotes).toHaveBeenCalledWith('lead-3', 'Buyer called');
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
    expect(updateLeadNotes).not.toHaveBeenCalled();
    expect(addLeadActivity).not.toHaveBeenCalled();
  });
});
