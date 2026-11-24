import { describe, test, expect } from 'vitest';
import { canOpenAdminPage, getEffectivePermissions } from '../../utils/permissions';

// The UI mirror must agree with the server guards proven by ci/db-journeys/29_permission_matrix.mjs (the server stays the authority).
const open = (role: string, path: string) => { const u = { role }; return canOpenAdminPage(u, path, getEffectivePermissions(u as never)); };

describe('admin page access mirrors the server guards', () => {
  test.each(['/admin/moderation', '/admin/feedback', '/admin/broadcast', '/admin/dealer-verifications', '/admin/support-tickets'])('moderator is NOT offered %s (server answers 403)', (p) => {
    expect(open('moderator', p)).toBe(false);
  });
  test.each(['/admin/reviews', '/admin/chats', '/admin/security-log'])('moderator still opens %s (server allows it)', (p) => {
    expect(open('moderator', p)).toBe(true);
  });
  test('hr, marketing are not offered the admin-role-only pages', () => {
    for (const r of ['hr', 'marketing']) for (const p of ['/admin/feedback', '/admin/broadcast', '/admin/dealer-verifications']) expect(open(r, p)).toBe(false);
  });
  test('technical support opens the support queue but not feedback', () => {
    expect(open('technical_support', '/admin/support-tickets')).toBe(true);
    expect(open('technical_support', '/admin/feedback')).toBe(false);
  });
  test('admin opens the role-gated pages and support oversight; superadmin opens everything', () => {
    for (const p of ['/admin/moderation', '/admin/feedback', '/admin/broadcast', '/admin/dealer-verifications', '/admin/support-tickets']) { expect(open('admin', p)).toBe(true); expect(open('superadmin', p)).toBe(true); }
    expect(open('admin', '/admin/staff')).toBe(false);
    expect(open('superadmin', '/admin/staff')).toBe(true);
  });
});
