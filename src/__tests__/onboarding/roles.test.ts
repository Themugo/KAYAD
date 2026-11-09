import { describe, it, expect } from 'vitest';
import { PUBLIC_ROLES, NON_SELF_REGISTRABLE, roleForIntent, roleById } from '../../components/onboarding/roles';
import { AUTH_INTENTS } from '../../utils/authIntent';

describe('public role matrix', () => {
  it('new registrations use one personal identity or a dealer business identity', () => {
    for (const r of PUBLIC_ROLES) expect(['user', 'dealer']).toContain(r.backendRole);
    expect(PUBLIC_ROLES.some((r) => r.id === 'seller')).toBe(false);
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
      expect(roleById(id).intent).toBe(i === 'seller' ? 'buyer' : i);
    }
    expect(roleForIntent('admin' as never)).toBeNull();
  });
  it('privileged-approval roles do not claim instant access', () => {
    expect(roleById('dealer').afterSignIn).toBe('/dealer/onboarding');
    expect(roleById('dealer').outcome).toMatch(/verification/i);
    expect(roleForIntent('seller')).toBe('buyer');
    expect(roleById('garage_business').afterSignIn).toContain('providerType=garage_business');
    expect(roleById('inspection_company').afterSignIn).toContain('providerType=inspection_company');
  });
  it('professionals start with a personal account and apply for provider access afterward', () => {
    const p = roleById('professional');
    expect(p.route).toBe('account_then_provider');
    expect(p.backendRole).toBe('user');
    expect(p.afterSignIn).toContain('providerType=individual_inspector');
  });
});
