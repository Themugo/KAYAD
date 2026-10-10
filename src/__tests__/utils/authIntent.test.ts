import { describe, it, expect, beforeEach } from 'vitest';
import { safeNextPath, buildAuthPath, loginPathFor, readAuthContext, rememberAuthIntent, readStoredAuthIntent, clearStoredAuthIntent } from '../../utils/authIntent';
import { getPostAuthPath } from '../../utils/authRoutes';

describe('safeNextPath', () => {
  it.each([
    'https://evil.example/', '//evil.example', '/\\evil.example', '/%2F%2Fevil.example', 'javascript:alert(1)',
    '/login', '/register?x=1', '/reset-password', '/verify-email', '/force-password-change', '/admin/login', '/a\nb', '', '   ',
  ])('rejects %j', (v) => expect(safeNextPath(v)).toBeNull());
  it('rejects non-strings and over-long values', () => {
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath({})).toBeNull();
    expect(safeNextPath('/' + 'a'.repeat(600))).toBeNull();
  });
  it('keeps internal path, search and hash', () => {
    expect(safeNextPath('/auctions/7?tab=bids#x')).toBe('/auctions/7?tab=bids#x');
    expect(safeNextPath('/?nav=inspections&action=apply-provider')).toBe('/?nav=inspections&action=apply-provider');
  });
});

describe('buildAuthPath / loginPathFor', () => {
  it('omits empty context and unknown intents', () => {
    expect(buildAuthPath('login')).toBe('/login');
    expect(buildAuthPath('register', { next: '/', intent: 'admin' })).toBe('/register');
  });
  it('encodes next and intent', () => {
    expect(buildAuthPath('register', { next: '/sell?x=1', intent: 'seller' })).toBe('/register?next=%2Fsell%3Fx%3D1&intent=seller');
    expect(loginPathFor({ pathname: '/auctions/1', search: '?a=b' })).toBe('/login?next=%2Fauctions%2F1%3Fa%3Db');
    expect(loginPathFor({ pathname: '/', search: '?nav=chat' })).toBe('/login?next=%2F%3Fnav%3Dchat');
  });
  it('never emits an external next', () => {
    expect(buildAuthPath('login', { next: 'https://evil.example' })).toBe('/login');
  });
});

describe('readAuthContext + stored intent', () => {
  beforeEach(() => clearStoredAuthIntent());
  it('prefers URL, then router state, then stored', () => {
    rememberAuthIntent({ next: '/stored', intent: 'dealer' });
    expect(readAuthContext({ search: '?next=%2Furl&intent=buyer', state: { from: { pathname: '/state' } } }, { useStored: true })).toEqual({ next: '/url', intent: 'buyer' });
    expect(readAuthContext({ search: '', state: { from: { pathname: '/state', search: '?q=1' } } }, { useStored: true })).toEqual({ next: '/state?q=1', intent: 'dealer' });
    expect(readAuthContext({ search: '' }, { useStored: true })).toEqual({ next: '/stored', intent: 'dealer' });
    expect(readAuthContext({ search: '' })).toEqual({ next: null, intent: null });
  });
  it('stores only validated values', () => {
    rememberAuthIntent({ next: 'https://evil.example', intent: 'root' });
    expect(readStoredAuthIntent()).toEqual({ next: null, intent: null });
    expect(window.localStorage.getItem('kayad:auth-intent')).toBeNull();
  });
  it('expires after 24h', () => {
    window.localStorage.setItem('kayad:auth-intent', JSON.stringify({ next: '/x', intent: null, at: Date.now() - 25 * 3600 * 1000 }));
    expect(readStoredAuthIntent().next).toBeNull();
  });
});

describe('getPostAuthPath', () => {
  const u = (o: object) => o as never;
  it('forces password change before anything else', () => {
    expect(getPostAuthPath(u({ role: 'user', mustChangePassword: true }), '/auctions/1')).toBe('/force-password-change');
  });
  it('honours a safe next for any role', () => {
    expect(getPostAuthPath(u({ role: 'user', emailVerified: true }), '/auctions/1')).toBe('/auctions/1');
    expect(getPostAuthPath(u({ role: 'admin' }), '/auctions/1')).toBe('/auctions/1');
  });
  it('ignores an unsafe next', () => {
    expect(getPostAuthPath(u({ role: 'user', emailVerified: true }), 'https://evil.example')).toBe('/dashboard');
  });
  it('routes by role when there is no next', () => {
    expect(getPostAuthPath(u({ role: 'ghost_checker' }), '/')).toBe('/inspector');
    expect(getPostAuthPath(u({ role: 'admin' }), '/')).toBe('/admin');
    expect(getPostAuthPath(u({ role: 'user', emailVerified: true }), '/')).toBe('/dashboard');
    expect(getPostAuthPath(u({ role: 'user', emailVerified: false }), '/')).toBe('/login?verify=required');
  });
});
