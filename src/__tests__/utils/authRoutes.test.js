import { describe, it, expect } from 'vitest';
import {
  STAFF_ROLES, SELLER_ROLES,
  isStaffRole, isSellerRole, safeRedirectPath, getPostAuthPath,
} from '../../utils/authRoutes';

describe('isStaffRole', () => {
  it.each(STAFF_ROLES)('returns true for %s', (role) => {
    expect(isStaffRole(role)).toBe(true);
  });
  it('returns false for non-staff roles', () => {
    expect(isStaffRole('user')).toBe(false);
    expect(isStaffRole('dealer')).toBe(false);
  });
});

describe('isSellerRole', () => {
  it.each(SELLER_ROLES)('returns true for %s', (role) => {
    expect(isSellerRole(role)).toBe(true);
  });
  it('returns false for non-seller roles', () => {
    expect(isSellerRole('user')).toBe(false);
  });
});

describe('safeRedirectPath', () => {
  it('returns fallback for auth paths', () => {
    expect(safeRedirectPath('/login', '/')).toBe('/');
    expect(safeRedirectPath('/register', '/')).toBe('/');
  });
  it('passes through non-auth paths', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('/admin')).toBe('/admin');
  });
  it('returns fallback for invalid paths', () => {
    expect(safeRedirectPath('', '/')).toBe('/');
    expect(safeRedirectPath('//evil', '/')).toBe('/');
  });
  it('returns fallback for non-string input', () => {
    expect(safeRedirectPath(null, '/fallback')).toBe('/fallback');
    expect(safeRedirectPath(undefined, '/fallback')).toBe('/fallback');
  });
});

describe('getPostAuthPath', () => {
  it('redirects to force-password-change if mustChangePassword', () => {
    const user = { role: 'user', mustChangePassword: true };
    expect(getPostAuthPath(user)).toBe('/force-password-change');
  });
  it('redirects staff to /admin', () => {
    expect(getPostAuthPath({ role: 'admin', emailVerified: true })).toBe('/admin');
    expect(getPostAuthPath({ role: 'superadmin', emailVerified: true })).toBe('/admin');
  });
  it('redirects dealers to /dealer', () => {
    expect(getPostAuthPath({ role: 'dealer', emailVerified: true, approved: true })).toBe('/dealer');
  });
  it('redirects unapproved dealers to /register', () => {
    expect(getPostAuthPath({ role: 'dealer', emailVerified: true, approved: false })).toBe('/register');
  });
  it('redirects regular users to /dashboard', () => {
    expect(getPostAuthPath({ role: 'user', emailVerified: true })).toBe('/dashboard');
  });
  it('redirects unverified regular users to /register', () => {
    expect(getPostAuthPath({ role: 'user', emailVerified: false })).toBe('/register');
  });
  it('uses fallback for unknown roles', () => {
    expect(getPostAuthPath({ role: 'unknown', emailVerified: true }, '/custom')).toBe('/custom');
  });
});
