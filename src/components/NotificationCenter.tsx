import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { timeAgo } from '../utils/helpers';

const TYPE_ICONS: Record<string, string> = {
  bid: '💰', payment: '💳', escrow: '🔒', chat: '💬', auction: '🔨', system: '⚙️', info: '📌', referral: '🎁',
  ntsa: '🛡️', inspection: '🔍',
};

function getTypeIcon(type: string): string {
  return TYPE_ICONS[type] || '📋';
}

interface Notification {
  _id?: string;
  type?: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
  data?: any;
}

function getNotifLink(n: Notification): string | null {
  if (n.type === 'bid' || n.type === 'auction') return n.data?.carId ? `/auction/${n.data.carId}` : '/showroom?filter=auction';
  if (n.type === 'chat') return n.data?.chatId ? `/chat/${n.data.chatId}` : '/chat';
  if (n.type === 'escrow') return n.data?.carId ? `/escrow/${n.data.carId}` : '/dashboard';
  if (n.type === 'payment' || n.type === 'ntsa') return n.data?.carId ? `/cars/${n.data.carId}` : '/dashboard';
  if (n.type === 'inspection') return n.data?.carId ? `/cars/${n.data.carId}` : '/dashboard';
  return null;
}

interface NotificationCenterProps {
  onClose?: () => void;
}

export default function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllRead, deleteNotif, loading } = useNotifications();

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 12px)', right: 0, width: 370,
      background: '#111', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, boxShadow: '0 28px 70px rgba(0,0,0,0.85)',
      overflow: 'hidden', zIndex: 200,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>
          Notifications{unreadCount > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--gold)', fontWeight: 800 }}>({unreadCount})</span>}
        </span>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            Mark all read
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && notifications.length === 0 && (
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <div className="spinner" style={{ width: 20, height: 20, margin: '0 auto' }} />
        </div>
      )}

      {/* Empty */}
      {!loading && notifications.length === 0 && (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          No notifications yet
        </div>
      )}

      {/* List */}
      {notifications.length > 0 && (
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {notifications.map((n: Notification, i: number) => {
            const link = getNotifLink(n);
            const content = (
              <div style={{
                padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: n.read ? 'transparent' : 'rgba(212,196,168,0.03)',
                display: 'flex', gap: 12, alignItems: 'flex-start',
                cursor: link ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = n.read ? 'rgba(255,255,255,0.03)' : 'rgba(212,196,168,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(212,196,168,0.03)'; }}
                onClick={() => { if (link) { onClose?.(); } }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: n.read ? 'rgba(255,255,255,0.04)' : 'rgba(212,196,168,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>
                  {getTypeIcon(n.type || '')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: n.read ? 400 : 600, fontSize: 13,
                    color: n.read ? 'rgba(255,255,255,0.55)' : '#fff',
                    display: 'flex', gap: 6,
                  }}>
                    <span style={{ flex: 1 }}>{n.title || n.message}</span>
                    {!n.read && (
                      <button onClick={(e) => { e.stopPropagation(); markAsRead(n._id); }}
                        style={{ background: 'none', border: 'none', color: 'rgba(212,196,168,0.4)', fontSize: 11, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                        ✓
                      </button>
                    )}
                  </div>
                  {n.message && n.title && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{n.message}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{timeAgo(n.createdAt)}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteNotif(n._id); }}
                      style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.3)', fontSize: 10, cursor: 'pointer', padding: 0, marginLeft: 'auto' }}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );

            if (link) {
              return <Link key={n._id || i} to={link} style={{ textDecoration: 'none', display: 'block' }}>{content}</Link>;
            }
            return <div key={n._id || i}>{content}</div>;
          })}
        </div>
      )}

      {/* Footer */}
      <Link to="/notifications" onClick={onClose}
        style={{
          display: 'block', padding: '13px 20px', textAlign: 'center', fontSize: 13,
          color: 'var(--gold)', borderTop: '1px solid rgba(255,255,255,0.06)',
          textDecoration: 'none', fontWeight: 600,
        }}>
        View all →
      </Link>
    </div>
  );
}
