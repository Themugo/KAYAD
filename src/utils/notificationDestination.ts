/** Resolve persisted notification destinations to canonical in-app surfaces.
 * Older rows may contain stale links, so message notifications must not trust
 * their stored link: the existing communication hub is the canonical target.
 */
export interface NotificationDestinationInput {
  type?: string | null;
  link?: string | null;
}

export function notificationDestination(notification: NotificationDestinationInput): string | null {
  const type = String(notification.type || '').trim().toLowerCase();

  // Legacy chat rows may have no link or a stale /login or /dashboard link.
  if (type === 'chat' || type === 'message') return '/?nav=chat';

  const link = typeof notification.link === 'string' ? notification.link.trim() : '';
  if (link && link.startsWith('/') && !link.startsWith('//')) return link;

  if (type === 'escrow') return '/escrow';
  if (type === 'bid' || type === 'auction' || type === 'outbid') return '/auction';
  return null;
}
