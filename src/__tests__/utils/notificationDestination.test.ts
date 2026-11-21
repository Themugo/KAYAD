import { describe, expect, it } from 'vitest';
import { notificationDestination } from '../../utils/notificationDestination';

describe('notificationDestination', () => {
  it.each([
    { type: 'chat', link: '/login?next=%2Fchat' },
    { type: 'chat', link: '/dashboard' },
    { type: 'message', link: '/login' },
    { type: 'message', link: undefined },
  ])('routes legacy $type notifications to the canonical chat hub', (notification) => {
    expect(notificationDestination(notification)).toBe('/?nav=chat');
  });

  it('keeps valid in-app links for non-message notifications', () => {
    expect(notificationDestination({ type: 'system', link: '/?nav=marketplace' })).toBe('/?nav=marketplace');
  });

  it('rejects protocol-relative links', () => {
    expect(notificationDestination({ type: 'system', link: '//evil.example/path' })).toBeNull();
  });

  it('uses existing fallbacks for escrow and auction notifications', () => {
    expect(notificationDestination({ type: 'escrow' })).toBe('/escrow');
    expect(notificationDestination({ type: 'outbid' })).toBe('/auction');
  });
});
