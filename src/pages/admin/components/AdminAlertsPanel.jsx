import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';

export default function AdminAlertsPanel({ alerts, onMarkRead, onMarkAllRead }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={14} style={{ color: 'var(--gold)' }} /> Alerts
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {alerts.length > 0 && (
            <button onClick={onMarkAllRead} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}>
              Mark All Read
            </button>
          )}
          <Link to="/admin/security-log" style={{ fontSize: 10, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>View All</Link>
        </div>
      </div>
      {alerts.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={20} style={{ color: 'var(--green)', marginBottom: 8 }} />
          <div>No unread alerts · All clear</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          {alerts.slice(0, 6).map(a => {
            const sev = a.severity === 'critical' ? 'high' : a.severity === 'warning' ? 'medium' : 'low';
            const sevColor = sev === 'high' ? 'var(--red)' : sev === 'medium' ? 'var(--orange)' : '#eab308';
            return (
              <div key={a._id} style={{
                padding: '10px 12px', borderRadius: 10,
                background: sev === 'high' ? 'rgba(239,68,68,0.04)' : sev === 'medium' ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${sev === 'high' ? 'rgba(239,68,68,0.12)' : sev === 'medium' ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)'}`,
                fontSize: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: sevColor,
                    flexShrink: 0, marginTop: 3,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: 11, textTransform: 'capitalize' }}>{a.type?.replace(/_/g, ' ')}</span>
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 4, fontWeight: 600,
                        background: sev === 'high' ? 'rgba(239,68,68,0.12)' : sev === 'medium' ? 'rgba(245,158,11,0.12)' : 'rgba(234,179,8,0.12)',
                        color: sevColor,
                      }}>
                        {sev.toUpperCase()}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)' }}>
                        {new Date(a.createdAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4 }}>
                      {a.data?.message || a.message || a.type || 'System alert'}
                    </div>
                  </div>
                  <button
                    onClick={() => onMarkRead(a._id)}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6,
                      color: 'var(--text-muted)', cursor: 'pointer', padding: '3px 7px', fontSize: 9, fontWeight: 600,
                      flexShrink: 0, marginTop: 1,
                    }}
                    title="Mark as read"
                  >
                    ✓ Read
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
