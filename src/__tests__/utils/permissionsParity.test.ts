// STAGE 5F.5 — the UI permission mirror must equal the server catalogue (the server stays the authority; a drift here
// shows or hides the wrong menu entries and hides the real access boundary from the operator).
import { describe, it, expect } from 'vitest';
import * as server from '../../../backend/config/roles.js';
import * as ui from '../../utils/permissions';

const sorted = (a: readonly string[]) => [...a].sort();

describe('frontend permission mirror ≡ backend/config/roles.js', () => {
  it('has the same permission keys and values', () => {
    expect(ui.PERM).toEqual(server.PERM);
  });
  it('has the same assignable permission set', () => {
    expect(sorted(ui.ASSIGNABLE_PERMISSIONS)).toEqual(sorted(server.ASSIGNABLE_PERMISSIONS));
  });
  it('gives every staff role the same default permissions', () => {
    const staff = Object.keys(server.ROLE_PERMISSIONS);
    for (const role of staff) {
      if (role === 'superadmin') continue; // server: all permissions; mirror handles it in getEffectivePermissions
      expect(sorted((ui.ROLE_PERMISSIONS as any)[role] ?? []), `role ${role}`).toEqual(sorted(server.ROLE_PERMISSIONS[role]));
    }
  });
  it('computes the same effective permissions for grants and revocations', () => {
    const cases = [
      { role: 'marketing', grantedPermissions: ['manage_finance'], revokedPermissions: ['manage_ads'] },
      { role: 'hr', grantedPermissions: [], revokedPermissions: ['manage_users'] },
      { role: 'moderator', grantedPermissions: ['view_analytics'], revokedPermissions: [] },
      { role: 'accounts', grantedPermissions: [], revokedPermissions: [] },
      { role: 'admin', grantedPermissions: [], revokedPermissions: ['manage_platform'] },
      { role: 'user', grantedPermissions: ['manage_cars'], revokedPermissions: [] },
    ];
    for (const c of cases) expect(sorted(ui.getEffectivePermissions(c as any)), c.role).toEqual(sorted(server.getEffectivePermissions(c)));
  });
  it('labels exist for every assignable permission', () => {
    for (const p of ui.ASSIGNABLE_PERMISSIONS) expect((ui.PERM_LABELS as any)[p], p).toBeTruthy();
  });
});
