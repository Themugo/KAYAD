import { describe, it, expect } from 'vitest';
import { classifyAdminFailure, describeAdminFailure, formatLastRefresh } from '../../utils/adminLoadFailure';

const http = (status: number, data: Record<string, unknown> = {}) => ({ response: { status, data } });

describe('classifyAdminFailure', () => {
  it('recognises the real maintenance 503 body (code, flag or message)', () => {
    expect(classifyAdminFailure(http(503, { code: 'SYSTEM_MAINTENANCE', maintenance: true, scope: 'global' })).kind).toBe('maintenance');
    expect(classifyAdminFailure(http(503, { maintenance: true })).kind).toBe('maintenance');
    expect(classifyAdminFailure(http(503, { message: 'System under scheduled maintenance.' })).kind).toBe('maintenance');
  });
  it('does not call a plain 503 maintenance, and keeps the retryable policy-lookup failure distinct', () => {
    const plain = classifyAdminFailure(http(503, { message: 'Service Unavailable' }));
    expect(plain.kind).toBe('server');
    expect(plain.retryable).toBe(true);
    expect(classifyAdminFailure(http(503, { code: 'MAINTENANCE_POLICY_UNAVAILABLE' })).kind).toBe('maintenance_policy');
  });
  it('maintenance is not offered as retry-until-it-works; an operator decision is required', () => {
    expect(classifyAdminFailure(http(503, { code: 'SYSTEM_MAINTENANCE' })).retryable).toBe(false);
  });
  it.each([[401, 'session'], [403, 'forbidden'], [404, 'missing'], [429, 'rate_limited'], [500, 'server'], [502, 'server']])('HTTP %i -> %s', (status, kind) => {
    expect(classifyAdminFailure(http(status as number)).kind).toBe(kind);
  });
  it('separates timeout, network and malformed-contract failures', () => {
    expect(classifyAdminFailure({ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' }).kind).toBe('timeout');
    expect(classifyAdminFailure(new Error('Network Error')).kind).toBe('network');
    expect(classifyAdminFailure(new Error('The server returned an unexpected user-list response.')).kind).toBe('invalid');
  });
  it('never echoes raw server text, stack traces or SQL into the operator message', () => {
    const msg = describeAdminFailure(http(500, { message: 'relation "users" does not exist', stack: 'at Object.<anonymous>' }), 'Users');
    expect(msg).toMatch(/^Users could not be loaded\./);
    expect(msg).not.toMatch(/relation|stack|Object\./);
  });
  it('formats a last-refresh time only for a valid date', () => {
    expect(formatLastRefresh(null)).toBeNull();
    expect(formatLastRefresh('not a date')).toBeNull();
    expect(typeof formatLastRefresh(new Date())).toBe('string');
  });
});
