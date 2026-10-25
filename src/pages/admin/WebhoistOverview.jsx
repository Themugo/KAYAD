import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api/api';
import { Crown, Activity, ShieldCheck, RefreshCw, Users, Car, Gavel, Lock, Tag, Wallet } from 'lucide-react';
import { StatTile, MiniBarChart, BreakdownBars } from '../../components/admin/AdminWidgets';

export default function WebhoistOverview() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  // A failed request is reported as unavailable; it is never turned into zero counts or an empty activity feed.
  const [statsFailed, setStatsFailed] = useState(false);
  const [logsFailed, setLogsFailed] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      adminAPI.stats(),
      adminAPI.getAuditLog({ limit: 20 }),
    ]).then(([sr, lr]) => {
      // /admin/stats responds { success, stats: {...} } — read the nested object
      const body = sr.status === 'fulfilled' ? (sr.value?.stats || sr.value) : null;
      const okStats = body && typeof body === 'object' && !Array.isArray(body);
      setStatsFailed(!okStats);
      setStats(okStats ? body : null);
      const entries = lr.status === 'fulfilled' ? (lr.value?.entries || lr.value?.logs) : null;
      setLogsFailed(!Array.isArray(entries));
      setLogs(Array.isArray(entries) ? entries : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="loading-center" style={{ padding: 80 }}><div className="spinner" /></div>;
  }

  const s = stats || {};

  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  const cards = [
    { icon: <Users size={20} aria-hidden="true" />, label: 'Total Users',     value: num(s.totalUsers),     color: 'var(--admin-brand)', to: '/admin/users' },
    { icon: <Car size={20} aria-hidden="true" />, label: 'Total Cars',      value: num(s.totalCars),      color: 'var(--admin-accent)', to: '/admin/cars' },
    { icon: <Gavel size={20} aria-hidden="true" />, label: 'Active Auctions', value: num(s.activeAuctions), color: 'var(--admin-brand-dark)', to: '/admin/auctions' },
    { icon: <Lock size={20} aria-hidden="true" />, label: 'Open Escrows',    value: num(s.openEscrows ?? s.totalEscrows), color: 'var(--admin-status-danger)', to: '/admin/escrows' },
    { icon: <Tag size={20} aria-hidden="true" />, label: 'Total Bids',      value: num(s.totalBids),      color: 'var(--admin-accent)', to: '/admin/bids' },
    { icon: <Wallet size={20} aria-hidden="true" />, label: 'Total Revenue',   value: num(s.totalRevenue),   color: 'var(--admin-status-success)', to: '/admin/reports', kes: true },
  ];

  const dealers = num(s.totalDealers);
  const sellers = num(s.individualSellers);
  const users = num(s.totalUsers);
  // Real platform composition from the stats payload; "Buyers & Others" is only derivable when all three counts exist.
  const composition = [
    { name: 'Dealers',            count: dealers, color: 'var(--admin-brand)' },
    { name: 'Individual Sellers', count: sellers, color: 'var(--admin-accent)' },
    { name: 'Buyers & Others',    count: users !== null && dealers !== null && sellers !== null ? Math.max(users - (dealers + sellers), 0) : null, color: 'var(--admin-status-success)' },
  ];

  const glance = [
    { label: 'Users',    value: num(s.totalUsers),     color: 'var(--admin-brand)' },
    { label: 'Cars',     value: num(s.totalCars),      color: 'var(--admin-accent)' },
    { label: 'Auctions', value: num(s.activeAuctions), color: 'var(--admin-brand-dark)' },
    { label: 'Bids',     value: num(s.totalBids),      color: 'var(--admin-status-info)' },
    { label: 'Escrows',  value: num(s.totalEscrows),   color: 'var(--admin-status-danger)' },
  ];
  const fmtK = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : `${v}`);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 26 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(23, 107, 135, 0.08)', border: '1px solid rgba(23, 107, 135, 0.15)', borderRadius: 9999, padding: '4px 12px', marginBottom: 10 }}>
            <Crown size={13} style={{ color: 'var(--admin-brand)' }} />
            <span style={{ fontSize: 10, color: 'var(--admin-brand)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Webhoist · Owner</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.5rem,2.6vw,2.2rem)', color: 'var(--admin-ink)', margin: 0 }}>
            System Overview
          </h1>
          <p style={{ color: 'var(--admin-muted-content)', fontSize: 13, marginTop: 4 }}>
            Platform-wide statistics &amp; activity — visible to the platform owner only
          </p>
        </div>
        <button onClick={load} style={{ padding: '8px 16px', borderRadius: 10, background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-ink)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {(statsFailed || logsFailed) && (
        <p role="alert" style={{ margin: '0 0 16px', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--admin-status-warning-border)', background: 'var(--admin-status-warning-bg)', color: 'var(--admin-status-warning)', fontSize: 13 }}>
          {statsFailed && 'Platform statistics could not be loaded, so those figures are shown as Unavailable. '}{logsFailed && 'Admin activity could not be loaded.'}
        </p>
      )}

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 175px), 1fr))', gap: 14, marginBottom: 20 }}>
        {cards.map(c => <StatTile key={c.label} {...c} />)}
      </div>

      {/* Chart + composition */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 16, marginBottom: 20 }} className="overview-row">
        <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius-md)', boxShadow: 'var(--admin-shadow-card)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--admin-divider)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-ink)' }}>Platform at a Glance</div>
            <div style={{ fontSize: 11, color: 'var(--admin-muted-content)', marginTop: 2 }}>Live totals across the marketplace</div>
          </div>
          <div style={{ padding: '24px 22px 18px' }}>
            <MiniBarChart data={glance} height={170} format={fmtK} />
          </div>
        </div>

        <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius-md)', boxShadow: 'var(--admin-shadow-card)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--admin-divider)' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-ink)' }}>User Composition</span>
          </div>
          <div style={{ padding: '20px 22px' }}>
            <BreakdownBars data={composition} total={s.totalUsers} />
          </div>
        </div>
      </div>

      {/* Recent admin activity (real audit log) */}
      <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius-md)', boxShadow: 'var(--admin-shadow-card)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--admin-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--admin-ink)' }}>
            <Activity size={15} style={{ color: 'var(--admin-brand)' }} /> Recent Admin Activity
          </span>
          <Link to="/admin/security-log" style={{ fontSize: 11, color: 'var(--admin-brand)', textDecoration: 'none', fontWeight: 600 }}>Full Log →</Link>
        </div>
        <div>
          {logs.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--admin-muted-content)', fontSize: 13 }}>{logsFailed ? 'Admin activity is unavailable right now. This is not a confirmation that nothing happened.' : 'No recent activity'}</div>
          ) : logs.slice(0, 12).map((e, i) => (
            <div key={e._id || i} style={{ padding: '11px 22px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: i < Math.min(logs.length, 12) - 1 ? '1px solid var(--admin-divider)' : 'none' }}>
              <code style={{ fontSize: 11, color: 'var(--admin-brand)', fontFamily: 'monospace', background: 'rgba(23, 107, 135, 0.08)', padding: '2px 8px', borderRadius: 6 }}>{e.action}</code>
              <span style={{ fontSize: 12, color: 'var(--admin-body)' }}>{e.admin || e.adminId?.name || 'Actor not recorded'}</span>
              <span style={{ fontSize: 10, color: 'var(--admin-muted-content)', marginLeft: 'auto' }}>
                {e.createdAt ? new Date(e.createdAt).toLocaleString('en-KE') : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Access note */}
      <div style={{ padding: '16px 20px', background: 'rgba(23, 107, 135, 0.05)', borderRadius: 12, border: '1px solid rgba(23, 107, 135, 0.15)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--admin-brand)', fontWeight: 600, marginBottom: 8 }}>
          <ShieldCheck size={15} /> Webhoist Access
        </div>
        <p style={{ fontSize: 12, color: 'var(--admin-muted-content)', margin: 0, lineHeight: 1.6 }}>
          You are logged in as the platform owner (<strong>webhoist</strong>). You have full system access: all admin panels,
          all security logs, all user data, and the ability to override any permission check.
        </p>
      </div>
    </div>
  );
}
