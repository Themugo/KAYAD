import { describe, test, expect } from 'vitest';
import { approvalEligibility, describeDealerDecisionError, isReasonValid, DEALER_REASON_MIN } from '../../utils/dealerDecision';

describe('dealer decision helpers', () => {
  test('the reason rule matches the server (trimmed, at least 8 characters)', () => {
    expect(DEALER_REASON_MIN).toBe(8);
    expect(isReasonValid('')).toBe(false);
    expect(isReasonValid('   short ')).toBe(false);
    expect(isReasonValid('Documents verified')).toBe(true);
  });
  test('the server message and code are shown, never a generic failure', () => {
    const err = { response: { status: 403, data: { code: 'ADMIN_ACCOUNT_REQUIRED', message: 'Your login is not an active administrator account.' } } };
    expect(describeDealerDecisionError(err, 'fallback')).toBe('Your login is not an active administrator account. [HTTP 403 · ADMIN_ACCOUNT_REQUIRED]');
  });
  test('without a server answer the fallback is used and no code is invented', () => {
    expect(describeDealerDecisionError(new Error('Network Error'), 'The server did not approve this dealer.')).toBe('The server did not approve this dealer.');
    expect(describeDealerDecisionError({ response: { status: 500, data: {} } }, 'x')).toBe('x [HTTP 500]');
  });
  test('eligibility: blockers withhold Approve, an unreadable application is "unknown" (the server decides), a clean one is ready', () => {
    expect(approvalEligibility({ blockers: [{ code: 'A', message: 'Docs missing.' }] })).toEqual({ state: 'blocked', reasons: ['Docs missing.'] });
    expect(approvalEligibility({ blockers: [] })).toEqual({ state: 'ready', reasons: [] });
    expect(approvalEligibility(null).state).toBe('unknown');
    expect(approvalEligibility(undefined).state).toBe('unknown');
  });
});
