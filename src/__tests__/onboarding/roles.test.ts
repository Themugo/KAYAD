import { describe, it, expect } from 'vitest';
import { PUBLIC_ROLES, NON_SELF_REGISTRABLE, roleForIntent, roleById } from '../../components/onboarding/roles';
import { AUTH_INTENTS } from '../../utils/authIntent';

describe('public role matrix', () => {
  it('only ever requests user, individual_seller or dealer from /auth/register', () => {
    for (const r of PUBLIC_ROLES) expect([null, 'user', 'individual_seller', 'dealer']).toContain(r.backendRole);
  });
  it('never offers staff or broker roles', () => {
    for (const r of PUBLIC_ROLES) {
      expect(NON_SELF_REGISTRABLE as readonly string[]).not.toContain(r.backendRole);
      expect(NON_SELF_REGISTRABLE as readonly string[]).not.toContain(r.id);
    }
  });
  it('every intent maps to exactly one real role and back', () => {
    for (const i of AUTH_INTENTS) {
      const id = roleForIntent(i)!;
      expect(id).toBeTruthy();
      expect(roleById(id).intent).toBe(i);
    }
    expect(roleForIntent('admin' as never)).toBeNull();
  });
  it('privileged-approval roles do not claim instant access', () => {
    expect(roleById('dealer').afterSignIn).toBe('/dealer/onboarding');
    expect(roleById('dealer').outcome).toMatch(/verification/i);
    expect(roleById('seller').outcome).toMatch(/approval/i);
  });
  it('independent professionals use the application route, with no account role', () => {
    const p = roleById('professional');
    expect(p.route).toBe('application');
    expect(p.backendRole).toBeNull();
  });
});
