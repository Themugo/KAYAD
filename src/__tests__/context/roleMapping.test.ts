import { describe, it, expect } from 'vitest';
import { mapBackendRoleToFrontend } from '../../context/AuthContext';

/**
 * KAYAD Phase 2 - dedicated regression test for this phase's explicitly
 * named critical issue: "Do NOT map individual_seller -> buyer or
 * collapse distinct backend roles into unrelated frontend roles."
 *
 * Prior to this phase, mapBackendRoleToFrontend collapsed
 * individual_seller into 'buyer' and superadmin into 'admin' - both
 * real, distinct backend roles with genuinely different permissions
 * (docs/ROLE_MATRIX.md). This test file exists so that collapse can
 * never silently reappear without a test failing.
 */

describe('mapBackendRoleToFrontend - role identity preservation (Phase 2 fix)', () => {
  it('does NOT collapse individual_seller into buyer - the critical issue this phase named explicitly', () => {
    expect(mapBackendRoleToFrontend('individual_seller')).toBe('individual_seller');
    expect(mapBackendRoleToFrontend('individual_seller')).not.toBe('buyer');
  });

  it('does NOT collapse superadmin into admin - the same class of problem, found while fixing the named one', () => {
    expect(mapBackendRoleToFrontend('superadmin')).toBe('superadmin');
    expect(mapBackendRoleToFrontend('superadmin')).not.toBe('admin');
  });

  it('preserves every real backend staff role distinctly, none collapsing into another', () => {
    const staffRoles = [
      'ghost_checker', 'moderator', 'ad_manager', 'marketing',
      'escrow_officer', 'technical_support', 'hr', 'accounts',
    ];
    const mapped = staffRoles.map(mapBackendRoleToFrontend);
    // Every mapped value is identical to its input (true 1:1 preservation)
    staffRoles.forEach((role, i) => expect(mapped[i]).toBe(role));
    // And no two distinct roles collapsed into the same output
    expect(new Set(mapped).size).toBe(staffRoles.length);
  });

  it('preserves dealer and admin as before (these were never collapsed, confirming no regression)', () => {
    expect(mapBackendRoleToFrontend('dealer')).toBe('dealer');
    expect(mapBackendRoleToFrontend('admin')).toBe('admin');
  });

  it('maps the backend "user" role to this frontend\'s own pre-existing "buyer" term (not a collapse - no other role maps here)', () => {
    expect(mapBackendRoleToFrontend('user')).toBe('buyer');
  });

  it('fails closed to buyer (least-privileged) for a genuinely unrecognized role string, never granting elevated access', () => {
    expect(mapBackendRoleToFrontend('some_future_unknown_role')).toBe('buyer');
  });
});
