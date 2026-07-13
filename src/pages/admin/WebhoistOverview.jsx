import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api/api';
import { Crown, Activity, ShieldCheck, RefreshCw } from 'lucide-react';
import { StatTile, MiniBarChart, BreakdownBars } from '../../components/AdminWidgets';

export default function WebhoistOverview() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      adminAPI.stats().catch(() => ({})),
      adminAPI.getAuditLog({ limit: 20 }).catch(() => ({ entries: [] })),
    ]).then(([s, l]) => {
      // /admin/stats responds { success, stats: {...} } — read the nested object
      setStats(s.stats || s || {});
      setLogs(l.entries || l.logs || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="loading-center" style={{ padding: 80 }}><div className="spinner" /></div>;
  }

  const s = stats || {};

  const cards = [
    { icon: '👥', label: 'Total Users',     value: s.totalUsers,     color: '#3b82f6', to: '/admin/users' },
    { icon: '🚗', label: 'Total Cars',      value: s.totalCars,      color: 'var(--gold)', to: '/admin/cars' },
    { icon: '🔨', label: 'Active Auctions', value: s.activeAuctions, color: '#f97316', to: '/admin/auctions' },
    { icon: '🔒', label: 'Open Escrows',    value: s.openEscrows ?? s.totalEscrows, color: '#ef4444', to: '/admin/escrows' },
    { icon: '🏷️', label: 'Total Bids',      value: s.totalBids,      color: '#06b6d4', to: '/admin/bids' },
    { icon: '💰', label: 'Total Revenue',   value: s.totalRevenue,   color: 'var(--gold)', to: '/admin/transactions', kes: true },
  ];

  // Real platform composition from the stats payload
  const composition = [
    { name: 'Dealers',            count: s.totalDealers ?? 0,      color: 'var(--gold)' },
    { name: 'Individual Sellers', count: s.individualSellers ?? 0, color: '#3b82f6' },
    { name: 'Buyers & Others',    count: Math.max((s.totalUsers ?? 0) - ((s.totalDealers ?? 0) + (s.individualSellers ?? 0)), 0), color: '#22c55e' },
  ];

  const glance = [
    { label: 'Users',    value: s.totalUsers ?? 0,     color: '#3b82f6' },
    { label: 'Cars',     value: s.totalCars ?? 0,      color: 'var(--gold)' },
    { label: 'Auctions', value: s.activeAuctions ?? 0, color: '#f97316' },
    { label: 'Bids',     value: s.totalBids ?? 0,      color: '#06b6d4' },
    { label: 'Escrows',  value: s.totalEscrows ?? 0,   color: '#ef4444' },
  ];
  const fmtK = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : `${v || 0}`);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 26 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37, 99, 235,0.08)', border: '1px solid rgba(37, 99, 235,0.15)', borderRadius: 9999, padding: '4px 12px', marginBottom: 10 }}>
            <Crown size={13} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Webhoist · Owner</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.5rem,2.6vw,2.2rem)', color: '#fff', margin: 0 }}>
            System Overview
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Platform-wide statistics &amp; activity — visible to the platform owner only
          </p>
        </div>
        <button onClick={load} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 175px), 1fr))', gap: 14, marginBottom: 20 }}>
        {cards.map(c => <StatTile key={c.label} {...c} />)}
      </div>

      {/* Chart + composition */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 16, marginBottom: 20 }} className="overview-row">
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Platform at a Glance</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Live totals across the marketplace</div>
          </div>
          <div style={{ padding: '24px 22px 18px' }}>
            <MiniBarChart data={glance} height={170} format={fmtK} />
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>User Composition</span>
          </div>
          <div style={{ padding: '20px 22px' }}>
            <BreakdownBars data={composition} total={s.totalUsers} />
          </div>
        </div>
      </div>

      {/* Recent admin activity (real audit log) */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#fff' }}>
            <Activity size={15} style={{ color: 'var(--gold)' }} /> Recent Admin Activity
          </span>
          <Link to="/admin/security-log" style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>Full Log →</Link>
        </div>
        <div>
          {logs.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No recent activity</div>
          ) : logs.slice(0, 12).map((e, i) => (
            <div key={e._id || i} style={{ padding: '11px 22px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: i < Math.min(logs.length, 12) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <code style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'monospace', background: 'rgba(37, 99, 235,0.08)', padding: '2px 8px', borderRadius: 6 }}>{e.action}</code>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{e.admin || e.adminId?.name || 'System'}</span>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                {e.createdAt ? new Date(e.createdAt).toLocaleString('en-KE') : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Access note */}
      <div style={{ padding: '16px 20px', background: 'rgba(37, 99, 235,0.05)', borderRadius: 12, border: '1px solid rgba(37, 99, 235,0.15)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--gold)', fontWeight: 600, marginBottom: 8 }}>
          <ShieldCheck size={15} /> Webhoist Access
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          You are logged in as the platform owner (<strong>webhoist</strong>). You have full system access: all admin panels,
          all security logs, all user data, and the ability to override any permission check.
        </p>
      </div>
    </div>
  );
}
