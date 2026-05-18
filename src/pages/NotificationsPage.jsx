import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notifAPI, formatKES } from '../api/api';
import { useNotifications } from '../context/NotificationContext';
import { timeAgo, formatDate } from '../utils/helpers';

const TYPE_ICONS = {
  bid: '💰', payment: '💳', escrow: '🔒', chat: '💬', auction: '🔨', system: '⚙️', info: '📌', referral: '🎁',
  ntsa: '🛡️', inspection: '🔍',
};

function getTypeIcon(type) { return TYPE_ICONS[type] || '📋'; }

function getNotifLink(n) {
  if (n.type === 'bid' || n.type === 'auction') return n.data?.carId ? `/auction/${n.data.carId}` : '/showroom?filter=auction';
  if (n.type === 'chat') return n.data?.chatId ? `/chat/${n.data.chatId}` : '/chat';
  if (n.type === 'escrow') return '/escrow';
  if (n.type === 'payment' || n.type === 'ntsa') return n.data?.carId ? `/cars/${n.data.carId}` : '/dashboard';
  if (n.type === 'inspection') return n.data?.carId ? `/cars/${n.data.carId}` : '/dashboard';
  return null;
}

const TYPE_FILTERS = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'bid', label: 'Bids', icon: '💰' },
  { key: 'escrow', label: 'Escrow', icon: '🔒' },
  { key: 'payment', label: 'Payments', icon: '💳' },
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'auction', label: 'Auctions', icon: '🔨' },
  { key: 'system', label: 'System', icon: '⚙️' },
];

export default function NotificationsPage() {
  const { fetchNotifications, markAsRead, markAllRead, deleteNotif, unreadCount } = useNotifications();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit, type: typeFilter !== 'all' ? typeFilter : undefined };
      const d = await notifAPI.list(params);
      const list = d.notifications || d.data || [];
      setNotifs(list);
      setTotal(d.pagination?.total || list.length);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, typeFilter]);

  const handleMarkRead = async (id) => {
    await markAsRead(id);
    setNotifs(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDelete = async (id) => {
    await deleteNotif(id);
    setNotifs(prev => prev.filter(n => n._id !== id));
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-eyebrow">Notifications</div>
            <h2 style={{ marginBottom: 4 }}>Activity Center</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Stay updated on bids, escrows, payments, and more.
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              style={{
                background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)',
                borderRadius: 8, padding: '8px 16px', color: 'var(--gold)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
              Mark All Read ({unreadCount})
            </button>
          )}
        </div>

        {/* Type filters */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          {TYPE_FILTERS.map(f => (
            <button key={f.key} className={`tab-btn ${typeFilter === f.key ? 'active' : ''}`}
              onClick={() => { setTypeFilter(f.key); setPage(1); }}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : notifs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <h3>No notifications</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>You're all caught up!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {notifs.map((n, i) => {
              const link = getNotifLink(n);
              const content = (
                <div style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  padding: '14px 18px',
                  background: n.read ? '#0C0C0C' : 'rgba(212,196,168,0.03)',
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.06)' : 'rgba(212,196,168,0.12)'}`,
                  borderRadius: 12,
                  transition: 'all 0.2s',
                  cursor: link ? 'pointer' : 'default',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: n.read ? 'rgba(255,255,255,0.04)' : 'rgba(212,196,168,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    {getTypeIcon(n.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: n.read ? 500 : 700, fontSize: 14, color: n.read ? 'rgba(255,255,255,0.55)' : '#fff' }}>
                        {n.title || n.message}
                      </span>
                      {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />}
                    </div>
                    {n.message && n.title && (
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 3, lineHeight: 1.5 }}>{n.message}</div>
                    )}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>{timeAgo(n.createdAt)}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{n.type}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {!n.read && (
                      <button onClick={(e) => { e.stopPropagation(); handleMarkRead(n._id); }}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'rgba(212,196,168,0.5)', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✓
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(n._id); }}
                      style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'rgba(239,68,68,0.3)', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✕
                    </button>
                  </div>
                </div>
              );

              if (link) return <Link key={n._id || i} to={link} style={{ textDecoration: 'none' }}>{content}</Link>;
              return <div key={n._id || i}>{content}</div>;
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}