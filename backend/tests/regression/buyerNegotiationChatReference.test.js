import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const from = jest.fn();
jest.unstable_mockModule('../../db/index.js', () => ({ findById: jest.fn() }));
jest.unstable_mockModule('../../utils/supabase.js', () => ({ getSupabase: () => ({ from }) }));
jest.unstable_mockModule('../../services/offerNegotiation.service.js', () => ({ listLeadOffers: jest.fn(), performOfferAction: jest.fn() }));

jest.unstable_mockModule('../../services/offerSettlement.service.js', () => ({ payAcceptedOffer: jest.fn(), getSettlementForOffer: jest.fn(), cancelSettlement: jest.fn() }));

const { getBuyerNegotiations } = await import('../../controllers/offerNegotiationController.js');

describe('buyer negotiation inbox conversation references', () => {
  beforeEach(() => from.mockReset());

  test('returns chatId only for the buyer-owned chat-sourced lead rows', async () => {
    const rows = [
      { id: 'lead-chat', source: 'chat', source_reference: 'chat-123', vehicle: 'car-1' },
      { id: 'lead-listing', source: 'listing', source_reference: 'form-456', vehicle: 'car-2' },
    ];
    const q = {
      select: jest.fn(() => q),
      eq: jest.fn(() => q),
      order: jest.fn(() => q),
      limit: jest.fn(async () => ({ data: rows, error: null })),
    };
    from.mockReturnValue(q);
    const result = {};
    const res = { json: jest.fn((body) => Object.assign(result, body)) };

    await getBuyerNegotiations({ user: { id: 'buyer-1' } }, res);

    expect(from).toHaveBeenCalledWith('leads');
    expect(q.eq).toHaveBeenCalledWith('buyer', 'buyer-1');
    expect(result.leads).toMatchObject([
      { id: 'lead-chat', chatId: 'chat-123' },
      { id: 'lead-listing', chatId: null },
    ]);
    expect(result.leads[0]).not.toHaveProperty('source_reference');
  });
});
