import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';

const STAT_DEFS = [
  { emoji: '👥', label: 'Total Users',     key: 'totalUsers',     color: '#3b82f6',  to: '/admin/users' },
  { emoji: '🚗', label: 'Total Cars',      key: 'totalCars',      color: 'var(--gold)', to: '/admin/cars' },
  { emoji: '🔨', label: 'Active Auctions', key: 'activeAuctions', color: '#f97316',   to: '/admin/auctions' },
  { emoji: '💰', label: 'Total Revenue',   key: 'totalRevenue',   color: 'var(--gold)', to: '/admin/transactions', kes: true },
  { emoji: '⏳', label: 'Pending Dealers',  key: 'pendingDealers', color: '#f97316',   to: '/admin/sellers' },
  { emoji: '📋', label: 'Pending Cars',    key: 'pendingCars',    color: '#8b5cf6',   to: '/admin/moderation' },
  { emoji: '🔔', label: 'Active Alerts',   key: 'activeAlerts',   color: '#ef4444' },
  { emoji: '🏷️', label: 'Total Bids',      key: 'totalBids',      color: '#06b6d4',   to: '/admin/bids' },
];

export default function AdminQuickStats({ stats, formatValue }) {
  const s = stats || {};
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 12, marginBottom: 24 }}>
      {STAT_DEFS.map(qs => {
        const val = s[qs.key];
        const activeColor = qs.key === 'activeAlerts' && Number(val||0) > 0 ? '#ef4444' : (qs.color || 'rgba(255,255,255,0.3)');
        const inner = (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '18px 20px',
            transition: 'border-color 0.2s, transform 0.2s',
            position: 'relative', overflow: 'hidden',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${qs.color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ position: 'absolute', right: -18, top: -18, width: 72, height: 72, borderRadius: '50%', background: `${qs.color}`, opacity: 0.06 }} />
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${qs.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 18 }}>
              {qs.emoji}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{qs.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.6rem', color: '#fff', lineHeight: 1 }}>
              {formatValue(val, qs.kes)}
            </div>
            {qs.to && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Eye size={10} style={{ color: 'var(--gold)' }} />
                <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}>View details</span>
              </div>
            )}
          </div>
        );
        return qs.to ? <Link key={qs.label} to={qs.to} style={{ textDecoration: 'none' }}>{inner}</Link> : <div key={qs.label}>{inner}</div>;
      })}
    </div>
  );
}
