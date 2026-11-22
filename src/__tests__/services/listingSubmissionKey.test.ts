import { describe, it, expect } from 'vitest';
import { listingSubmissionKey, newSubmissionNonce } from '../../services/vehicleApi';

describe('listing submission idempotency key', () => {
  const payload = { title: '2019 Mazda CX-5', price: 100, city: 'Nairobi' };
  const files = [{ name: 'a.jpg', size: 10, type: 'image/jpeg' }];
  it('is stable for a retry of the same content (double click, timeout retry)', () => {
    const n = newSubmissionNonce();
    expect(listingSubmissionKey(n, payload, files)).toBe(listingSubmissionKey(n, { ...payload }, [...files]));
  });
  it('changes when the content or the photos change, and for every new form', () => {
    const n = newSubmissionNonce(); const k = listingSubmissionKey(n, payload, files);
    expect(listingSubmissionKey(n, { ...payload, price: 101 }, files)).not.toBe(k);
    expect(listingSubmissionKey(n, payload, [...files, { name: 'b.jpg', size: 5, type: 'image/jpeg' }])).not.toBe(k);
    expect(listingSubmissionKey(newSubmissionNonce(), payload, files)).not.toBe(k);
  });
  it('always satisfies the server key format (8-200 chars of letters, digits . _ : -)', () => {
    expect(listingSubmissionKey(newSubmissionNonce(), payload, files)).toMatch(/^[A-Za-z0-9._:-]{8,200}$/);
  });
});
