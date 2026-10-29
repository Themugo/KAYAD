import { describe, expect, it } from 'vitest';
import { getLoadErrorMessage, isListingArray, normalizeListingStatus } from '../../../pages/admin/AdminCars';

describe('AdminCars listing response contracts', () => {
  it('recognizes only an explicit maintenance response as maintenance', () => {
    expect(getLoadErrorMessage({ response: { status: 503, data: { code: 'SYSTEM_MAINTENANCE', maintenance: true } } }))
      .toMatch(/confirmed maintenance/i);
    expect(getLoadErrorMessage({ response: { status: 503, data: { message: 'Service unavailable' } } }))
      .toMatch(/listing service is temporarily unavailable/i);
  });

  it('distinguishes session, permission, network and server failures', () => {
    expect(getLoadErrorMessage({ response: { status: 401, data: {} } })).toMatch(/session may have expired/i);
    expect(getLoadErrorMessage({ response: { status: 403, data: {} } })).toMatch(/permission/i);
    expect(getLoadErrorMessage(new Error('network'))).toMatch(/connect to the listing service/i);
    expect(getLoadErrorMessage({ response: { status: 500, data: {} } })).toMatch(/temporarily unavailable/i);
  });

  it('accepts valid listing arrays and rejects malformed success payloads', () => {
    expect(isListingArray([{ _id: 'car-1', title: 'Vehicle' }])).toBe(true);
    expect(isListingArray([{ id: 'car-2' }])).toBe(true);
    expect(isListingArray([])).toBe(true);
    expect(isListingArray({ cars: [] })).toBe(false);
    expect(isListingArray([{ title: 'Missing identifier' }])).toBe(false);
  });

  it('normalizes supported auction-status field variants without guessing', () => {
    expect(normalizeListingStatus({ auctionStatus: 'Live' })).toBe('live');
    expect(normalizeListingStatus({ auction_status: 'ended' })).toBe('ended');
    expect(normalizeListingStatus({ status: 'sold' })).toBe('sold');
    expect(normalizeListingStatus({ status: '' })).toBe('unknown');
  });
});
