import { describe, test, expect } from 'vitest';
import { getEffectivePermissions, userHasPermission, PERM, ASSIGNABLE_PERMISSIONS, PAGE_PERMISSIONS } from '../utils/permissions';

describe('platform_recovery permission (UI mirror of the server rule)', () => {
  test('it is assignable and unlocks only the recovery page', () => {
    expect(ASSIGNABLE_PERMISSIONS).toContain(PERM.PLATFORM_RECOVERY);
    expect(PAGE_PERMISSIONS['/admin/platform-recovery']).toBe(PERM.PLATFORM_RECOVERY);
  });
  test('no role default contains it; only the server-derived hint adds it', () => {
    for (const role of ['admin', 'technical_support', 'moderator', 'accounts', 'hr', 'marketing', 'escrow_officer', 'ad_manager', 'ghost_checker', 'dealer', 'user']) {
      expect(getEffectivePermissions({ role })).not.toContain(PERM.PLATFORM_RECOVERY);
    }
    expect(getEffectivePermissions({ role: 'technical_support', platformRecovery: true })).toContain(PERM.PLATFORM_RECOVERY);
    expect(userHasPermission({ role: 'technical_support', platformRecovery: true }, PERM.PLATFORM_RECOVERY)).toBe(true);
    expect(userHasPermission({ role: 'technical_support' }, PERM.PLATFORM_RECOVERY)).toBe(false);
  });
});
