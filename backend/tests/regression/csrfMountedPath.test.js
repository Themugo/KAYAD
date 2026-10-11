import { jest } from '@jest/globals';
import { csrfProtection } from '../../middleware/csrf.js';

// D-FIN-1: csrfProtection is mounted with app.use("/api", ...). Express strips the mount point from req.path, so the
// provider-callback allowlist (full /api/... paths) never matched. These requests mimic the real mounted shape.
const run = (req) => { const next = jest.fn(); csrfProtection({ headers: {}, cookies: {}, body: {}, ...req }, {}, next); return next.mock.calls[0]?.[0]; };

describe('csrfProtection exemption under app.use("/api")', () => {
  test.each([
    ['/payments/callback'], ['/v1/payments/callback'], ['/payments/b2c/callback'], ['/payments/b2c/timeout'], ['/bids/mpesa/callback'],
    ['/communications/webhooks/brevo/events'], ['/communications/webhooks/twilio/status'], ['/webhooks/anything'],
  ])('provider callback %s is not CSRF-blocked', (path) => {
    expect(run({ method: 'POST', baseUrl: '/api', path })).toBeUndefined();
  });
  test.each([['/payments/initiate'], ['/chat/abc/message'], ['/v1/auth/login'], ['/communications/preferences']])('browser route %s still requires CSRF', (path) => {
    const err = run({ method: 'POST', baseUrl: '/api', path });
    expect(err).toBeDefined();
    expect(String(err.message)).toMatch(/CSRF/i);
  });
  test('GET is untouched', () => { expect(run({ method: 'GET', baseUrl: '/api', path: '/payments/initiate' })).toBeUndefined(); });
  test('a path that merely contains an exempt prefix later in the string is not exempt', () => {
    expect(run({ method: 'POST', baseUrl: '/api', path: '/evil/payments/callback' })).toBeDefined();
  });
});
